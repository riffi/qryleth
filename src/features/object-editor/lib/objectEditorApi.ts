/**
 * API для взаимодействия AI инструментов с состоянием ObjectEditor
 */

import { useObjectStore } from '@/features/object-editor/model/objectStore'
import type { GfxObject } from '@/entities/object/model/types'
import type { GfxPrimitive } from '@/entities/primitive'
import type { CreateGfxMaterial } from '@/entities/material'
import { generatePrimitiveName } from '@/entities/primitive'
import { calculateObjectBoundingBox } from '@/shared/lib/geometry/boundingBoxUtils'
import { v4 as uuidv4 } from 'uuid'

// Интерфейс для примитива с новой схемой назначения материала
interface PrimitiveWithMaterialConfig extends Omit<GfxPrimitive, 'objectMaterialUuid' | 'globalMaterialUuid'> {
  material: {
    type: 'global'
    globalMaterialUuid: string
  } | {
    type: 'object'
    objectMaterialUuid: string
  } | {
    type: 'createNew'
    createMaterial: CreateGfxMaterial
  }
}

export class ObjectEditorApi {
  /**
   * Возвращает полные данные текущего объекта.
   * Включает примитивы, материалы, группы и BoundingBox.
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
        : undefined),
      primitiveGroups: state.primitiveGroups,
      primitiveGroupAssignments: state.primitiveGroupAssignments
    }
  }

  /**
   * Добавляет примитивы в текущий объект с поддержкой различных типов материалов.
   * На вход подаются примитивы с обязательной конфигурацией материала.
   * Поддерживает: глобальные материалы, материалы объекта и создание новых материалов.
   *
   * @param primitives список примитивов для добавления
   * @param groupName опциональное имя группы для создания и привязки примитивов
   * @param parentGroupUuid опциональный UUID родительской группы
   * @returns количество фактически добавленных примитивов и UUID созданной группы (если была создана)
   */
  static addPrimitives(
    primitives: PrimitiveWithMaterialConfig[], 
    groupName?: string, 
    parentGroupUuid?: string
  ): { addedCount: number; groupUuid?: string } {
    const store = useObjectStore.getState()

    const normalized = primitives.map((p, index) => {
      const primUuid = uuidv4()
      const basePrimitive = {
        uuid: primUuid,
        name:
          p.name && p.name.trim() !== ''
            ? p.name
            : generatePrimitiveName(p.type, store.primitives.length + index + 1),
        type: p.type,
        geometry: p.geometry,
        ...(p.transform && { transform: p.transform as {
          position?: [number, number, number]
          rotation?: [number, number, number]
          scale?: [number, number, number]
        } })
      }

      // Обработка материала в зависимости от типа
      if (p.material.type === 'global') {
        return {
          ...basePrimitive,
          globalMaterialUuid: p.material.globalMaterialUuid
        }
      } else if (p.material.type === 'object') {
        return {
          ...basePrimitive,
          objectMaterialUuid: p.material.objectMaterialUuid
        }
      } else { // createNew
        // Генерируем UUID для нового материала заранее
        const newMaterialUuid = uuidv4()
        
        // Создаем новый материал объекта с заданным UUID
        store.addMaterial(p.material.createMaterial, newMaterialUuid)
        
        return {
          ...basePrimitive,
          objectMaterialUuid: newMaterialUuid
        }
      }
    })

    // Добавляем примитивы
    normalized.forEach(prim => store.addPrimitive(prim))

    // Создаем группу, если указано имя
    let groupUuid: string | undefined
    if (groupName && groupName.trim() !== '') {
      groupUuid = store.createGroup(groupName.trim(), parentGroupUuid)
      
      // Привязываем все добавленные примитивы к созданной группе
      normalized.forEach(prim => {
        store.assignPrimitiveToGroup(prim.uuid, groupUuid!)
      })
    }

    return { 
      addedCount: normalized.length,
      groupUuid
    }
  }
}

