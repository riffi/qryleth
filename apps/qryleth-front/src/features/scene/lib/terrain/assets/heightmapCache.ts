import { loadTerrainAssetImageData, loadTerrainHeightsFromAsset } from '@/features/scene/lib/terrain/HeightmapUtils'

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

const IMAGE_CACHE = new Map<string, ImageData>()
const IMAGE_LOADS = new Map<string, Promise<ImageData>>()

const HEIGHTS_CACHE = new Map<string, HeightsField>()
const HEIGHTS_LOADS = new Map<string, Promise<HeightsField | null>>()

/** Получить ImageData из кэша */
export function getCachedImageData(assetId: string): ImageData | undefined {
  return IMAGE_CACHE.get(assetId)
}

/** Положить ImageData в кэш */
export function setCachedImageData(assetId: string, data: ImageData): void {
  IMAGE_CACHE.set(assetId, data)
}

/** Получить числовое поле высот из кэша */
export function getCachedHeightsField(assetId: string): HeightsField | undefined {
  return HEIGHTS_CACHE.get(assetId)
}

/** Положить числовое поле высот в кэш */
export function setCachedHeightsField(assetId: string, field: HeightsField): void {
  HEIGHTS_CACHE.set(assetId, field)
}

/** Инвалидация кэшей и активных загрузок для ассета */
export function invalidate(assetId: string): void {
  IMAGE_CACHE.delete(assetId)
  HEIGHTS_CACHE.delete(assetId)
  IMAGE_LOADS.delete(assetId)
  HEIGHTS_LOADS.delete(assetId)
}

/**
 * Загрузить ImageData для ассета, используя общий реестр промисов.
 */
export function loadImageData(assetId: string): Promise<ImageData> {
  const cached = IMAGE_CACHE.get(assetId)
  if (cached) return Promise.resolve(cached)
  const ongoing = IMAGE_LOADS.get(assetId)
  if (ongoing) return ongoing
  const p = loadTerrainAssetImageData(assetId)
    .then((img) => {
      IMAGE_CACHE.set(assetId, img)
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
  const cached = HEIGHTS_CACHE.get(assetId)
  if (cached) return Promise.resolve(cached)
  const ongoing = HEIGHTS_LOADS.get(assetId)
  if (ongoing) return ongoing
  const p = loadTerrainHeightsFromAsset(assetId)
    .then((res) => {
      if (res) {
        const field: HeightsField = { heights: res.heights, width: res.width, height: res.height }
        HEIGHTS_CACHE.set(assetId, field)
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

