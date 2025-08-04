/**
 * API для взаимодействия AI инструментов с состоянием ObjectEditor
 */

import { useObjectStore } from '@/features/object-editor/model/objectStore'
import type { GfxObject } from '@/entities/object/model/types'
import type { GfxPrimitive } from '@/entities/primitive'
import { calculateObjectBoundingBox } from '@/shared/lib/geometry/boundingBoxUtils'

export class ObjectEditorApi {
  /**
   * Возвращает полные данные текущего объекта.
   * Включает примитивы, материалы и BoundingBox.
   */
  static getObjectData(): GfxObject {
    const state = useObjectStore.getState()
    return {
      uuid: '',
      name: 'object-editor-object',
      primitives: state.primitives,
      materials: state.materials,
      boundingBox: state.boundingBox ?? (state.primitives.length
        ? calculateObjectBoundingBox({ uuid: '', name: '', primitives: state.primitives })
        : undefined)
    }
  }

  /**
   * Добавляет примитивы в текущий объект.
   * @param primitives список примитивов для добавления
   * @returns количество добавленных примитивов
   */
  static addPrimitives(primitives: GfxPrimitive[]): number {
    const store = useObjectStore.getState()
    primitives.forEach(p => store.addPrimitive(p))
    return primitives.length
  }
}

