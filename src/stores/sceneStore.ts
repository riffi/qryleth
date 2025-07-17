import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { SceneSerializer } from '../utils/sceneSerializer'
import type {
  SceneStore,
  SceneStoreState,
  SceneStoreActions,
  ViewMode,
  RenderMode,
  TransformMode,
  SelectedObject,
  HoveredObject,
  CurrentScene
} from '../types/r3f'
import type {
  SceneObject,
  ScenePlacement,
  SceneLayer,
  LightingSettings
} from '../types/scene'

const initialLighting: LightingSettings = {
  ambientColor: '#404040',
  ambientIntensity: 0.6,
  directionalColor: '#ffffff',
  directionalIntensity: 1.0,
  backgroundColor: '#222222'
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

const initialScene: CurrentScene = {
  name: 'Новая сцена',
  status: 'draft'
}

const initialState: SceneStoreState = {
  // Scene data
  objects: [],
  placements: [],
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
  currentScene: initialScene,

  // History
  history: [],
  historyIndex: -1
}

export const useSceneStore = create<SceneStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Object management
    setObjects: (objects: SceneObject[]) => {
      set({ objects })
      get().saveToHistory()
    },

    addObject: (object: SceneObject) => {
      const objects = [...get().objects, object]
      set({ objects })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    removeObject: (objectIndex: number) => {
      const objects = get().objects.filter((_, index) => index !== objectIndex)
      const placements = get().placements.filter(p => p.objectIndex !== objectIndex)
      set({ objects, placements })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    updateObject: (objectIndex: number, updates: Partial<SceneObject>) => {
      const objects = get().objects.map((obj, index) =>
        index === objectIndex ? { ...obj, ...updates } : obj
      )
      set({ objects })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    // Placement management
    setPlacements: (placements: ScenePlacement[]) => {
      set({ placements })
      get().saveToHistory()
    },

    addPlacement: (placement: ScenePlacement) => {
      const placements = [...get().placements, placement]
      set({ placements })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    updatePlacement: (index: number, updates: Partial<ScenePlacement>) => {
      const placements = get().placements.map((placement, i) =>
        i === index ? { ...placement, ...updates } : placement
      )
      set({ placements })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    removePlacement: (index: number) => {
      const placements = get().placements.filter((_, i) => i !== index)
      set({ placements })
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

    moveObjectToLayer: (objectIndex: number, layerId: string) => {
      const objects = get().objects.map((obj, index) =>
        index === objectIndex ? { ...obj, layerId } : obj
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
    selectObject: (objectIndex: number, instanceId?: string) => {
      const selectedObject: SelectedObject = {
        objectIndex,
        instanceId,
        placementIndex: instanceId ? parseInt(instanceId.split('-')[1]) : undefined
      }
      set({ selectedObject })
    },

    clearSelection: () => {
      set({ selectedObject: null })
    },

    setHoveredObject: (objectIndex: number, instanceId?: string) => {
      const hoveredObject: HoveredObject = {
        objectIndex,
        instanceId,
        placementIndex: instanceId ? parseInt(instanceId.split('-')[1]) : undefined
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
    setCurrentScene: (currentScene: CurrentScene) => {
      set({ currentScene })
    },

    markSceneAsModified: () => {
      const currentScene = get().currentScene
      if (currentScene.status === 'saved') {
        set({
          currentScene: { ...currentScene, status: 'modified' }
        })
      } else if (currentScene.status === 'draft') {
        set({
          currentScene: { ...currentScene, status: 'modified' }
        })
      }
    },

    loadSceneData: (data: any, sceneName?: string, sceneUuid?: string) => {
      if (data && typeof data === 'object') {
        const state = get()

        // Load scene data
        if (data.objects) state.setObjects(data.objects)
        if (data.placements) state.setPlacements(data.placements)
        if (data.layers) state.setLayers(data.layers)
        if (data.lighting) state.setLighting(data.lighting)

        // Set scene metadata
        if (sceneName && sceneUuid) {
          set({
            currentScene: {
              uuid: sceneUuid,
              name: sceneName,
              status: 'saved'
            }
          })
        } else {
          set({
            currentScene: { name: 'Новая сцена', status: 'draft' }
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
        placements: state.placements,
        layers: state.layers,
        lighting: state.lighting
      }
    },

    clearScene: () => {
      set({
        objects: [],
        placements: [],
        layers: initialLayers,
        lighting: initialLighting,
        selectedObject: null,
        hoveredObject: null,
        currentScene: initialScene,
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

    // Scene serialization methods
    exportScene: (filename?: string) => {
      const state = get()
      SceneSerializer.exportToFile(state, filename)
    },

    importScene: async (file: File) => {
      try {
        const sceneData = await SceneSerializer.importFromFile(file)

        // Apply the imported data
        set({
          ...sceneData,
          // Reset interaction state
          selectedObject: null,
          hoveredObject: null,
          // Clear history
          history: [],
          historyIndex: -1
        })

        // Mark scene as saved if it has a name
        if (sceneData.currentScene?.name) {
          set({
            currentScene: {
              ...sceneData.currentScene,
              status: 'saved'
            }
          })
        }

        console.log('Scene imported successfully')
        return true
      } catch (error) {
        console.error('Failed to import scene:', error)
        return false
      }
    },

    saveSceneToLocalStorage: (key?: string) => {
      const state = get()
      try {
        SceneSerializer.saveToLocalStorage(state, key)

        // Mark scene as saved
        set({
          currentScene: {
            ...state.currentScene,
            status: 'saved'
          }
        })

        return true
      } catch (error) {
        console.error('Failed to save scene to localStorage:', error)
        return false
      }
    },

    loadSceneFromLocalStorage: (key?: string) => {
      try {
        const sceneData = SceneSerializer.loadFromLocalStorage(key)
        if (!sceneData) return false

        // Apply the loaded data
        set({
          ...sceneData,
          // Reset interaction state
          selectedObject: null,
          hoveredObject: null,
          // Clear history
          history: [],
          historyIndex: -1
        })

        console.log('Scene loaded from localStorage successfully')
        return true
      } catch (error) {
        console.error('Failed to load scene from localStorage:', error)
        return false
      }
    },

    getSceneJSON: () => {
      const state = get()
      return SceneSerializer.toJSON(state)
    },

    loadSceneFromJSON: (json: string) => {
      try {
        const sceneData = SceneSerializer.fromJSON(json)

        // Apply the loaded data
        set({
          ...sceneData,
          // Reset interaction state
          selectedObject: null,
          hoveredObject: null,
          // Clear history
          history: [],
          historyIndex: -1
        })

        console.log('Scene loaded from JSON successfully')
        return true
      } catch (error) {
        console.error('Failed to load scene from JSON:', error)
        return false
      }
    }
  }))
)

// Selectors for optimized subscriptions
export const useSceneObjects = () => useSceneStore(state => state.objects)
export const useScenePlacements = () => useSceneStore(state => state.placements)
export const useSceneLayers = () => useSceneStore(state => state.layers)
export const useSceneLighting = () => useSceneStore(state => state.lighting)
export const useSelectedObject = () => useSceneStore(state => state.selectedObject)
export const useHoveredObject = () => useSceneStore(state => state.hoveredObject)
export const useViewMode = () => useSceneStore(state => state.viewMode)
export const useRenderMode = () => useSceneStore(state => state.renderMode)
export const useTransformMode = () => useSceneStore(state => state.transformMode)
export const useGridVisible = () => useSceneStore(state => state.gridVisible)
export const useCurrentScene = () => useSceneStore(state => state.currentScene)
