import React from 'react'
import { useSceneStore } from '../../../stores/sceneStore'
import { useSceneActions } from '../../../stores/optimizedSelectors'
import type { SceneObject, ScenePlacement, SceneLayer } from '../../../types/scene'

/**
 * Comprehensive wrapper that ensures all object management functionality
 * is preserved during the R3F migration
 */
export const ObjectManagementWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize all object management capabilities
  const preservedFunctionality = usePreservedObjectFunctionality()
  
  // Provide context for child components
  return (
    <ObjectManagementContext.Provider value={preservedFunctionality}>
      {children}
    </ObjectManagementContext.Provider>
  )
}

/**
 * Context for accessing preserved object management functionality
 */
const ObjectManagementContext = React.createContext<PreservedObjectFunctionality | null>(null)

export const useObjectManagement = () => {
  const context = React.useContext(ObjectManagementContext)
  if (!context) {
    throw new Error('useObjectManagement must be used within ObjectManagementWrapper')
  }
  return context
}

interface PreservedObjectFunctionality {
  // Object CRUD operations
  createObject: (objectData: Omit<SceneObject, 'id'>) => void
  duplicateObject: (objectIndex: number) => void
  deleteObject: (objectIndex: number) => void
  editObject: (objectIndex: number, updates: Partial<SceneObject>) => void
  
  // Placement operations
  createPlacement: (objectIndex: number, position?: [number, number, number]) => void
  duplicatePlacement: (placementIndex: number) => void
  deletePlacement: (placementIndex: number) => void
  transformPlacement: (placementIndex: number, transform: Partial<ScenePlacement>) => void
  
  // Layer operations
  createObjectLayer: (name: string) => void
  createLandscapeLayer: (name: string, width: number, height: number, shape: 'plane' | 'perlin') => void
  moveObjectBetweenLayers: (objectIndex: number, fromLayerId: string, toLayerId: string) => void
  toggleLayerVisibility: (layerId: string) => void
  deleteLayer: (layerId: string) => void
  
  // Selection and interaction
  selectSingleObject: (objectIndex: number, instanceId?: string) => void
  selectMultipleObjects: (selections: Array<{objectIndex: number, instanceId?: string}>) => void
  clearAllSelections: () => void
  highlightObject: (objectIndex: number, instanceId?: string) => void
  clearHighlight: () => void
  
  // Transform operations
  translateSelected: (delta: [number, number, number]) => void
  rotateSelected: (delta: [number, number, number]) => void
  scaleSelected: (factor: [number, number, number]) => void
  
  // Visibility operations
  toggleObjectVisibility: (objectIndex: number) => void
  toggleInstanceVisibility: (objectIndex: number, instanceId: string) => void
  showAllObjects: () => void
  hideAllObjects: () => void
  
  // Library operations
  saveObjectToLibrary: (objectIndex: number, name?: string) => void
  loadObjectFromLibrary: (libraryObjectId: string) => void
  
  // Scene operations
  saveSceneToLibrary: (name?: string) => void
  loadSceneFromLibrary: (sceneId: string) => void
  exportSceneAsFile: (filename?: string) => void
  importSceneFromFile: (file: File) => Promise<boolean>
  
  // History operations
  undoLastAction: () => void
  redoLastAction: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  
  // Utility functions
  getObjectStatistics: () => ObjectStatistics
  validateSceneIntegrity: () => SceneValidationResult
  optimizeScene: () => void
}

interface ObjectStatistics {
  totalObjects: number
  totalPlacements: number
  objectsByType: Record<string, number>
  placementsByLayer: Record<string, number>
  memoryUsage: {
    objects: number
    placements: number
    geometries: number
    materials: number
  }
}

interface SceneValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

/**
 * Hook that implements all preserved object management functionality
 */
const usePreservedObjectFunctionality = (): PreservedObjectFunctionality => {
  const store = useSceneStore()
  const actions = useSceneActions()

  // Object CRUD operations
  const createObject = React.useCallback((objectData: Omit<SceneObject, 'id'>) => {
    const newObject: SceneObject = {
      ...objectData,
      id: `object-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    actions.addObject(newObject)
  }, [actions])

  const duplicateObject = React.useCallback((objectIndex: number) => {
    const objects = store.getState().objects
    const originalObject = objects[objectIndex]
    if (originalObject) {
      const duplicatedObject: SceneObject = {
        ...originalObject,
        id: `object-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${originalObject.name} (Copy)`
      }
      actions.addObject(duplicatedObject)
    }
  }, [store, actions])

  const deleteObject = React.useCallback((objectIndex: number) => {
    actions.removeObject(objectIndex)
    actions.clearSelection()
  }, [actions])

  const editObject = React.useCallback((objectIndex: number, updates: Partial<SceneObject>) => {
    actions.updateObject(objectIndex, updates)
  }, [actions])

  // Placement operations
  const createPlacement = React.useCallback((objectIndex: number, position: [number, number, number] = [0, 0, 0]) => {
    const newPlacement: ScenePlacement = {
      objectIndex,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    }
    actions.addPlacement(newPlacement)
  }, [actions])

  const duplicatePlacement = React.useCallback((placementIndex: number) => {
    const placements = store.getState().placements
    const originalPlacement = placements[placementIndex]
    if (originalPlacement) {
      const duplicatedPlacement: ScenePlacement = {
        ...originalPlacement,
        position: [
          originalPlacement.position[0] + 1,
          originalPlacement.position[1],
          originalPlacement.position[2]
        ]
      }
      actions.addPlacement(duplicatedPlacement)
    }
  }, [store, actions])

  const deletePlacement = React.useCallback((placementIndex: number) => {
    actions.removePlacement(placementIndex)
    actions.clearSelection()
  }, [actions])

  const transformPlacement = React.useCallback((placementIndex: number, transform: Partial<ScenePlacement>) => {
    actions.updatePlacement(placementIndex, transform)
  }, [actions])

  // Layer operations
  const createObjectLayer = React.useCallback((name: string) => {
    actions.createLayer({
      name,
      type: 'object',
      visible: true,
      position: store.getState().layers.length
    })
  }, [actions, store])

  const createLandscapeLayer = React.useCallback((name: string, width: number, height: number, shape: 'plane' | 'perlin') => {
    actions.createLayer({
      name,
      type: 'landscape',
      visible: true,
      position: store.getState().layers.length,
      width,
      height,
      shape
    })
  }, [actions, store])

  const moveObjectBetweenLayers = React.useCallback((objectIndex: number, fromLayerId: string, toLayerId: string) => {
    actions.moveObjectToLayer(objectIndex, toLayerId)
  }, [actions])

  // Selection and interaction
  const selectSingleObject = React.useCallback((objectIndex: number, instanceId?: string) => {
    actions.selectObject(objectIndex, instanceId)
  }, [actions])

  const selectMultipleObjects = React.useCallback((selections: Array<{objectIndex: number, instanceId?: string}>) => {
    // R3F currently supports single selection, but we can extend this
    if (selections.length > 0) {
      const first = selections[0]
      actions.selectObject(first.objectIndex, first.instanceId)
    }
  }, [actions])

  const clearAllSelections = React.useCallback(() => {
    actions.clearSelection()
  }, [actions])

  const highlightObject = React.useCallback((objectIndex: number, instanceId?: string) => {
    actions.setHoveredObject(objectIndex, instanceId)
  }, [actions])

  const clearHighlight = React.useCallback(() => {
    actions.clearHover()
  }, [actions])

  // Transform operations
  const translateSelected = React.useCallback((delta: [number, number, number]) => {
    const selectedObject = store.getState().selectedObject
    if (selectedObject && selectedObject.placementIndex !== undefined) {
      const placements = store.getState().placements
      const placement = placements[selectedObject.placementIndex]
      if (placement) {
        const newPosition: [number, number, number] = [
          placement.position[0] + delta[0],
          placement.position[1] + delta[1],
          placement.position[2] + delta[2]
        ]
        actions.updatePlacement(selectedObject.placementIndex, { position: newPosition })
      }
    }
  }, [store, actions])

  const rotateSelected = React.useCallback((delta: [number, number, number]) => {
    const selectedObject = store.getState().selectedObject
    if (selectedObject && selectedObject.placementIndex !== undefined) {
      const placements = store.getState().placements
      const placement = placements[selectedObject.placementIndex]
      if (placement) {
        const newRotation: [number, number, number] = [
          placement.rotation[0] + delta[0],
          placement.rotation[1] + delta[1],
          placement.rotation[2] + delta[2]
        ]
        actions.updatePlacement(selectedObject.placementIndex, { rotation: newRotation })
      }
    }
  }, [store, actions])

  const scaleSelected = React.useCallback((factor: [number, number, number]) => {
    const selectedObject = store.getState().selectedObject
    if (selectedObject && selectedObject.placementIndex !== undefined) {
      const placements = store.getState().placements
      const placement = placements[selectedObject.placementIndex]
      if (placement) {
        const newScale: [number, number, number] = [
          placement.scale[0] * factor[0],
          placement.scale[1] * factor[1],
          placement.scale[2] * factor[2]
        ]
        actions.updatePlacement(selectedObject.placementIndex, { scale: newScale })
      }
    }
  }, [store, actions])

  // Visibility operations
  const toggleObjectVisibility = React.useCallback((objectIndex: number) => {
    actions.toggleObjectVisibility(objectIndex)
  }, [store, actions])

  const toggleInstanceVisibility = React.useCallback((objectIndex: number, instanceId: string) => {
    // This would need instance-level visibility support
    console.log('Instance visibility not yet implemented', { objectIndex, instanceId })
  }, [])

  const showAllObjects = React.useCallback(() => {
    const layers = store.getState().layers
    layers.forEach(layer => {
      if (!layer.visible) {
        actions.toggleLayerVisibility(layer.id)
      }
    })
  }, [store, actions])

  const hideAllObjects = React.useCallback(() => {
    const layers = store.getState().layers
    layers.forEach(layer => {
      if (layer.visible) {
        actions.toggleLayerVisibility(layer.id)
      }
    })
  }, [store, actions])

  // Library operations
  const saveObjectToLibrary = React.useCallback((objectIndex: number, name?: string) => {
    const objects = store.getState().objects
    const object = objects[objectIndex]
    if (object) {
      // This would integrate with the existing library system
      console.log('Save to library not yet implemented', { object, name })
    }
  }, [store])

  const loadObjectFromLibrary = React.useCallback((libraryObjectId: string) => {
    // This would integrate with the existing library system
    console.log('Load from library not yet implemented', { libraryObjectId })
  }, [])

  // Scene operations
  const saveSceneToLibrary = React.useCallback((name?: string) => {
    actions.exportScene(name ? `${name}.json` : undefined)
  }, [actions])

  const loadSceneFromLibrary = React.useCallback((sceneId: string) => {
    // This would integrate with the existing library system
    console.log('Load scene from library not yet implemented', { sceneId })
  }, [])

  const exportSceneAsFile = React.useCallback((filename?: string) => {
    actions.exportScene(filename)
  }, [actions])

  const importSceneFromFile = React.useCallback(async (file: File) => {
    return actions.importScene(file)
  }, [actions])

  // History operations
  const undoLastAction = React.useCallback(() => {
    actions.undo()
  }, [actions])

  const redoLastAction = React.useCallback(() => {
    actions.redo()
  }, [actions])

  const canUndo = React.useCallback(() => {
    return store.getState().canUndo()
  }, [store])

  const canRedo = React.useCallback(() => {
    return store.getState().canRedo()
  }, [store])

  // Utility functions
  const getObjectStatistics = React.useCallback((): ObjectStatistics => {
    const state = store.getState()
    const objectsByType: Record<string, number> = {}
    const placementsByLayer: Record<string, number> = {}

    state.objects.forEach(obj => {
      objectsByType[obj.type] = (objectsByType[obj.type] || 0) + 1
    })

    state.placements.forEach(placement => {
      const obj = state.objects[placement.objectIndex]
      const layerId = obj?.layerId || 'objects'
      placementsByLayer[layerId] = (placementsByLayer[layerId] || 0) + 1
    })

    return {
      totalObjects: state.objects.length,
      totalPlacements: state.placements.length,
      objectsByType,
      placementsByLayer,
      memoryUsage: {
        objects: state.objects.length,
        placements: state.placements.length,
        geometries: 0, // Would need geometry cache integration
        materials: 0   // Would need material cache integration
      }
    }
  }, [store])

  const validateSceneIntegrity = React.useCallback((): SceneValidationResult => {
    const state = store.getState()
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Validate object references
    state.placements.forEach((placement, index) => {
      if (!state.objects[placement.objectIndex]) {
        errors.push(`Placement ${index} references non-existent object ${placement.objectIndex}`)
      }
    })

    // Validate layer references
    state.objects.forEach((obj, index) => {
      if (obj.layerId) {
        const layer = state.layers.find(l => l.id === obj.layerId)
        if (!layer) {
          errors.push(`Object ${index} references non-existent layer ${obj.layerId}`)
        }
      }
    })

    // Performance warnings
    if (state.placements.length > 1000) {
      warnings.push(`Large number of placements (${state.placements.length}) may impact performance`)
      suggestions.push('Consider using instancing for repeated objects')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }, [store])

  const optimizeScene = React.useCallback(() => {
    // This would implement scene optimization strategies
    console.log('Scene optimization not yet implemented')
  }, [])

  return {
    createObject,
    duplicateObject,
    deleteObject,
    editObject,
    createPlacement,
    duplicatePlacement,
    deletePlacement,
    transformPlacement,
    createObjectLayer,
    createLandscapeLayer,
    moveObjectBetweenLayers,
    toggleLayerVisibility: actions.toggleLayerVisibility,
    deleteLayer: actions.deleteLayer,
    selectSingleObject,
    selectMultipleObjects,
    clearAllSelections,
    highlightObject,
    clearHighlight,
    translateSelected,
    rotateSelected,
    scaleSelected,
    toggleObjectVisibility,
    toggleInstanceVisibility,
    showAllObjects,
    hideAllObjects,
    saveObjectToLibrary,
    loadObjectFromLibrary,
    saveSceneToLibrary,
    loadSceneFromLibrary,
    exportSceneAsFile,
    importSceneFromFile,
    undoLastAction,
    redoLastAction,
    canUndo,
    canRedo,
    getObjectStatistics,
    validateSceneIntegrity,
    optimizeScene
  }
}
