import { useObjectStore } from '../model/objectStore'
import type { GfxObject } from '@/entities/object'
import { OffscreenObjectRenderer } from './offscreen-renderer'

/**
 * Формирует итоговый объект на основе текущего состояния редактора.
 * @param baseObject исходные данные редактируемого объекта
 * @returns объект с применёнными изменениями
 */
export const buildUpdatedObject = (baseObject: GfxObject): GfxObject => {
  const state = useObjectStore.getState()
  
  const updatedObject = {
    ...baseObject,
    primitives: state.primitives.map(p => ({ ...p })),
    boundingBox: state.boundingBox,
    materials: state.materials,
    primitiveGroups: state.primitiveGroups,
    primitiveGroupAssignments: state.primitiveGroupAssignments,
  }
  
  return updatedObject
}

// Кеш для сгенерированных превью объектов
const previewCache = new Map<string, string>()

/**
 * Генерирует превью для объекта с возможностью кеширования.
 * @param gfxObject объект для генерации превью
 * @param useCache использовать ли кеширование (по умолчанию true)
 * @returns Promise с base64 строкой превью или null в случае ошибки
 */
export const generateObjectPreview = async (
  gfxObject: GfxObject, 
  useCache: boolean = true
): Promise<string | null> => {
  // Создаем ключ кеша на основе содержимого объекта
  const cacheKey = generateCacheKey(gfxObject)
  
  // Проверяем кеш
  if (useCache && previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey)!
  }

  let renderer: OffscreenObjectRenderer | null = null
  
  try {
    // Создаем рендерер с оптимальными настройками для превью
    renderer = new OffscreenObjectRenderer({
      width: 256,
      height: 256,
      transparent: true,
      antialias: true,
      pixelRatio: 1
    })
    
    // Генерируем превью
    const result = await renderer.renderPreview(gfxObject)
    const previewDataUrl = result.dataUrl
    
    // Кешируем результат
    if (useCache) {
      previewCache.set(cacheKey, previewDataUrl)
    }
    
    return previewDataUrl
    
  } catch (error) {
    console.error('Ошибка генерации превью объекта:', error)
    return null
  } finally {
    // Освобождаем ресурсы рендерера
    if (renderer) {
      renderer.dispose()
    }
  }
}

/**
 * Очищает кеш превью объектов.
 */
export const clearPreviewCache = (): void => {
  previewCache.clear()
}

/**
 * Генерирует ключ кеша на основе содержимого объекта.
 * Учитывает примитивы, материалы и группы для определения уникальности.
 * @param gfxObject объект для генерации ключа
 * @returns строковый ключ кеша
 */
function generateCacheKey(gfxObject: GfxObject): string {
  // Создаем хеш на основе критических свойств объекта
  const keyData = {
    primitives: gfxObject.primitives.map(p => ({
      type: p.type,
      params: p.params,
      materialId: p.materialId,
      groupId: p.groupId
    })),
    materials: gfxObject.materials,
    primitiveGroups: gfxObject.primitiveGroups,
    primitiveGroupAssignments: gfxObject.primitiveGroupAssignments
  }
  
  // Простой способ создания хеша из объекта
  return btoa(JSON.stringify(keyData)).slice(0, 32)
}
