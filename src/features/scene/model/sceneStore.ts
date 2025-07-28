import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { generateUUID } from '@/shared/lib/uuid.ts'
import type {
  SceneStore,
  SceneStoreState,
  SceneMetaData
} from '@/features/scene/model/store-types'
import type {
  ViewMode,
  RenderMode,
  TransformMode,
  SelectedSceneObject,
  HoveredSceneObject
} from '@/shared/types/ui'
import type {
  SceneObject,
  SceneObjectInstance,
  SceneLayer
} from '@/entities/scene/types.ts'
import { normalizePrimitive, ensurePrimitiveNames } from '@/entities/primitive'
import type {LightingSettings} from "@/entities/lighting"

const initialLighting: LightingSettings = {
  ambientColor: '#87CEEB',
  ambientIntensity: 0.6,
  directionalColor: '#FFD700',
  directionalIntensity: 1.0,
  backgroundColor: '#87CEEB'
}

const initialLayers: SceneLayer[] = [
  {
    id: 'objects',
    name: 'Объекты',
    type: 'object',
    visible: true,
    position: 0
  }
]

const initialSceneMetaData: SceneMetaData = {
  name: 'Новая сцена',
  status: 'draft'
}

const initialState: SceneStoreState = {
  // Scene data
  objects: [],
  objectInstances: [],
  layers: initialLayers,
  lighting: initialLighting,

  // UI state
  viewMode: 'orbit',
  renderMode: 'solid',
  transformMode: 'translate',
  selectedObject: null,
  hoveredObject: null,
  gridVisible: true,

  // Scene metadata
  sceneMetaData: initialSceneMetaData,

  // History
  history: [],
  historyIndex: -1
}

export const useSceneStore = create<SceneStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Object management
    setObjects: (objects: SceneObject[]) => {
      const normalized = objects.map(obj => ({
        ...obj,
        uuid: obj.uuid || generateUUID(),
        visible: obj.visible !== false,
        primitives: ensurePrimitiveNames(obj.primitives.map(normalizePrimitive)),
        libraryUuid: obj.libraryUuid
      }))
      set({ objects: normalized })
      get().saveToHistory()
    },

    addObject: (object: SceneObject) => {
      const normalized = {
        ...object,
        uuid: object.uuid || generateUUID(),
        visible: object.visible !== false,
        primitives: ensurePrimitiveNames(object.primitives.map(normalizePrimitive)),
        libraryUuid: object.libraryUuid
      }
      const objects = [...get().objects, normalized]
      set({ objects })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    removeObject: (objectUuid: string) => {
      const objects = get().objects.filter(obj => obj.uuid !== objectUuid)
      const filtered = get().objectInstances.filter(p => p.objectUuid !== objectUuid)
      set({ objects, objectInstances: filtered })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    /**
     * Обновляет объект сцены по его UUID.
     * Если передан новый список примитивов, он предварительно
     * нормализуется и заменяет текущий. Все поля, отсутствующие
     * во входящих данных, остаются без изменений.
     */
    updateObject: (objectUuid: string, updates: Partial<SceneObject>) => {
      const normalizedUpdates: Partial<SceneObject> = { ...updates }

      if (updates.primitives) {
        normalizedUpdates.primitives = ensurePrimitiveNames(
          updates.primitives.map(normalizePrimitive)
        )
      }

      const objects = get().objects.map(obj =>
        obj.uuid === objectUuid ? { ...obj, ...normalizedUpdates } : obj
      )
      set({ objects })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    // Object instance management
    setObjectInstances: (objectInstances: SceneObjectInstance[]) => {
      const normalized = objectInstances.map(p => ({
        ...p,
        uuid: p.uuid || generateUUID(),
        visible: p.visible !== false
      }))
      set({ objectInstances: normalized })
      get().saveToHistory()
    },

    addObjectInstance: (objectInstance: SceneObjectInstance) => {
      const normalized = {
        ...objectInstance,
        uuid: objectInstance.uuid || generateUUID(),
        visible: objectInstance.visible !== false
      }
      const list = [...get().objectInstances, normalized]
      set({ objectInstances: list })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    /**
     * Обновляет инстанс объекта по его UUID.
     * Полученные изменения применяются к найденному инстансу,
     * после чего состояние сохраняется в историю и сцена помечается как измененная.
     */
    updateObjectInstance: (
      instanceId: string,
      updates: Partial<SceneObjectInstance>
    ) => {
      const list = get().objectInstances.map(instance =>
        instance.uuid === instanceId ? { ...instance, ...updates } : instance
      )
      set({ objectInstances: list })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    removeObjectInstance: (index: number) => {
      const list = get().objectInstances.filter((_, i) => i !== index)
      set({ objectInstances: list })
      get().saveToHistory()
      get().markSceneAsModified()
    },


    // Layer management
    setLayers: (layers: SceneLayer[]) => {
      set({ layers })
      get().saveToHistory()
    },

    createLayer: (layerData: Omit<SceneLayer, 'id'>) => {
      const newLayer: SceneLayer = {
        ...layerData,
        id: Math.random().toString(36).substr(2, 9)
      }
      const layers = [...get().layers, newLayer]
      set({ layers })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    updateLayer: (layerId: string, updates: Partial<SceneLayer>) => {
      const layers = get().layers.map(layer =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
      set({ layers })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    deleteLayer: (layerId: string) => {
      if (layerId === 'objects') return // Cannot delete default layer

      const layers = get().layers.filter(layer => layer.id !== layerId)
      const objects = get().objects.map(obj =>
        obj.layerId === layerId ? { ...obj, layerId: 'objects' } : obj
      )

      set({ layers, objects })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    toggleLayerVisibility: (layerId: string) => {
      const layers = get().layers.map(layer =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
      set({ layers })
      get().markSceneAsModified()
    },

    toggleObjectVisibility: (objectUuid: string) => {
      const objects = get().objects.map(obj =>
        obj.uuid === objectUuid ? { ...obj, visible: obj.visible === false ? true : !obj.visible } : obj
      )
      set({ objects })
      get().markSceneAsModified()
    },

    toggleInstanceVisibility: (objectUuid: string, instanceId: string) => {
      const list = get().objectInstances.map(inst =>
        inst.uuid === instanceId
          ? { ...inst, visible: inst.visible === false ? true : !inst.visible }
          : inst
      )
      set({ objectInstances: list })
      get().markSceneAsModified()
    },

    moveObjectToLayer: (objectUuid: string, layerId: string) => {
      const objects = get().objects.map(obj =>
        obj.uuid === objectUuid ? { ...obj, layerId } : obj
      )
      set({ objects })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    // Lighting
    setLighting: (lighting: LightingSettings) => {
      set({ lighting })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    updateLighting: (updates: Partial<LightingSettings>) => {
      const lighting = { ...get().lighting, ...updates }
      set({ lighting })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    // Selection
    selectObject: (objectUuid: string, instanceUuid?: string) => {

      const selectedObject: SelectedSceneObject = {
        objectUuid,
        instanceUuid,
      }
      set({ selectedObject })
    },

    clearSelection: () => {
      set({ selectedObject: null })
    },

    setHoveredObject: (objectUuid: string, instanceId?: string) => {
      let objectInstanceIndex: number | undefined = undefined
      if (instanceId) {
        const instances = get().objectInstances
        objectInstanceIndex = instances.findIndex(p => p.uuid === instanceId)
        if (objectInstanceIndex === -1) objectInstanceIndex = undefined
      }

      const hoveredObject: HoveredSceneObject = {
        objectUuid,
        instanceId,
        objectInstanceIndex
      }
      set({ hoveredObject })
    },

    clearHover: () => {
      set({ hoveredObject: null })
    },

    // View controls
    setViewMode: (viewMode: ViewMode) => {
      set({ viewMode })
    },

    setRenderMode: (renderMode: RenderMode) => {
      set({ renderMode })
    },

    setTransformMode: (transformMode: TransformMode) => {
      set({ transformMode })
    },

    toggleGridVisibility: () => {
      set(state => ({ gridVisible: !state.gridVisible }))
    },

    // Scene management
    setSceneMetadata: (sceneMetaData: SceneMetaData) => {
      set({ sceneMetaData: sceneMetaData })
    },

    markSceneAsModified: () => {
      const sceneMetaData = get().sceneMetaData
      if (sceneMetaData.status === 'saved') {
        set({
          sceneMetaData: { ...sceneMetaData, status: 'modified' }
        })
      } else if (sceneMetaData.status === 'draft') {
        set({
          sceneMetaData: { ...sceneMetaData, status: 'modified' }
        })
      }
    },

    loadSceneData: (data: any, sceneName?: string, sceneUuid?: string) => {
      if (data && typeof data === 'object') {
        const state = get()

        // Load scene data
        if (data.objects) state.setObjects(data.objects)
        if (data.objectInstances) state.setObjectInstances(data.objectInstances)
        if (data.layers) state.setLayers(data.layers)
        if (data.lighting) state.setLighting(data.lighting)

        // Set scene metadata
        if (sceneName && sceneUuid) {
          set({
            sceneMetaData: {
              uuid: sceneUuid,
              name: sceneName,
              status: 'saved'
            }
          })
        } else {
          set({
            sceneMetaData: { name: 'Новая сцена', status: 'draft' }
          })
        }

        // Clear history after loading
        set({ history: [], historyIndex: -1 })
      }
    },

    getCurrentSceneData: () => {
      const state = get()
      return {
        objects: state.objects,
        objectInstances: state.objectInstances,
        layers: state.layers,
        lighting: state.lighting
      }
    },

    clearScene: () => {
      set({
        objects: [],
        objectInstances: [],
        layers: initialLayers,
        lighting: initialLighting,
        selectedObject: null,
        hoveredObject: null,
        sceneMetaData: initialSceneMetaData,
        history: [],
        historyIndex: -1
      })
    },

    // History management
    saveToHistory: () => {
      const state = get()
      const currentData = JSON.stringify(state.getCurrentSceneData())

      // Don't save if it's the same as the last entry
      if (state.history[state.historyIndex] === currentData) return

      // Remove any history after current index (for redo after undo)
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(currentData)

      // Limit history size
      const maxHistorySize = 50
      if (newHistory.length > maxHistorySize) {
        newHistory.shift()
      }

      set({
        history: newHistory,
        historyIndex: newHistory.length - 1
      })
    },

    undo: () => {
      const state = get()
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1
        const previousData = JSON.parse(state.history[newIndex])

        // Load previous state without saving to history
        set({
          ...previousData,
          historyIndex: newIndex,
          history: state.history // Keep original history
        })
      }
    },

    redo: () => {
      const state = get()
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1
        const nextData = JSON.parse(state.history[newIndex])

        // Load next state without saving to history
        set({
          ...nextData,
          historyIndex: newIndex,
          history: state.history // Keep original history
        })
      }
    },

    canUndo: () => {
      return get().historyIndex > 0
    },

    canRedo: () => {
      const state = get()
      return state.historyIndex < state.history.length - 1
    },

  }))
)

// Selectors for optimized subscriptions
export const useSceneObjects = () => useSceneStore(state => state.objects)
export const useSceneObjectInstances = () =>
  useSceneStore(state => state.objectInstances)
export const useSceneLayers = () => useSceneStore(state => state.layers)
export const useSceneLighting = () => useSceneStore(state => state.lighting)
export const useSelectedObject = () => useSceneStore(state => state.selectedObject)
export const useHoveredObject = () => useSceneStore(state => state.hoveredObject)
export const useViewMode = () => useSceneStore(state => state.viewMode)
export const useRenderMode = () => useSceneStore(state => state.renderMode)
export const useTransformMode = () => useSceneStore(state => state.transformMode)
export const useGridVisible = () => useSceneStore(state => state.gridVisible)
