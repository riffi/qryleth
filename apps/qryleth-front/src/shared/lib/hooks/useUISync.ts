import { useEffect, useCallback, useState } from 'react'

/** Интерфейс параметров синхронизации UI и сцены */
export interface UISyncParams<State> {
  /** Текущий список объектов сцены */
  objects: any[]
  /** Экземпляры объектов на сцене */
  objectInstances: any[]
  /** Выделенный пользователем объект */
  selectedObject: any
  /** Объект под курсором */
  hoveredObject: any
  /** Набор действий для работы со сценой */
  actions: {
    selectObject: (objectIndex: number, instanceId?: string) => void
    clearSelection: () => void
    setHoveredObject: (objectIndex: number, instanceId?: string) => void
    clearHover: () => void
    markSceneAsModified: () => void
  }
}

/**
 * Хук для синхронизации состояния UI и трехмерной сцены.
 * Обеспечивает двусторонний обмен событиями между компонентами интерфейса и R3F-сценой.
 */
export const useUISync = ({
  objects,
  objectInstances,
  selectedObject,
  hoveredObject,
  actions
}: UISyncParams<any>) => {
  const {
    selectObject,
    clearSelection,
    setHoveredObject,
    clearHover,
    markSceneAsModified
  } = actions

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
export interface RealTimeSyncStore<State> {
  /** Подписка на изменения состояния */
  subscribe: (listener: (state: State, prevState: State) => void) => () => void
  /** Получить текущее состояние */
  getState: () => State
}

/**
 * Хук для трансляции изменений store в R3F-сцену в реальном времени.
 */
export const useRealTimeSync = <State,>(store: RealTimeSyncStore<State>) => {

  // Подписываемся на изменения хранилища и транслируем их в UI
  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
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
  }, [store])

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
