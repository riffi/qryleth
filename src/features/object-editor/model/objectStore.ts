import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxMaterial, CreateGfxMaterial } from '@/entities/material'
import type { GfxObject } from '@/entities/object'
import type { GfxPrimitiveGroup, GroupTreeNode } from '@/entities/primitiveGroup'
import { buildGroupTree, findGroupChildren, getGroupPath, isGroupDescendant } from '@/entities/primitiveGroup/model/utils'
import { resolveImportConflicts, applyImportResolution, ensureValidUuids } from '@/entities/primitiveGroup/model/importUtils'
import { normalizePrimitive, ensurePrimitiveNames } from '@/entities/primitive'
import type { RenderMode, TransformMode, ViewMode } from '@/shared/types/ui'
import type { LightingSettings } from '@/entities/lighting/model/types.ts'
import type { BoundingBox } from '@/shared/types'
import { calculateObjectBoundingBox } from '@/shared/lib/geometry/boundingBoxUtils'
import { generateUUID } from '@/shared/lib/uuid'

interface ObjectStoreState {
  primitives: GfxPrimitive[]
  /** Материалы объекта */
  materials: GfxMaterial[]
  /** UUID выбранного материала */
  selectedMaterialUuid: string | null
  /** Группы примитивов */
  primitiveGroups: Record<string, GfxPrimitiveGroup>
  /** Привязка примитивов к группам по UUID */
  primitiveGroupAssignments: Record<string, string>
  /** UUID выбранных групп */
  selectedGroupUuids: string[]
  lighting: LightingSettings
  /** Текущий BoundingBox объекта */
  boundingBox?: BoundingBox
  viewMode: ViewMode
  renderMode: RenderMode
  transformMode: TransformMode
  /** Показана ли сетка в редакторе */
  gridVisible: boolean
  selectedPrimitiveIds: number[]
  hoveredPrimitiveId: number | null
}

interface ObjectStoreActions {
  setPrimitives: (primitives: GfxPrimitive[]) => void
  addPrimitive: (primitive: GfxPrimitive) => void
  updatePrimitive: (index: number, updates: Partial<GfxPrimitive>) => void
  /** Удаляет примитив по индексу */
  removePrimitive: (index: number) => void
  setLighting: (lighting: LightingSettings) => void
  setRenderMode: (mode: RenderMode) => void
  setTransformMode: (mode: TransformMode) => void
  /** Переключает видимость сетки */
  toggleGridVisibility: () => void
  selectPrimitive: (index: number) => void
  togglePrimitiveSelection: (index: number) => void
  /** Переключает видимость примитива */
  togglePrimitiveVisibility: (index: number) => void
  setSelectedPrimitives: (indices: number[]) => void
  setHoveredPrimitive: (index: number | null) => void
  clearSelection: () => void
  clearScene: () => void

  // Material management actions
  /** Устанавливает список материалов объекта */
  setMaterials: (materials: GfxMaterial[]) => void
  /** Добавляет новый материал в объект */
  addMaterial: (material: CreateGfxMaterial) => void
  /** Обновляет материал по UUID */
  updateMaterial: (materialUuid: string, updates: Partial<GfxMaterial>) => void
  /** Удаляет материал по UUID */
  removeMaterial: (materialUuid: string) => void
  /** Выбирает материал для редактирования */
  selectMaterial: (materialUuid: string | null) => void
  /** Проверяет уникальность имени материала в рамках объекта */
  isMaterialNameUnique: (name: string, excludeUuid?: string) => boolean

  // Group management actions
  /** Создает новую группу */
  createGroup: (name: string, parentGroupUuid?: string) => string
  /** Удаляет группу по UUID */
  deleteGroup: (groupUuid: string) => void
  /** Переименовывает группу */
  renameGroup: (groupUuid: string, newName: string) => void
  /** Создает подгруппу */
  createSubGroup: (name: string, parentGroupUuid: string) => string
  /** Привязывает примитив к группе по UUID */
  assignPrimitiveToGroup: (primitiveUuid: string, groupUuid: string) => void
  /** Удаляет примитив из группы */
  removePrimitiveFromGroup: (primitiveUuid: string) => void
  /** Перемещает группу в другую группу */
  moveGroup: (groupUuid: string, newParentUuid?: string) => void
  /** Импортирует объект как группу */
  importObjectAsGroup: (object: GfxObject, groupName: string) => void
  /** Выбирает группу */
  selectGroup: (groupUuid: string) => void
  /** Переключает выделение группы */
  toggleGroupSelection: (groupUuid: string) => void
  /** Устанавливает выбранные группы */
  setSelectedGroups: (groupUuids: string[]) => void
  /** Очищает выделение групп */
  clearGroupSelection: () => void
  /** Переключает видимость группы */
  toggleGroupVisibility: (groupUuid: string) => void
}

export type ObjectStore = ObjectStoreState & ObjectStoreActions

const initialLighting: LightingSettings = {
  ambientColor: '#404040',
  ambientIntensity: 0.6,
  directionalColor: '#ffffff',
  directionalIntensity: 1,
  backgroundColor: '#222222'
}

export const useObjectStore = create<ObjectStore>()(
  subscribeWithSelector((set, get) => ({
    primitives: [],
    materials: [],
    selectedMaterialUuid: null,
    primitiveGroups: {},
    primitiveGroupAssignments: {},
    selectedGroupUuids: [],
    lighting: initialLighting,
    boundingBox: undefined,
    viewMode: 'orbit',
    renderMode: 'solid',
    transformMode: 'translate',
    gridVisible: true,
    selectedPrimitiveIds: [],
    hoveredPrimitiveId: null,

    // Устанавливает список примитивов, нормализуя их
    // и заполняя отсутствующие имена
    setPrimitives: (primitives: GfxPrimitive[]) =>
      set((state) => {
        // Обеспечиваем UUID для всех примитивов
        const primitivesWithUuid = primitives.map(primitive => ({
          ...primitive,
          uuid: primitive.uuid || generateUUID()
        }))
        const list = ensurePrimitiveNames(primitivesWithUuid.map(normalizePrimitive))
        
        // Очищаем привязки для примитивов, которых больше нет
        const currentUuids = new Set(list.map(p => p.uuid))
        const newAssignments: Record<string, string> = {}
        Object.entries(state.primitiveGroupAssignments).forEach(([primitiveUuid, groupUuid]) => {
          if (currentUuids.has(primitiveUuid)) {
            newAssignments[primitiveUuid] = groupUuid
          }
        })
        
        return {
          primitives: list,
          primitiveGroupAssignments: newAssignments,
          boundingBox: list.length
            ? calculateObjectBoundingBox({ uuid: '', name: '', primitives: list })
            : undefined
        }
      }),
    // Добавляет новый примитив в хранилище
    addPrimitive: (primitive: GfxPrimitive) =>
      set(state => {
        // Обеспечиваем наличие UUID у примитива
        const primitiveWithUuid = {
          ...primitive,
          uuid: primitive.uuid || generateUUID()
        }
        const list = [...state.primitives, normalizePrimitive(primitiveWithUuid)]
        const normalized = ensurePrimitiveNames(list)
        return {
          primitives: normalized,
          boundingBox: calculateObjectBoundingBox({
            uuid: '',
            name: '',
            primitives: normalized
          })
        }
      }),
    // Обновляет примитив по индексу
    updatePrimitive: (index: number, updates: Partial<GfxPrimitive>) =>
      set(state => {
        const list = state.primitives.map((p, i) =>
          i === index ? { ...p, ...updates } : p
        )
        const normalized = ensurePrimitiveNames(list)
        return {
          primitives: normalized,
          boundingBox: calculateObjectBoundingBox({
            uuid: '',
            name: '',
            primitives: normalized
          })
        }
      }),
    // Удаляет примитив по индексу и корректирует выделение
    removePrimitive: (index: number) =>
      set(state => {
        if (index < 0 || index >= state.primitives.length) return state
        
        const removedPrimitive = state.primitives[index]
        const list = state.primitives.filter((_, i) => i !== index)
        const normalized = ensurePrimitiveNames(list)
        
        // Удаляем привязку к группе для удаленного примитива
        const newAssignments = { ...state.primitiveGroupAssignments }
        if (removedPrimitive.uuid && newAssignments[removedPrimitive.uuid]) {
          delete newAssignments[removedPrimitive.uuid]
        }
        
        const selected = state.selectedPrimitiveIds
          .filter(id => id !== index)
          .map(id => (id > index ? id - 1 : id))
        const hovered =
          state.hoveredPrimitiveId === null
            ? null
            : state.hoveredPrimitiveId > index
              ? state.hoveredPrimitiveId - 1
              : state.hoveredPrimitiveId === index
                ? null
                : state.hoveredPrimitiveId
        return {
          primitives: normalized,
          primitiveGroupAssignments: newAssignments,
          selectedPrimitiveIds: selected,
          hoveredPrimitiveId: hovered,
          boundingBox: normalized.length
            ? calculateObjectBoundingBox({ uuid: '', name: '', primitives: normalized })
            : undefined
        }
      }),
    // Заменяет настройки освещения
    setLighting: (lighting: LightingSettings) => set({ lighting }),
    // Меняет режим отображения
    setRenderMode: (mode: RenderMode) => set({ renderMode: mode }),
    // Устанавливает активный режим трансформации
    setTransformMode: (mode: TransformMode) => set({ transformMode: mode }),
    // Инвертирует состояние видимости сетки
    toggleGridVisibility: () => set(state => ({ gridVisible: !state.gridVisible })),
    // Выбирает примитив по индексу
    selectPrimitive: (index: number) => set({ selectedPrimitiveIds: [index] }),
    togglePrimitiveSelection: (index: number) =>
      set(state => {
        const ids = state.selectedPrimitiveIds.includes(index)
          ? state.selectedPrimitiveIds.filter(id => id !== index)
          : [...state.selectedPrimitiveIds, index]
        return { selectedPrimitiveIds: ids }
      }),
    // Инвертирует видимость примитива по индексу
    // Если примитив скрыт, он станет видимым и наоборот
    togglePrimitiveVisibility: (index: number) =>
      set(state => ({
        primitives: state.primitives.map((p, i) =>
          i === index ? { ...p, visible: p.visible === false ? true : !p.visible } : p
        )
      })),
    setSelectedPrimitives: (indices: number[]) => set({ selectedPrimitiveIds: indices }),
    // Записывает ID наведённого примитива
    setHoveredPrimitive: (index: number | null) => set({ hoveredPrimitiveId: index }),
    // Снимает выделение
    clearSelection: () => set({ selectedPrimitiveIds: [] }),
    // Очищает сцену и сбрасывает освещение
    clearScene: () =>
      set({
        primitives: [],
        materials: [],
        selectedMaterialUuid: null,
        primitiveGroups: {},
        primitiveGroupAssignments: {},
        selectedGroupUuids: [],
        lighting: initialLighting,
        selectedPrimitiveIds: [],
        hoveredPrimitiveId: null,
        boundingBox: undefined
      }),

    // Material management actions
    setMaterials: (materials: GfxMaterial[]) =>
      set({ materials }),

    addMaterial: (material: CreateGfxMaterial) =>
      set(state => {
        const newMaterial: GfxMaterial = {
          ...material,
          uuid: generateUUID()
        }
        return {
          materials: [...state.materials, newMaterial]
        }
      }),

    updateMaterial: (materialUuid: string, updates: Partial<GfxMaterial>) =>
      set(state => ({
        materials: state.materials.map(material =>
          material.uuid === materialUuid
            ? { ...material, ...updates }
            : material
        )
      })),

    removeMaterial: (materialUuid: string) =>
      set(state => {
        const newMaterials = state.materials.filter(m => m.uuid !== materialUuid)
        const newSelectedMaterialUuid = state.selectedMaterialUuid === materialUuid
          ? null
          : state.selectedMaterialUuid
        
        return {
          materials: newMaterials,
          selectedMaterialUuid: newSelectedMaterialUuid
        }
      }),

    selectMaterial: (materialUuid: string | null) =>
      set({ selectedMaterialUuid: materialUuid }),

    isMaterialNameUnique: (name: string, excludeUuid?: string) => {
      const state = get()
      return !state.materials.some(material =>
        material.name === name && material.uuid !== excludeUuid
      )
    },

    // Group management actions
    createGroup: (name: string, parentGroupUuid?: string) => {
      const groupUuid = generateUUID()
      const newGroup: GfxPrimitiveGroup = {
        uuid: groupUuid,
        name,
        visible: true,
        parentGroupUuid
      }
      
      set(state => ({
        primitiveGroups: {
          ...state.primitiveGroups,
          [groupUuid]: newGroup
        }
      }))
      
      return groupUuid
    },

    deleteGroup: (groupUuid: string) =>
      set(state => {
        // Удаляем дочерние группы рекурсивно
        const childrenUuids = findGroupChildren(groupUuid, state.primitiveGroups)
        const allToRemove = [groupUuid, ...childrenUuids]
        
        // Удаляем группы
        const newGroups = { ...state.primitiveGroups }
        allToRemove.forEach(uuid => {
          delete newGroups[uuid]
        })
        
        // Удаляем привязки примитивов к удаленным группам
        const newAssignments = { ...state.primitiveGroupAssignments }
        Object.keys(newAssignments).forEach(primitiveUuid => {
          if (allToRemove.includes(newAssignments[primitiveUuid])) {
            delete newAssignments[primitiveUuid]
          }
        })
        
        // Удаляем из выделения
        const newSelectedGroups = state.selectedGroupUuids.filter(
          uuid => !allToRemove.includes(uuid)
        )
        
        return {
          primitiveGroups: newGroups,
          primitiveGroupAssignments: newAssignments,
          selectedGroupUuids: newSelectedGroups
        }
      }),

    renameGroup: (groupUuid: string, newName: string) =>
      set(state => ({
        primitiveGroups: {
          ...state.primitiveGroups,
          [groupUuid]: {
            ...state.primitiveGroups[groupUuid],
            name: newName
          }
        }
      })),

    createSubGroup: (name: string, parentGroupUuid: string) => {
      const groupUuid = generateUUID()
      const newGroup: GfxPrimitiveGroup = {
        uuid: groupUuid,
        name,
        visible: true,
        parentGroupUuid
      }
      
      set(state => ({
        primitiveGroups: {
          ...state.primitiveGroups,
          [groupUuid]: newGroup
        }
      }))
      
      return groupUuid
    },

    assignPrimitiveToGroup: (primitiveUuid: string, groupUuid: string) =>
      set(state => ({
        primitiveGroupAssignments: {
          ...state.primitiveGroupAssignments,
          [primitiveUuid]: groupUuid
        }
      })),

    removePrimitiveFromGroup: (primitiveUuid: string) =>
      set(state => {
        const newAssignments = { ...state.primitiveGroupAssignments }
        delete newAssignments[primitiveUuid]
        return { primitiveGroupAssignments: newAssignments }
      }),

    moveGroup: (groupUuid: string, newParentUuid?: string) =>
      set(state => {
        // Проверяем, что новый родитель не является потомком перемещаемой группы
        if (newParentUuid && isGroupDescendant(newParentUuid, groupUuid, state.primitiveGroups)) {
          console.warn('Cannot move group to its descendant')
          return state
        }
        
        return {
          primitiveGroups: {
            ...state.primitiveGroups,
            [groupUuid]: {
              ...state.primitiveGroups[groupUuid],
              parentGroupUuid: newParentUuid
            }
          }
        }
      }),

    importObjectAsGroup: (object: GfxObject, groupName: string) =>
      set(state => {
        // Обеспечиваем валидность UUID в импортируемом объекте
        const validatedObject = ensureValidUuids(object)
        
        // Разрешаем конфликты
        const currentObject: GfxObject = {
          uuid: generateUUID(),
          name: 'current',
          primitives: state.primitives,
          primitiveGroups: state.primitiveGroups,
          primitiveGroupAssignments: state.primitiveGroupAssignments,
          materials: state.materials
        }
        
        const resolution = resolveImportConflicts(validatedObject, currentObject)
        const importResult = applyImportResolution(validatedObject, resolution, groupName)
        
        // Обновляем состояние
        const newPrimitives = [...state.primitives, ...importResult.importedPrimitives]
        const normalized = ensurePrimitiveNames(newPrimitives)
        
        return {
          primitives: normalized,
          primitiveGroups: {
            ...state.primitiveGroups,
            ...importResult.allGroups
          },
          primitiveGroupAssignments: {
            ...state.primitiveGroupAssignments,
            ...importResult.allAssignments
          },
          boundingBox: calculateObjectBoundingBox({
            uuid: '',
            name: '',
            primitives: normalized
          })
        }
      }),

    selectGroup: (groupUuid: string) =>
      set({ selectedGroupUuids: [groupUuid] }),

    toggleGroupSelection: (groupUuid: string) =>
      set(state => {
        const isSelected = state.selectedGroupUuids.includes(groupUuid)
        const newSelection = isSelected
          ? state.selectedGroupUuids.filter(uuid => uuid !== groupUuid)
          : [...state.selectedGroupUuids, groupUuid]
        
        return { selectedGroupUuids: newSelection }
      }),

    setSelectedGroups: (groupUuids: string[]) =>
      set({ selectedGroupUuids: groupUuids }),

    clearGroupSelection: () =>
      set({ selectedGroupUuids: [] }),

    toggleGroupVisibility: (groupUuid: string) =>
      set(state => ({
        primitiveGroups: {
          ...state.primitiveGroups,
          [groupUuid]: {
            ...state.primitiveGroups[groupUuid],
            visible: state.primitiveGroups[groupUuid].visible !== false 
              ? false 
              : true
          }
        }
      }))
  }))
)

// Селекторы состояния стора объекта
export const useObjectPrimitives = () => useObjectStore(s => s.primitives)
export const useObjectLighting = () => useObjectStore(s => s.lighting)
export const useObjectSelectedPrimitiveIds = () => useObjectStore(s => s.selectedPrimitiveIds)
export const useObjectHoveredPrimitiveId = () => useObjectStore(s => s.hoveredPrimitiveId)
export const useObjectRenderMode = () => useObjectStore(s => s.renderMode)
export const useObjectTransformMode = () => useObjectStore(s => s.transformMode)
export const useObjectViewMode = () => useObjectStore(s => s.viewMode)
/** Селектор состояния видимости сетки */
export const useObjectGridVisible = () => useObjectStore(s => s.gridVisible)
/** Селектор BoundingBox текущего объекта */
export const useObjectBoundingBox = () => useObjectStore(s => s.boundingBox)

// Material selectors
/** Селектор списка материалов объекта */
export const useObjectMaterials = () => useObjectStore(s => s.materials)
/** Селектор UUID выбранного материала */
export const useSelectedMaterialUuid = () => useObjectStore(s => s.selectedMaterialUuid)
/** Селектор выбранного материала */
export const useSelectedMaterial = () => useObjectStore(s => {
  if (!s.selectedMaterialUuid) return null
  return s.materials.find(m => m.uuid === s.selectedMaterialUuid) || null
})

// Group selectors
/** Селектор групп примитивов */
export const useObjectPrimitiveGroups = () => useObjectStore(s => s.primitiveGroups)
/** Селектор привязок примитивов к группам */
export const usePrimitiveGroupAssignments = () => useObjectStore(s => s.primitiveGroupAssignments)
/** Селектор UUID выбранных групп */
export const useSelectedGroupUuids = () => useObjectStore(s => s.selectedGroupUuids)

/** Селектор иерархического дерева групп */
export const useGroupTree = () => useObjectStore(s => buildGroupTree(s.primitiveGroups))

/** Селектор примитивов в указанной группе */
export const useGroupPrimitives = (groupUuid: string) => useObjectStore(s => {
  return s.primitives.filter(primitive => 
    s.primitiveGroupAssignments[primitive.uuid] === groupUuid
  )
})

/** Селектор всех примитивов без группы */
export const useUngroupedPrimitives = () => useObjectStore(s => {
  return s.primitives.filter(primitive => 
    !s.primitiveGroupAssignments[primitive.uuid]
  )
})

/** Селектор корневых групп (без родителя) */
export const useRootGroups = () => useObjectStore(s => {
  return Object.values(s.primitiveGroups).filter(group => !group.parentGroupUuid)
})

/** Селектор глубины группы в иерархии */
export const useGroupDepth = (groupUuid: string) => useObjectStore(s => {
  const path = getGroupPath(groupUuid, s.primitiveGroups)
  return path.length - 1
})

/** Селектор дочерних групп для указанной группы */
export const useGroupChildren = (groupUuid: string) => useObjectStore(s => {
  const childrenUuids = findGroupChildren(groupUuid, s.primitiveGroups)
  return childrenUuids.map(uuid => s.primitiveGroups[uuid]).filter(Boolean)
})

/** Селектор для получения группы по UUID */
export const useGroupByUuid = (groupUuid: string) => useObjectStore(s => {
  return s.primitiveGroups[groupUuid] || null
})

/** Селектор пути до группы (массив групп от корня до указанной) */
export const useGroupPath = (groupUuid: string) => useObjectStore(s => {
  return getGroupPath(groupUuid, s.primitiveGroups)
})

/** Селектор для проверки видимости группы с учетом родительских групп */
export const useGroupVisibility = (groupUuid: string) => useObjectStore(s => {
  const groupPath = getGroupPath(groupUuid, s.primitiveGroups)
  // Группа видима, если все группы в пути видимы
  return groupPath.every(group => group.visible !== false)
})
