import React from 'react'
import { ObjectManager } from '../../ObjectManager'
import { useSceneStore } from '../../../stores/sceneStore'
import { 
  useSceneObjectsOptimized,
  useSceneLayersOptimized,
  useSceneLighting,
  useSelectedObject,
  useSceneActions
} from '../../../stores/optimizedSelectors'
import type { ObjectInfo } from '../../ObjectItem'
import type { LightingSettings } from '../../../types/scene'

/**
 * R3F-enabled ObjectManager component that bridges the existing ObjectManager UI
 * with the new Zustand store state management system
 */
export const ObjectManagerR3F: React.FC = () => {
  // Get state from optimized selectors
  const objects = useSceneObjectsOptimized()
  const placements = useSceneStore(state => state.placements)
  const layers = useSceneLayersOptimized()
  const lighting = useSceneLighting()
  const selectedObject = useSelectedObject()
  const currentScene = useSceneStore(state => state.currentScene)

  // Get actions from selectors
  const {
    removeObject,
    removePlacement,
    selectObject,
    clearSelection,
    setHoveredObject,
    clearHover,
    updateLighting,
    createLayer,
    updateLayer,
    deleteLayer,
    toggleLayerVisibility,
    moveObjectToLayer,
    exportScene,
    saveSceneToLocalStorage
  } = useSceneActions()

  // Transform R3F state to ObjectManager format
  const transformedObjects: ObjectInfo[] = React.useMemo(() => {
    return objects.map((sceneObject, objectIndex) => {
      // Find all placements for this object
      const objectPlacements = placements.filter(p => p.objectIndex === objectIndex)
      
      return {
        id: sceneObject.id,
        name: sceneObject.name,
        type: sceneObject.type,
        visible: true, // Object-level visibility (all instances)
        count: objectPlacements.length,
        layerId: sceneObject.layerId || 'objects',
        instances: objectPlacements.map((placement, placementIndex) => {
          const instanceId = `${objectIndex}-${placementIndex}`
          return {
            id: instanceId,
            position: placement.position || [0, 0, 0],
            rotation: placement.rotation || [0, 0, 0],
            scale: placement.scale || [1, 1, 1],
            visible: true // Instance-level visibility
          }
        })
      }
    })
  }, [objects, placements])

  // Transform lighting from R3F format to ObjectManager format
  const transformedLighting: LightingSettings = React.useMemo(() => {
    return {
      ambientColor: lighting.ambient?.color || '#404040',
      ambientIntensity: lighting.ambient?.intensity || 0.6,
      directionalColor: lighting.directional?.color || '#ffffff',
      directionalIntensity: lighting.directional?.intensity || 1.0,
      backgroundColor: '#222222' // Default background
    }
  }, [lighting])

  // Event handlers that map ObjectManager events to R3F store actions
  const handleToggleVisibility = React.useCallback((objectIndex: number) => {
    // For now, we'll toggle layer visibility since R3F doesn't have object-level visibility
    const object = objects[objectIndex]
    if (object?.layerId) {
      toggleLayerVisibility(object.layerId)
    }
  }, [objects, toggleLayerVisibility])

  const handleRemoveObject = React.useCallback((objectIndex: number) => {
    removeObject(objectIndex)
    clearSelection()
  }, [removeObject, clearSelection])

  const handleToggleInstanceVisibility = React.useCallback((objectIndex: number, instanceId: string) => {
    // Instance visibility is handled at placement level
    // For now, we'll implement this as a future enhancement
    console.log('Instance visibility toggle not yet implemented for R3F', { objectIndex, instanceId })
  }, [])

  const handleRemoveInstance = React.useCallback((objectIndex: number, instanceId: string) => {
    // Parse placement index from instanceId
    const placementIndex = parseInt(instanceId.split('-')[1])
    if (!isNaN(placementIndex)) {
      removePlacement(placementIndex)
      clearSelection()
    }
  }, [removePlacement, clearSelection])

  const handleHighlightObject = React.useCallback((objectIndex: number, instanceId?: string) => {
    setHoveredObject(objectIndex, instanceId)
  }, [setHoveredObject])

  const handleClearHighlight = React.useCallback(() => {
    clearHover()
  }, [clearHover])

  const handleSelectObject = React.useCallback((objectIndex: number, instanceId?: string) => {
    selectObject(objectIndex, instanceId)
  }, [selectObject])

  const handleSaveObjectToLibrary = React.useCallback((objectIndex: number) => {
    // This would need integration with the existing library system
    // For now, we'll use the export functionality
    console.log('Save object to library not yet implemented for R3F', { objectIndex })
  }, [])

  const handleEditObject = React.useCallback((objectIndex: number, instanceId?: string) => {
    // This would trigger the ObjectEditor in R3F mode
    // For now, we'll just select the object
    selectObject(objectIndex, instanceId)
    console.log('Object editing in R3F mode not yet implemented', { objectIndex, instanceId })
  }, [selectObject])

  const handleLightingChange = React.useCallback((newLighting: LightingSettings) => {
    // Transform ObjectManager lighting format back to R3F format
    const r3fLighting = {
      ambient: {
        color: newLighting.ambientColor,
        intensity: newLighting.ambientIntensity
      },
      directional: {
        color: newLighting.directionalColor,
        intensity: newLighting.directionalIntensity,
        position: lighting.directional?.position || [10, 10, 5],
        castShadow: lighting.directional?.castShadow || true
      }
    }
    updateLighting(r3fLighting)
  }, [updateLighting, lighting])

  const handleCreateLayer = React.useCallback((
    name: string, 
    type: 'object' | 'landscape', 
    width?: number, 
    height?: number, 
    shape?: 'plane' | 'perlin'
  ) => {
    createLayer({
      name,
      type,
      visible: true,
      position: layers.length,
      ...(type === 'landscape' && {
        width: width || 10,
        height: height || 10,
        shape: shape || 'plane'
      })
    })
  }, [createLayer, layers.length])

  const handleSaveSceneToLibrary = React.useCallback(() => {
    // Export scene as file for now
    exportScene(`scene-${Date.now()}.json`)
  }, [exportScene])

  // Transform selected object format
  const transformedSelectedObject = React.useMemo(() => {
    if (!selectedObject) return null
    return {
      objectIndex: selectedObject.objectIndex,
      instanceId: selectedObject.instanceId
    }
  }, [selectedObject])

  return (
    <ObjectManager
      objects={transformedObjects}
      onToggleVisibility={handleToggleVisibility}
      onRemoveObject={handleRemoveObject}
      onToggleInstanceVisibility={handleToggleInstanceVisibility}
      onRemoveInstance={handleRemoveInstance}
      onHighlightObject={handleHighlightObject}
      onClearHighlight={handleClearHighlight}
      onSelectObject={handleSelectObject}
      selectedObject={transformedSelectedObject}
      onSaveObjectToLibrary={handleSaveObjectToLibrary}
      currentScene={currentScene}
      onSaveSceneToLibrary={handleSaveSceneToLibrary}
      onEditObject={handleEditObject}
      lighting={transformedLighting}
      onLightingChange={handleLightingChange}
      layers={layers}
      onCreateLayer={handleCreateLayer}
      onUpdateLayer={updateLayer}
      onDeleteLayer={deleteLayer}
      onToggleLayerVisibility={toggleLayerVisibility}
      onMoveObjectToLayer={moveObjectToLayer}
    />
  )
}