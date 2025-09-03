import { loadTerrainAssetImageData, loadTerrainHeightsFromAsset } from '@/features/editor/scene/lib/terrain/HeightmapUtils'
import { onAssetInvalidated } from '../events'

/**
 * Кэши и загрузчики данных heightmap (ImageData и числовое поле высот).
 *
 * Задачи модуля:
 * - хранить кэшированные данные между инстансами сэмплера;
 * - дедуплицировать параллельные загрузки через реестр промисов;
 * - предоставить API для инвалидации (TTL и LRU будут добавлены в фазе 6).
 */

export interface HeightsField {
  heights: Float32Array
  width: number
  height: number
}

/**
 * Внутренняя запись для LRU/TTL кэша.
 * lastAccess хранится в миллисекундах (Date.now()).
 */
interface CacheEntry<T> {
  value: T
  lastAccess: number
}

// Параметры soft‑TTL и ограничений ёмкости.
// Значения подобраны консервативно, чтобы не удерживать слишком много памяти.
const IMAGE_TTL_MS = 5 * 60 * 1000 // 5 минут бездействия
const HEIGHTS_TTL_MS = 10 * 60 * 1000 // 10 минут бездействия (числовое поле полезнее ImageData)
const IMAGE_MAX_ITEMS = 32 // ограничение по числу кэшированных ImageData
const HEIGHTS_MAX_ITEMS = 64 // ограничение по числу кэшированных полей высот

// Хранилища значений и активных загрузок
const IMAGE_CACHE = new Map<string, CacheEntry<ImageData>>()
const IMAGE_LOADS = new Map<string, Promise<ImageData>>()

const HEIGHTS_CACHE = new Map<string, CacheEntry<HeightsField>>()
const HEIGHTS_LOADS = new Map<string, Promise<HeightsField | null>>()

/**
 * Удаляет из кэша записи, просроченные по TTL. Вызывается при каждом get/set.
 * @param map - кэш с метаданными
 * @param ttlMs - время жизни без обращений в миллисекундах
 */
function pruneExpired<T>(map: Map<string, CacheEntry<T>>, ttlMs: number): void {
  const now = Date.now()
  for (const [key, entry] of map) {
    if (now - entry.lastAccess > ttlMs) {
      map.delete(key)
    }
  }
}

/**
 * Если количество записей превышает лимит, выселяет наименее недавно используемые.
 * @param map - кэш с метаданными
 * @param maxItems - мягкое ограничение на количество записей
 */
function evictLRU<T>(map: Map<string, CacheEntry<T>>, maxItems: number): void {
  if (map.size <= maxItems) return
  // Сортируем ключи по возрастанию lastAccess и удаляем «самые старые»
  const items = Array.from(map.entries())
  items.sort((a, b) => a[1].lastAccess - b[1].lastAccess)
  const excess = items.length - maxItems
  for (let i = 0; i < excess; i++) {
    map.delete(items[i][0])
  }
}

/**
 * Получить ImageData из кэша.
 *
 * Поведение:
 * - при каждом обращении обновляется отметка времени lastAccess;
 * - перед выдачей значения выполняется очистка просроченных записей;
 * - возвращает undefined, если запись отсутствует или была удалена по TTL/LRU.
 */
export function getCachedImageData(assetId: string): ImageData | undefined {
  pruneExpired(IMAGE_CACHE, IMAGE_TTL_MS)
  const entry = IMAGE_CACHE.get(assetId)
  if (!entry) return undefined
  entry.lastAccess = Date.now()
  return entry.value
}

/**
 * Положить ImageData в кэш, обновив отметку доступа и соблюдая ограничения LRU/TTL.
 */
export function setCachedImageData(assetId: string, data: ImageData): void {
  pruneExpired(IMAGE_CACHE, IMAGE_TTL_MS)
  IMAGE_CACHE.set(assetId, { value: data, lastAccess: Date.now() })
  evictLRU(IMAGE_CACHE, IMAGE_MAX_ITEMS)
}

/**
 * Получить числовое поле высот из кэша с учётом TTL/LRU.
 */
export function getCachedHeightsField(assetId: string): HeightsField | undefined {
  pruneExpired(HEIGHTS_CACHE, HEIGHTS_TTL_MS)
  const entry = HEIGHTS_CACHE.get(assetId)
  if (!entry) return undefined
  entry.lastAccess = Date.now()
  return entry.value
}

/**
 * Положить числовое поле высот в кэш с обновлением отметки доступа и LRU‑ограничением.
 */
export function setCachedHeightsField(assetId: string, field: HeightsField): void {
  pruneExpired(HEIGHTS_CACHE, HEIGHTS_TTL_MS)
  HEIGHTS_CACHE.set(assetId, { value: field, lastAccess: Date.now() })
  evictLRU(HEIGHTS_CACHE, HEIGHTS_MAX_ITEMS)
}

/**
 * Инвалидация кэшей и активных загрузок для конкретного ассета.
 *
 * Удаляет кэшированное ImageData, числовое поле высот и активные промисы загрузки
 * (если есть), чтобы последующие обращения инициировали новую загрузку.
 */
export function invalidate(assetId: string): void {
  IMAGE_CACHE.delete(assetId)
  HEIGHTS_CACHE.delete(assetId)
  IMAGE_LOADS.delete(assetId)
  HEIGHTS_LOADS.delete(assetId)
}

/**
 * Полная очистка всех кэшей высот/изображений и реестров загрузок.
 *
 * Полезно вызывать при смене сцены или при массовых изменениях ассетов
 * (например, импорт/удаление большого количества карт высот).
 */
export function clear(): void {
  IMAGE_CACHE.clear()
  HEIGHTS_CACHE.clear()
  IMAGE_LOADS.clear()
  HEIGHTS_LOADS.clear()
}

// Подписка на системные события инвалидирования ассетов.
// Это позволяет очищать кэши без обратного импорта из HeightmapUtils
// и избегать динамических импортов одного и того же модуля в разных местах.
onAssetInvalidated((assetId) => invalidate(assetId))

/**
 * Загрузить ImageData для ассета, используя общий реестр промисов.
 */
export function loadImageData(assetId: string): Promise<ImageData> {
  const cached = getCachedImageData(assetId)
  if (cached) return Promise.resolve(cached)
  const ongoing = IMAGE_LOADS.get(assetId)
  if (ongoing) return ongoing
  const p = loadTerrainAssetImageData(assetId)
    .then((img) => {
      setCachedImageData(assetId, img)
      return img
    })
    .finally(() => {
      IMAGE_LOADS.delete(assetId)
    })
  IMAGE_LOADS.set(assetId, p)
  return p
}

/**
 * Загрузить числовое поле высот для ассета (или выполнить «ленивую миграцию»).
 * Если heights отсутствуют — возвращает null (используйте фоллбэк ImageData).
 */
export function loadHeightsField(assetId: string): Promise<HeightsField | null> {
  const cached = getCachedHeightsField(assetId)
  if (cached) return Promise.resolve(cached)
  const ongoing = HEIGHTS_LOADS.get(assetId)
  if (ongoing) return ongoing
  const p = loadTerrainHeightsFromAsset(assetId)
    .then((res) => {
      if (res) {
        const field: HeightsField = { heights: res.heights, width: res.width, height: res.height }
        setCachedHeightsField(assetId, field)
        return field
      }
      return null
    })
    .finally(() => {
      HEIGHTS_LOADS.delete(assetId)
    })
  HEIGHTS_LOADS.set(assetId, p)
  return p
}
