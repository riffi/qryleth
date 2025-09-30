import { useObjectStore } from '../model/objectStore'
import { useObjectMetaStore } from '../model/objectMetaStore'
import type { GfxObject } from '@/entities/object'
import { OffscreenObjectRenderer } from './offscreen-renderer'

/**
 * Формирует итоговый объект на основе текущего состояния редактора.
 * @param baseObject исходные данные редактируемого объекта
 * @returns объект с применёнными изменениями
 */
export const buildUpdatedObject = (baseObject: GfxObject): GfxObject => {
  const state = useObjectStore.getState()
  // Метаданные объекта (например, теги) берём из отдельного стора метаданных
  // чтобы редактирование тегов не смешивалось с примитивами/материалами.
  const metaState = useObjectMetaStore.getState()
  const metaTags = (metaState.tags || []).map((t: string) => t.trim()).filter(Boolean)
  
  const updatedObject: GfxObject = {
    ...baseObject,
    // Если объект является процедурным деревом/травой — не сохраняем примитивы, а сохраняем параметры генерации
    primitives: (state.objectType === 'tree' || state.objectType === 'grass') ? [] : state.primitives.map(p => ({ ...p })),
    boundingBox: state.boundingBox,
    materials: state.materials,
    primitiveGroups: state.primitiveGroups,
    primitiveGroupAssignments: state.primitiveGroupAssignments,
    objectType: state.objectType ?? baseObject.objectType,
    treeData: state.objectType === 'tree' ? (state.treeData ?? baseObject.treeData) : undefined,
    grassData: state.objectType === 'grass' ? (state.grassData ?? (baseObject as any).grassData) : undefined,
    // Дублируем теги в objectData для согласованности с библиотекой
    ...(metaTags ? { tags: metaTags } : {}),
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
    // Создаем рендерер с высоким разрешением для качественного превью
    renderer = new OffscreenObjectRenderer({
      width: 512,
      height: 512,
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
  /**
   * Формируем детерминированные данные для ключа кеша на основе важных полей объекта.
   * Включаем типы и параметры примитивов, id материалов/групп и сами коллекции материалов/групп.
   */
  const keyData = (gfxObject.objectType === 'tree' && gfxObject.treeData)
    ? {
        objectType: 'tree',
        tree: {
          params: gfxObject.treeData.params,
          bark: gfxObject.treeData.barkMaterialUuid,
          leaf: gfxObject.treeData.leafMaterialUuid
        },
        materials: gfxObject.materials
      }
    : (gfxObject.objectType === 'grass' && (gfxObject as any).grassData)
    ? {
        objectType: 'grass',
        grass: {
          params: (gfxObject as any).grassData.params,
          mat: (gfxObject as any).grassData.grassMaterialUuid,
        },
        materials: gfxObject.materials
      }
    : {
        objectType: 'regular',
        primitives: gfxObject.primitives.map(p => ({
          type: p.type,
          params: p.params,
          materialId: (p as any).materialId,
          groupId: (p as any).groupId
        })),
        materials: gfxObject.materials,
        primitiveGroups: gfxObject.primitiveGroups,
        primitiveGroupAssignments: gfxObject.primitiveGroupAssignments
      }

  /**
   * Кодирует строку в base64 без ограничений Latin1, используя UTF-8 кодировку.
   *
   * Стандартные window.btoa/atob ожидают строки в Latin1 и бросают InvalidCharacterError
   * при наличии кириллицы/эмодзи и т.п. Здесь используем TextEncoder для получения байтов
   * UTF-8 и затем конвертируем их в base64 совместимым способом.
   */
  const toBase64Utf8 = (str: string): string => {
    const bytes = new TextEncoder().encode(str)
    // Конвертация Uint8Array -> бинарная строка порционно, чтобы избежать переполнения стека
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return btoa(binary)
  }

  const json = JSON.stringify(keyData)
  return toBase64Utf8(json).slice(0, 32)
}
