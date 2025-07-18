import { useSceneStore } from './sceneStore'
import { shallow } from 'zustand/shallow'
import { useMemo } from 'react'

// Optimized selectors for preventing unnecessary re-renders

// Scene data selectors
export const useSceneObjectsOptimized = () =>
  useSceneStore(state => state.objects, shallow)

export const useScenePlacementsOptimized = () =>
  useSceneStore(state => state.placements, shallow)

export const useSceneLayersOptimized = () =>
  useSceneStore(state => state.layers, shallow)


// Selection and interaction selectors
export const useSelectionState = () => {
  const selectedObject = useSceneStore(state => state.selectedObject)
  const hoveredObject = useSceneStore(state => state.hoveredObject)

  return useMemo(
    () => ({ selectedObject, hoveredObject }),
    [selectedObject, hoveredObject]
  )
}


// Scene metadata selectors
export const useSceneMetadata = () => {
    const currentScene = useSceneStore(state => state.currentScene)
    const lighting = useSceneStore(state => state.lighting)
    return useMemo(
        () => ({ currentScene, lighting }),
        [currentScene, lighting]
    )
}

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
    toggleInstanceVisibility: store.toggleInstanceVisibility,
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
  }), [store])
}
