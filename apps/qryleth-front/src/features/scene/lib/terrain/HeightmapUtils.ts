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
  // Валидируем файл
  const validation = await validatePngFile(file)
  if (!validation.isValid) {
    throw new Error(validation.error || 'Неверный файл')
  }

  if (!validation.dimensions) {
    throw new Error('Не удалось определить размеры изображения')
  }

  // Генерируем уникальный ID
  const assetId = uuidv4()
  
  // Создаем blob из файла
  const blob = new Blob([await file.arrayBuffer()], { type: 'image/png' })
  
  // Сохраняем в базу данных
  await db.saveTerrainAsset(
    assetId,
    fileName || file.name,
    blob,
    validation.dimensions.width,
    validation.dimensions.height
  )

  return {
    assetId,
    width: validation.dimensions.width,
    height: validation.dimensions.height,
    fileSize: file.size
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