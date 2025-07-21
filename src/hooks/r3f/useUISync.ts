import { useEffect, useCallback, useState } from 'react'
import { useSceneStore } from '../../features/scene/store/sceneStore'
import {
  useSceneObjectsOptimized,
  useSceneObjectInstancesOptimized,
  useSelectionState
} from '../../features/scene/store/optimizedSelectors'

/**
 * Hook for synchronizing UI state with 3D scene state
 * Handles bidirectional communication between UI components and R3F scene
 */
export const useUISync = () => {
  const objects = useSceneObjectsOptimized()
  const objectInstances = useSceneObjectInstancesOptimized()
  const { selectedObject, hoveredObject } = useSelectionState()

  const {
    selectObject,
    clearSelection,
    setHoveredObject,
    clearHover,
    markSceneAsModified
  } = useSceneStore.getState()

  // Sync selection state with UI components
  useEffect(() => {
    const handleSelectionChange = () => {
      // Dispatch custom event for UI components to listen to
      const event = new CustomEvent('r3f:selectionChanged', {
        detail: { selectedObject }
      })
      window.dispatchEvent(event)
    }

    handleSelectionChange()
  }, [selectedObject])

  // Sync hover state with UI components
  useEffect(() => {
    const handleHoverChange = () => {
      // Dispatch custom event for UI components to listen to
      const event = new CustomEvent('r3f:hoverChanged', {
        detail: { hoveredObject }
      })
      window.dispatchEvent(event)
    }

    handleHoverChange()
  }, [hoveredObject])

  // Sync scene data changes with UI
  useEffect(() => {
    const handleSceneDataChange = () => {
      const event = new CustomEvent('r3f:sceneDataChanged', {
        detail: {
          objects,
          objectInstances,
          objectCount: objects.length,
          objectInstanceCount: objectInstances.length
        }
      })
      window.dispatchEvent(event)
    }

    handleSceneDataChange()
  }, [objects, objectInstances])

  // Listen for UI events and sync with 3D scene
  useEffect(() => {
    const handleUISelection = (event: CustomEvent) => {
      const { objectIndex, instanceId } = event.detail
      selectObject(objectIndex, instanceId)
    }

    const handleUIHover = (event: CustomEvent) => {
      const { objectIndex, instanceId } = event.detail
      if (objectIndex !== undefined) {
        setHoveredObject(objectIndex, instanceId)
      } else {
        clearHover()
      }
    }

    const handleUIClearSelection = () => {
      clearSelection()
    }

    const handleUIClearHover = () => {
      clearHover()
    }

    const handleUISceneModified = () => {
      markSceneAsModified()
    }

    // Add event listeners
    window.addEventListener('ui:selectObject', handleUISelection as EventListener)
    window.addEventListener('ui:hoverObject', handleUIHover as EventListener)
    window.addEventListener('ui:clearSelection', handleUIClearSelection)
    window.addEventListener('ui:clearHover', handleUIClearHover)
    window.addEventListener('ui:sceneModified', handleUISceneModified)

    return () => {
      // Cleanup event listeners
      window.removeEventListener('ui:selectObject', handleUISelection as EventListener)
      window.removeEventListener('ui:hoverObject', handleUIHover as EventListener)
      window.removeEventListener('ui:clearSelection', handleUIClearSelection)
      window.removeEventListener('ui:clearHover', handleUIClearHover)
      window.removeEventListener('ui:sceneModified', handleUISceneModified)
    }
  }, [selectObject, setHoveredObject, clearSelection, clearHover, markSceneAsModified])

  return {
    // Utility functions for UI components
    triggerUISelection: useCallback((objectIndex: number, instanceId?: string) => {
      const event = new CustomEvent('ui:selectObject', {
        detail: { objectIndex, instanceId }
      })
      window.dispatchEvent(event)
    }, []),

    triggerUIHover: useCallback((objectIndex?: number, instanceId?: string) => {
      const event = new CustomEvent('ui:hoverObject', {
        detail: { objectIndex, instanceId }
      })
      window.dispatchEvent(event)
    }, []),

    triggerUIClearSelection: useCallback(() => {
      const event = new CustomEvent('ui:clearSelection')
      window.dispatchEvent(event)
    }, []),

    triggerUIClearHover: useCallback(() => {
      const event = new CustomEvent('ui:clearHover')
      window.dispatchEvent(event)
    }, []),

    triggerUISceneModified: useCallback(() => {
      const event = new CustomEvent('ui:sceneModified')
      window.dispatchEvent(event)
    }, [])
  }
}

/**
 * Hook for UI components to listen to R3F scene changes
 */
export const useR3FSceneListener = () => {
  const [sceneState, setSceneState] = useState({
    selectedObject: null as any,
    hoveredObject: null as any,
    objects: [] as any[],
    objectInstances: [] as any[],
    objectCount: 0,
    objectInstanceCount: 0
  })

  useEffect(() => {
    const handleSelectionChange = (event: CustomEvent) => {
      setSceneState(prev => ({
        ...prev,
        selectedObject: event.detail.selectedObject
      }))
    }

    const handleHoverChange = (event: CustomEvent) => {
      setSceneState(prev => ({
        ...prev,
        hoveredObject: event.detail.hoveredObject
      }))
    }

    const handleSceneDataChange = (event: CustomEvent) => {
      setSceneState(prev => ({
        ...prev,
        objects: event.detail.objects,
        objectInstances: event.detail.objectInstances,
        objectCount: event.detail.objectCount,
        objectInstanceCount: event.detail.objectInstanceCount
      }))
    }

    window.addEventListener('r3f:selectionChanged', handleSelectionChange as EventListener)
    window.addEventListener('r3f:hoverChanged', handleHoverChange as EventListener)
    window.addEventListener('r3f:sceneDataChanged', handleSceneDataChange as EventListener)

    return () => {
      window.removeEventListener('r3f:selectionChanged', handleSelectionChange as EventListener)
      window.removeEventListener('r3f:hoverChanged', handleHoverChange as EventListener)
      window.removeEventListener('r3f:sceneDataChanged', handleSceneDataChange as EventListener)
    }
  }, [])

  return sceneState
}

/**
 * Real-time sync hook that ensures immediate updates between UI and 3D scene
 */
export const useRealTimeSync = () => {
  const store = useSceneStore()

  // Subscribe to store changes and immediately dispatch UI events
  useEffect(() => {
    const unsubscribe = useSceneStore.subscribe((state) => {
      // Dispatch real-time updates
      const event = new CustomEvent('r3f:realTimeUpdate', {
        detail: {
          objects: state.objects,
          objectInstances: state.objectInstances,
          selectedObject: state.selectedObject,
          hoveredObject: state.hoveredObject,
          viewMode: state.viewMode,
          renderMode: state.renderMode,
          transformMode: state.transformMode,
          gridVisible: state.gridVisible
        }
      })
      window.dispatchEvent(event)
    })

    return unsubscribe
  }, [])

  return {
    // Force sync function for manual synchronization
    forceSync: useCallback(() => {
      const state = store.getState()
      const event = new CustomEvent('r3f:forceSync', {
        detail: state
      })
      window.dispatchEvent(event)
    }, [store])
  }
}
