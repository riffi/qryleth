import { useSceneStore } from './sceneStore'
import { shallow } from 'zustand/shallow'
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
export const useSelectionState = () =>
  useSceneStore(state => ({
    selectedObject: state.selectedObject,
    hoveredObject: state.hoveredObject
  }), shallow)

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
export const useSceneMetadata = () =>
  useSceneStore(state => ({
    currentScene: state.currentScene,
    lighting: state.lighting
  }), shallow)

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

export const useObjectInstanceCounts = () =>
  useSceneStore(state => {
    const counts: { [objectIndex: number]: number } = {}
    state.placements.forEach(placement => {
      counts[placement.objectIndex] = (counts[placement.objectIndex] || 0) + 1
    })
    return counts
  }, shallow)

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

// Export actions for convenience
export const useSceneActions = () =>
  useSceneStore(state => ({
    setObjects: state.setObjects,
    addObject: state.addObject,
    removeObject: state.removeObject,
    updateObject: state.updateObject,
    setPlacements: state.setPlacements,
    addPlacement: state.addPlacement,
    updatePlacement: state.updatePlacement,
    removePlacement: state.removePlacement,
    setLayers: state.setLayers,
    createLayer: state.createLayer,
    updateLayer: state.updateLayer,
    deleteLayer: state.deleteLayer,
    toggleLayerVisibility: state.toggleLayerVisibility,
    moveObjectToLayer: state.moveObjectToLayer,
    selectObject: state.selectObject,
    clearSelection: state.clearSelection,
    setHoveredObject: state.setHoveredObject,
    clearHover: state.clearHover,
    setViewMode: state.setViewMode,
    setRenderMode: state.setRenderMode,
    setTransformMode: state.setTransformMode,
    toggleGridVisibility: state.toggleGridVisibility,
    updateLighting: state.updateLighting,
    saveToHistory: state.saveToHistory,
    undo: state.undo,
    redo: state.redo,
    markSceneAsModified: state.markSceneAsModified
  }), shallow)