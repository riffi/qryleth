import { v4 as uuidv4 } from 'uuid'
import { db } from '@/shared/lib/database'
import type { TerrainAssetRecord } from '@/shared/lib/database'

/**
 * Результат валидации PNG файла для использования в качестве heightmap
 */
export interface PngValidationResult {
  /** Успешность валидации */
  isValid: boolean
  /** Сообщение об ошибке (если есть) */
  error?: string
  /** Размеры изображения */
  dimensions?: {
    width: number
    height: number
  }
}

/**
 * Результат загрузки PNG в качестве terrain asset
 */
export interface TerrainAssetUploadResult {
  /** Уникальный ID созданного asset'а */
  assetId: string
  /** Размеры изображения */
  width: number
  height: number
  /** Размер файла в байтах */
  fileSize: number
}

/**
 * Вычисляет SHA-256 по содержимому ArrayBuffer и возвращает строку в hex-формате
 *
 * Используется для вычисления детерминированного хэша массива высот (Float32Array)
 * с целью дедупликации ассетов: если два PNG после нормализации дают одинаковые
 * высотные данные, их хэш совпадёт, и мы не будем создавать дубликат в Dexie.
 */
async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  // Предпочтительно используем WebCrypto (браузер/Node >=18)
  const subtle: SubtleCrypto | undefined = (globalThis as any)?.crypto?.subtle
  if (subtle && typeof subtle.digest === 'function') {
    const digest = await subtle.digest('SHA-256', buffer)
    const bytes = new Uint8Array(digest)
    let hex = ''
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0')
    return hex
  }

  // Фоллбэк для сред тестирования без WebCrypto: простая FNV-1a 64-bit по байтам.
  // В проде не используется; коллизии маловероятны для наших целей дедупликации.
  const data = new Uint8Array(buffer)
  let h1 = 0xcbf29ce484222325n
  let prime = 0x100000001b3n
  for (let i = 0; i < data.length; i++) {
    h1 ^= BigInt(data[i])
    h1 = (h1 * prime) & 0xffffffffffffffffn
  }
  return h1.toString(16).padStart(16, '0')
}

/**
 * Валидирует PNG файл для использования в качестве heightmap
 */
export async function validatePngFile(file: File): Promise<PngValidationResult> {
  // Проверка типа файла
  if (!file.type.startsWith('image/png')) {
    return {
      isValid: false,
      error: 'Файл должен быть в формате PNG'
    }
  }

  // Проверка размера файла (макс 50MB)
  const maxFileSize = 50 * 1024 * 1024
  if (file.size > maxFileSize) {
    return {
      isValid: false,
      error: 'Файл слишком большой (максимум 50MB)'
    }
  }

  try {
    // Создаем ImageBitmap для получения размеров
    const bitmap = await createImageBitmap(file)
    
    const width = bitmap.width
    const height = bitmap.height
    
    // Закрываем bitmap для освобождения памяти
    bitmap.close()

    // Проверка минимальных размеров
    if (width < 2 || height < 2) {
      return {
        isValid: false,
        error: 'Изображение слишком маленькое (минимум 2x2 пикселя)'
      }
    }

    // Проверка максимальных размеров 
    if (width > 4096 || height > 4096) {
      return {
        isValid: false,
        error: 'Изображение слишком большое (максимум 4096x4096 пикселей)'
      }
    }

    return {
      isValid: true,
      dimensions: { width, height }
    }
  } catch (error) {
    console.error('Ошибка при валидации PNG файла:', error)
    return {
      isValid: false,
      error: 'Не удалось прочитать изображение'
    }
  }
}

/**
 * Загружает PNG файл в базу данных как terrain asset
 */
export async function uploadTerrainAsset(file: File, fileName?: string): Promise<TerrainAssetUploadResult> {
  // Валидируем файл (тип, разумные ограничения размера и габаритов)
  const validation = await validatePngFile(file)
  if (!validation.isValid) {
    throw new Error(validation.error || 'Неверный файл')
  }

  // Грузим исходную картинку и выполняем масштабирование до ≤200px по большей стороне
  const origBitmap = await createImageBitmap(file)
  try {
    const { imageData: scaledImageData, blob: scaledBlob, width, height } = await resizeBitmapToMaxSize(origBitmap, 200)

    // Извлекаем массив высот из масштабированного изображения
    const heights = extractHeightsFromImageData(scaledImageData)

    // Считаем хэш по высотам для дедупликации
    const heightsHash = await sha256Hex(heights.buffer)

    // Проверяем, есть ли уже такой ассет в Dexie (быстрый путь по индексу)
    const existing = await db.findTerrainAssetByHeightsHash(heightsHash)
    if (existing) {
      // Если у существующего отсутствуют сохранённые высоты — допишем их
      if (!existing.heightsBuffer || !existing.heightsWidth || !existing.heightsHeight) {
        await db.updateTerrainAssetHeights(existing.assetId, heights, width, height, heightsHash)
      }
      return {
        assetId: existing.assetId,
        width: existing.width,
        height: existing.height,
        fileSize: existing.fileSize
      }
    }

    // Медленный фоллбэк для старых записей без heightsHash: пробуем найти совпадение по сохранённым высотам
    // После нахождения — запишем heightsHash, чтобы в будущем использовать быстрый индекс.
    const allAssets = await db.getAllTerrainAssets()
    for (const rec of allAssets) {
      if (rec.heightsBuffer && rec.heightsWidth && rec.heightsHeight) {
        const recHash = await sha256Hex(rec.heightsBuffer)
        if (recHash === heightsHash) {
          // Кешируем heightsHash в записи ассета
          await db.updateTerrainAssetHeights(rec.assetId, heights, width, height, heightsHash)
          return {
            assetId: rec.assetId,
            width: rec.width,
            height: rec.height,
            fileSize: rec.fileSize
          }
        }
      }
    }

    // Генерируем уникальный идентификатор для нового ассета
    const assetId = uuidv4()

    // Сохраняем PNG (уже масштабированный) и метаданные
    await db.saveTerrainAsset(
      assetId,
      fileName || file.name,
      scaledBlob,
      width,
      height
    )

    // Сохраняем массив высот, размеры сетки и хэш для будущей дедупликации
    await db.updateTerrainAssetHeights(assetId, heights, width, height, heightsHash)

    return {
      assetId,
      width,
      height,
      fileSize: scaledBlob.size
    }
  } finally {
    // Освобождаем ресурсы
    origBitmap.close()
  }
}

/**
 * Конвертирует PNG blob в ImageData без использования Web Workers
 */
export async function pngBlobToImageData(blob: Blob): Promise<ImageData> {
  try {
    // Создаем ImageBitmap из blob
    const bitmap = await createImageBitmap(blob)
    
    // Создаем временный canvas для извлечения ImageData
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      throw new Error('Не удалось создать 2D контекст canvas')
    }
    
    // Рисуем bitmap на canvas
    ctx.drawImage(bitmap, 0, 0)
    
    // Извлекаем ImageData
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    
    // Освобождаем ресурсы
    bitmap.close()
    
    return imageData
  } catch (error) {
    console.error('Ошибка при конвертации PNG в ImageData:', error)
    throw new Error('Не удалось конвертировать PNG в ImageData')
  }
}

/**
 * Загружает terrain asset из базы данных и конвертирует в ImageData
 */
export async function loadTerrainAssetImageData(assetId: string): Promise<ImageData> {
  // Получаем asset из базы данных
  const asset = await db.getTerrainAsset(assetId)
  if (!asset) {
    throw new Error(`Terrain asset с ID ${assetId} не найден`)
  }

  // Конвертируем blob в ImageData
  return pngBlobToImageData(asset.blob)
}

/**
 * Получает список всех terrain assets с основной информацией
 */
export async function getAllTerrainAssetsSummary(): Promise<Array<{
  assetId: string
  fileName: string
  width: number
  height: number
  fileSize: number
  createdAt: Date
  updatedAt: Date
}>> {
  const assets = await db.getAllTerrainAssets()
  
  return assets.map(asset => ({
    assetId: asset.assetId,
    fileName: asset.fileName,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt
  }))
}

/**
 * Удаляет terrain asset из базы данных
 */
export async function deleteTerrainAsset(assetId: string): Promise<void> {
  await db.deleteTerrainAsset(assetId)
}

/**
 * Переименовывает terrain asset
 */
export async function renameTerrainAsset(assetId: string, newFileName: string): Promise<void> {
  if (!newFileName.trim()) {
    throw new Error('Имя файла не может быть пустым')
  }
  
  await db.updateTerrainAssetName(assetId, newFileName)
}

/**
 * Создает превью URL для terrain asset (для отображения в UI)
 */
export async function createTerrainAssetPreviewUrl(assetId: string): Promise<string> {
  const asset = await db.getTerrainAsset(assetId)
  if (!asset) {
    throw new Error(`Terrain asset с ID ${assetId} не найден`)
  }

  // Создаем объект URL для blob
  return URL.createObjectURL(asset.blob)
}

/**
 * Освобождает превью URL (вызывать после использования)
 */
export function revokeTerrainAssetPreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * Проверяет существование terrain asset
 */
export async function terrainAssetExists(assetId: string): Promise<boolean> {
  const asset = await db.getTerrainAsset(assetId)
  return asset !== undefined
}

/**
 * Получает информацию о terrain asset без загрузки blob данных
 */
export async function getTerrainAssetInfo(assetId: string): Promise<{
  fileName: string
  width: number
  height: number
  fileSize: number
  createdAt: Date
  updatedAt: Date
} | null> {
  const asset = await db.getTerrainAsset(assetId)
  if (!asset) {
    return null
  }

  return {
    fileName: asset.fileName,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt
  }
}

/**
 * Извлекает массив высот из ImageData PNG heightmap
 *
 * Метод интерпретирует яркость пикселей как высоту. Яркость вычисляется по формуле
 * относительной светимости: Y = 0.2126 * R + 0.7152 * G + 0.0722 * B.
 * По умолчанию значения нормализуются в диапазон [0..1]. При указании параметров
 * min/max выполняется линейный ремаппинг в заданный диапазон.
 *
 * Размер результирующего массива равен width*height переданного ImageData (после
 * возможного масштабирования на этапе подготовки канваса).
 *
 * @param imageData - пиксельные данные изображения (RGBA), полученные из canvas
 * @param options - параметры нормализации (опционально)
 * @param options.min - минимальное значение высоты (по умолчанию 0)
 * @param options.max - максимальное значение высоты (по умолчанию 1)
 * @returns Float32Array длиной width*height с высотами в диапазоне [min..max]
 */
export function extractHeightsFromImageData(
  imageData: ImageData,
  options?: { min?: number; max?: number }
): Float32Array {
  const { data, width, height } = imageData
  const result = new Float32Array(width * height)

  const min = options?.min ?? 0
  const max = options?.max ?? 1
  const scale = max - min

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idxRGBA = (y * width + x) * 4
      const r = data[idxRGBA]
      const g = data[idxRGBA + 1]
      const b = data[idxRGBA + 2]
      // Стандартная формула относительной светимости для sRGB
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b // [0..255]
      const normalized01 = luminance / 255 // [0..1]
      result[y * width + x] = min + normalized01 * scale
    }
  }

  return result
}

/**
 * Сохраняет массив высот в IndexedDB (Dexie) для указанного ассета
 *
 * Метод записывает `Float32Array` высот в виде `ArrayBuffer` и размеры сетки высот
 * в запись `terrainAssets`. В случае отсутствия записи метод завершится ошибкой —
 * предварительно необходимо создать ассет через `uploadTerrainAsset`.
 *
 * @param assetId - идентификатор ассета в Dexie
 * @param heights - массив высот (Float32Array)
 * @param width - ширина сетки высот (количество столбцов)
 * @param height - высота сетки высот (количество строк)
 */
export async function saveTerrainHeightsToAsset(
  assetId: string,
  heights: Float32Array,
  width: number,
  height: number
): Promise<void> {
  // Для согласованности сохраняем и хэш высот (чтобы ассет можно было найти по нему)
  const heightsHash = await sha256Hex(heights.buffer)
  await db.updateTerrainAssetHeights(assetId, heights, width, height, heightsHash)
}

/**
 * Загружает сохранённый массив высот из Dexie для указанного ассета
 *
 * Возвращает объект с `Float32Array` высот и размерами сетки. Если высоты ещё
 * не были сохранены для данного ассета (например, старые записи), метод вернёт `null`.
 * В таком случае рекомендуется инициировать построение высот из PNG (см. последующие фазы).
 *
 * @param assetId - идентификатор ассета в Dexie
 * @returns объект с полями `heights`, `width`, `height` или `null`
 */
export async function loadTerrainHeightsFromAsset(assetId: string): Promise<{
  heights: Float32Array
  width: number
  height: number
} | null> {
  // Сначала пробуем прочитать уже сохранённые высоты
  const existing = await db.getTerrainAssetHeights(assetId)
  if (existing) return existing

  // Высоты отсутствуют — выполним ленивую миграцию из PNG c обязательным ресайзом ≤200
  return performLazyHeightsMigration(assetId)
}

/**
 * Масштабирует ImageBitmap до максимального размера по большей стороне и
 * возвращает как пиксельные данные (ImageData), так и PNG blob канваса.
 *
 * Внутри создаётся временный canvas, включается билинейная фильтрация через
 * imageSmoothingEnabled/Quality, после чего производится отрисовка bitmap → canvas.
 *
 * Размеры результата сохраняют пропорции исходного изображения и не превышают
 * maxSize (в пикселях) по большей стороне.
 *
 * @param bitmap - исходный ImageBitmap
 * @param maxSize - предел по большей стороне (по умолчанию 200)
 */
export async function resizeBitmapToMaxSize(
  bitmap: ImageBitmap,
  maxSize: number = 200
): Promise<{ imageData: ImageData; blob: Blob; width: number; height: number }> {
  const srcW = bitmap.width
  const srcH = bitmap.height
  const scale = Math.min(1, maxSize / Math.max(srcW, srcH))
  const dstW = Math.max(1, Math.round(srcW * scale))
  const dstH = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = dstW
  canvas.height = dstH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не удалось создать 2D контекст canvas для ресайза')
  ctx.imageSmoothingEnabled = true
  // @ts-expect-error: свойство поддерживается большинством браузеров
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, dstW, dstH)
  ctx.drawImage(bitmap, 0, 0, dstW, dstH)

  const imageData = ctx.getImageData(0, 0, dstW, dstH)

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) return reject(new Error('Не удалось преобразовать canvas в PNG blob'))
      resolve(b)
    }, 'image/png')
  })

  return { imageData, blob, width: dstW, height: dstH }
}

/**
 * «Ленивая миграция» ассета: если у записи отсутствуют сохранённые высоты,
 * они строятся из текущего PNG blob с масштабированием ≤200, после чего запись
 * обновляется (blob+габариты при необходимости; высоты всегда записываются).
 *
 * Возвращает рассчитанные высоты и их размеры или null, если ассет не найден.
 */
export async function performLazyHeightsMigration(assetId: string): Promise<{
  heights: Float32Array
  width: number
  height: number
} | null> {
  const asset = await db.getTerrainAsset(assetId)
  if (!asset) return null

  const bitmap = await createImageBitmap(asset.blob)
  try {
    const { imageData, blob: scaledBlob, width, height } = await resizeBitmapToMaxSize(bitmap, 200)
    const heights = extractHeightsFromImageData(imageData)
    const heightsHash = await sha256Hex(heights.buffer)

    // Если фактические размеры/вес отличаются от сохранённых — обновляем blob и метаданные
    if (asset.width !== width || asset.height !== height || asset.fileSize !== scaledBlob.size) {
      await db.updateTerrainAssetImage(assetId, scaledBlob, width, height)
    }

    // Записываем высоты и соответствующий хэш
    await db.updateTerrainAssetHeights(assetId, heights, width, height, heightsHash)

    return { heights, width, height }
  } finally {
    bitmap.close()
  }
}
