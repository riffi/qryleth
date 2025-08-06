/**
 * API для взаимодействия AI инструментов с состоянием ObjectEditor
 */

import { useObjectStore } from '@/features/object-editor/model/objectStore'
import type { GfxObject } from '@/entities/object/model/types'
import type { GfxPrimitive } from '@/entities/primitive'
import type { CreateGfxMaterial, GfxMaterial } from '@/entities/material'
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
   * Сравнивает два материала на идентичность содержимого (исключая uuid)
   */
  private static areMaterialsEqual(a: CreateGfxMaterial | GfxMaterial, b: CreateGfxMaterial): boolean {
    // Если первый параметр содержит uuid, исключаем его из сравнения
    const materialA = 'uuid' in a ? { ...a, uuid: undefined } : a
    const cleanA = Object.fromEntries(Object.entries(materialA).filter(([key]) => key !== 'uuid'))
    
    return JSON.stringify(cleanA) === JSON.stringify(b)
  }

  /**
   * Добавляет примитивы в текущий объект с поддержкой различных типов материалов.
   * На вход подаются примитивы с обязательной конфигурацией материала.
   * Поддерживает: глобальные материалы, материалы объекта и создание новых материалов.
   * Предотвращает создание дубликатов материалов при добавлении нескольких примитивов.
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
    
    // Кеш для отслеживания уже созданных материалов в рамках текущего вызова
    const materialCache = new Map<string, string>() // ключ: JSON материала, значение: UUID

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
        const materialKey = JSON.stringify(p.material.createMaterial)
        
        // Проверяем, не создавали ли мы уже такой же материал в этом вызове
        let materialUuid = materialCache.get(materialKey)
        
        if (!materialUuid) {
          // Проверяем, нет ли уже такого материала среди существующих
          const existingMaterial = store.materials.find(mat => 
            this.areMaterialsEqual(mat, p.material.createMaterial)
          )
          
          if (existingMaterial) {
            // Используем существующий материал
            materialUuid = existingMaterial.uuid
          } else {
            // Создаем новый материал
            materialUuid = uuidv4()
            store.addMaterial(p.material.createMaterial, materialUuid)
          }
          
          // Кешируем результат
          materialCache.set(materialKey, materialUuid)
        }
        
        return {
          ...basePrimitive,
          objectMaterialUuid: materialUuid
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

