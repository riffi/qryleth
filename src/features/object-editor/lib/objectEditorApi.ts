/**
 * API для взаимодействия AI инструментов с состоянием ObjectEditor
 */

import { useObjectStore } from '@/features/object-editor/model/objectStore'
import type { GfxObject } from '@/entities/object/model/types'
import type { GfxPrimitive } from '@/entities/primitive'
import { generatePrimitiveName } from '@/entities/primitive'
import { calculateObjectBoundingBox } from '@/shared/lib/geometry/boundingBoxUtils'
import { v4 as uuidv4 } from 'uuid'

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
   * Добавляет примитивы в текущий объект, нормализуя их структуру.
   * На вход подаются примитивы с массивами для позиционирования,
   * поворота и масштаба, после чего каждому примитиву назначается UUID
   * и при необходимости генерируется имя.
   *
   * @param primitives список примитивов для добавления
   * @returns количество фактически добавленных примитивов
   */
  static addPrimitives(primitives: GfxPrimitive[]): number {
    const store = useObjectStore.getState()

    const normalized = primitives.map((p, index) => ({
      uuid: uuidv4(),
      name:
        p.name && p.name.trim() !== ''
          ? p.name
          : generatePrimitiveName(p.type, store.primitives.length + index + 1),
      type: p.type,
      geometry: p.geometry,
      ...(p.objectMaterialUuid && { objectMaterialUuid: p.objectMaterialUuid }),
      ...(p.globalMaterialUuid && { globalMaterialUuid: p.globalMaterialUuid }),
      ...(p.transform && { transform: p.transform as {
        position?: [number, number, number]
        rotation?: [number, number, number]
        scale?: [number, number, number]
      } })
    }))

    normalized.forEach(prim => store.addPrimitive(prim))
    return normalized.length
  }
}

