import { useSceneStore } from './sceneStore'
import { shallow } from 'zustand/shallow'
import { useMemo } from 'react'
import type { SceneObject, ScenePlacement, SceneLayer } from '../types/scene'

// Optimized selectors for preventing unnecessary re-renders

// Scene data selectors
export const useSceneObjectsOptimized = () =>
  useSceneStore(state => state.objects, shallow)

export const useScenePlacementsOptimized = () =>
  useSceneStore(state => state.placements, shallow)

export const useSceneLayersOptimized = () =>
  useSceneStore(state => state.layers, shallow)

// Object-specific selectors
export const useObjectById = (objectIndex: number) =>
  useSceneStore(state => state.objects[objectIndex])

export const usePlacementById = (placementIndex: number) =>
  useSceneStore(state => state.placements[placementIndex])

export const useLayerById = (layerId: string) =>
  useSceneStore(state => state.layers.find(layer => layer.id === layerId))

// Derived selectors
export const useVisibleLayers = () =>
  useSceneStore(state => state.layers.filter(layer => layer.visible), shallow)

export const useObjectsByLayer = (layerId: string) =>
  useSceneStore(state =>
    state.objects.filter(obj => (obj.layerId || 'objects') === layerId),
    shallow
  )

export const usePlacementsByObjectIndex = (objectIndex: number) =>
  useSceneStore(state =>
    state.placements.filter(placement => placement.objectIndex === objectIndex),
    shallow
  )

// Selection and interaction selectors
export const useSelectionState = () => {
  const selectedObject = useSceneStore(state => state.selectedObject)
  const hoveredObject = useSceneStore(state => state.hoveredObject)

  return useMemo(
    () => ({ selectedObject, hoveredObject }),
    [selectedObject, hoveredObject]
  )
}

export const useIsObjectSelected = (objectIndex: number, instanceId?: string) =>
  useSceneStore(state => {
    const selected = state.selectedObject
    return selected?.objectIndex === objectIndex && selected?.instanceId === instanceId
  })

export const useIsObjectHovered = (objectIndex: number, instanceId?: string) =>
  useSceneStore(state => {
    const hovered = state.hoveredObject
    return hovered?.objectIndex === objectIndex && hovered?.instanceId === instanceId
  })

// View state selectors
export const useViewState = () =>
  useSceneStore(state => ({
    viewMode: state.viewMode,
    renderMode: state.renderMode,
    transformMode: state.transformMode,
    gridVisible: state.gridVisible
  }), shallow)

// Scene metadata selectors
export const useSceneMetadata = () => {
    const currentScene = useSceneStore(state => state.currentScene)
    const lighting = useSceneStore(state => state.lighting)
    return useMemo(
        () => ({ currentScene, lighting }),
        [currentScene, lighting]
    )
}


// History selectors
export const useHistoryState = () =>
  useSceneStore(state => ({
    canUndo: state.canUndo(),
    canRedo: state.canRedo(),
    historyIndex: state.historyIndex,
    historyLength: state.history.length
  }))

// Performance selectors for large scenes
export const useObjectCount = () =>
  useSceneStore(state => state.objects.length)

export const usePlacementCount = () =>
  useSceneStore(state => state.placements.length)

export const useSceneStats = () =>
  useSceneStore(state => ({
    objectCount: state.objects.length,
    placementCount: state.placements.length,
    layerCount: state.layers.length,
    visibleLayerCount: state.layers.filter(l => l.visible).length
  }))

// Memoized complex selectors
export const useGroupedObjects = () =>
  useSceneStore(state => {
    const groups: { [layerId: string]: SceneObject[] } = {}
    state.objects.forEach(obj => {
      const layerId = obj.layerId || 'objects'
      if (!groups[layerId]) groups[layerId] = []
      groups[layerId].push(obj)
    })
    return groups
  }, shallow)

export const useObjectInstanceCounts = () => {
  // Забираем только placements — примитив (array) со стабильной ссылкой
  const placements = useSceneStore(s => s.placements)

  // Считаем один раз за рендер
  return useMemo(() => {
    const counts: Record<number, number> = {}
    for (const p of placements) {
      counts[p.objectIndex] = (counts[p.objectIndex] || 0) + 1
    }
    return counts           // ← одна и та же ссылка внутри коммита
  }, [placements])
}

// Layer-specific optimization selectors
export const useLayerVisibility = (layerId: string) =>
  useSceneStore(state => {
    const layer = state.layers.find(l => l.id === layerId)
    return layer?.visible ?? true
  })

export const useLandscapeLayers = () =>
  useSceneStore(state =>
    state.layers.filter(layer => layer.type === 'landscape'),
    shallow
  )

export const useObjectLayers = () =>
  useSceneStore(state =>
    state.layers.filter(layer => layer.type === 'object'),
    shallow
  )

// Transformation selectors
export const useTransformableObjects = () =>
  useSceneStore(state => {
    const selected = state.selectedObject
    if (!selected) return []

    return state.placements.filter((placement, index) => {
      if (selected.instanceId) {
        // Specific instance selected
        const placementIndex = parseInt(selected.instanceId.split('-')[1])
        return index === placementIndex
      } else {
        // All instances of object type selected
        return placement.objectIndex === selected.objectIndex
      }
    })
  }, shallow)

// Material and rendering optimization selectors
export const useWireframeMode = () =>
  useSceneStore(state => state.renderMode === 'wireframe')

export const useNeedsUpdate = () =>
  useSceneStore(state => state.currentScene.status === 'modified')

// Export actions for convenience with memoization to prevent infinite loops
export const useSceneActions = () => {
  const store = useSceneStore()

  // Memoize the actions object to prevent recreating it on every render
  return useMemo(() => ({
    setObjects: store.setObjects,
    addObject: store.addObject,
    removeObject: store.removeObject,
    updateObject: store.updateObject,
    setPlacements: store.setPlacements,
    addPlacement: store.addPlacement,
    updatePlacement: store.updatePlacement,
    removePlacement: store.removePlacement,
    setLayers: store.setLayers,
    createLayer: store.createLayer,
    updateLayer: store.updateLayer,
    deleteLayer: store.deleteLayer,
    toggleLayerVisibility: store.toggleLayerVisibility,
    toggleObjectVisibility: store.toggleObjectVisibility,
    moveObjectToLayer: store.moveObjectToLayer,
    selectObject: store.selectObject,
    clearSelection: store.clearSelection,
    setHoveredObject: store.setHoveredObject,
    clearHover: store.clearHover,
    setViewMode: store.setViewMode,
    setRenderMode: store.setRenderMode,
    setTransformMode: store.setTransformMode,
    toggleGridVisibility: store.toggleGridVisibility,
    updateLighting: store.updateLighting,
    saveToHistory: store.saveToHistory,
    undo: store.undo,
    redo: store.redo,
    markSceneAsModified: store.markSceneAsModified,
    exportScene: store.exportScene,
    saveSceneToLocalStorage: store.saveSceneToLocalStorage
  }), [store])
}
