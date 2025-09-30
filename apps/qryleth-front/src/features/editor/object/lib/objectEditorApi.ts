/**
 * API для взаимодействия AI инструментов с состоянием ObjectEditor
 */

import { useObjectStore } from '@/features/editor/object/model/objectStore'
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
    type: 'localRef'
    localId: string
  }
}

// Интерфейс для материала с локальным ID
interface MaterialWithLocalId extends CreateGfxMaterial {
  localId: string
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
      // Если редактируется дерево/трава — не возвращаем примитивы, а возвращаем конфигурацию генератора
      primitives: (state.objectType === 'tree' || state.objectType === 'grass') ? [] : state.primitives,
      materials: state.materials,
      boundingBox: state.boundingBox ?? (state.primitives.length
        ? calculateObjectBoundingBox({ uuid: '', name: '', primitives: state.primitives })
        : undefined),
      primitiveGroups: state.primitiveGroups,
      primitiveGroupAssignments: state.primitiveGroupAssignments,
      objectType: state.objectType,
      treeData: state.objectType === 'tree' ? state.treeData : undefined,
      grassData: state.objectType === 'grass' ? state.grassData : undefined
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
        // Сначала пытаемся найти материал по UUID
        let materialUuid = p.material.objectMaterialUuid
        
        // Если не найден материал по UUID, пытаемся найти по имени
        const materialByUuid = store.materials.find(mat => mat.uuid === materialUuid)
        if (!materialByUuid) {
          const materialByName = store.materials.find(mat => mat.name === materialUuid)
          if (materialByName) {
            materialUuid = materialByName.uuid
          }
        }
        
        return {
          ...basePrimitive,
          objectMaterialUuid: materialUuid
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

  /**
   * Добавляет примитивы с предварительным созданием материалов по localId.
   * Поддерживает создание материалов в массиве и ссылки на них через localRef.
   *
   * @param primitives список примитивов для добавления
   * @param materials опциональный массив материалов для создания
   * @param groupName опциональное имя группы для создания и привязки примитивов
   * @param parentGroupUuid опциональный UUID родительской группы
   * @returns количество добавленных примитивов, созданных материалов и UUID группы
   */
  static addPrimitivesWithMaterials(
    primitives: PrimitiveWithMaterialConfig[], 
    materials?: MaterialWithLocalId[],
    groupName?: string, 
    parentGroupUuid?: string
  ): { addedCount: number; groupUuid?: string; materialsCreated: number } {
    const store = useObjectStore.getState()
    
    // Создаем материалы из массива materials и собираем мапинг localId -> UUID
    const localIdToUuid = new Map<string, string>()
    let materialsCreated = 0
    
    if (materials) {
      materials.forEach(material => {
        // Проверяем, нет ли уже такого материала среди существующих
        const existingMaterial = store.materials.find(mat => 
          this.areMaterialsEqual(mat, material)
        )
        
        if (existingMaterial) {
          localIdToUuid.set(material.localId, existingMaterial.uuid)
        } else {
          const materialUuid = uuidv4()
          store.addMaterial(material, materialUuid)
          localIdToUuid.set(material.localId, materialUuid)
          materialsCreated++
        }
      })
    }

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
        // Сначала пытаемся найти материал по UUID
        let materialUuid = p.material.objectMaterialUuid
        
        // Если не найден материал по UUID, пытаемся найти по имени
        const materialByUuid = store.materials.find(mat => mat.uuid === materialUuid)
        if (!materialByUuid) {
          const materialByName = store.materials.find(mat => mat.name === materialUuid)
          if (materialByName) {
            materialUuid = materialByName.uuid
          }
        }
        
        return {
          ...basePrimitive,
          objectMaterialUuid: materialUuid
        }
      } else if (p.material.type === 'localRef') {
        // Ссылка на материал из массива materials
        const materialUuid = localIdToUuid.get(p.material.localId)
        if (!materialUuid) {
          throw new Error(`Материал с localId "${p.material.localId}" не найден в массиве materials`)
        }
        
        return {
          ...basePrimitive,
          objectMaterialUuid: materialUuid
        }
      } else {
        // Неизвестный тип материала
        throw new Error(`Неподдерживаемый тип материала: ${(p.material as any).type}`)
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
      groupUuid,
      materialsCreated
    }
  }
}

