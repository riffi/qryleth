import { useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../../features/scene/store/sceneStore'
import type { UseSceneEventsReturn, SceneClickEvent } from '../../entities/r3f/types'

export const useSceneEvents = (): UseSceneEventsReturn => {
  const { gl } = useThree()
  const selectObject = useSceneStore(state => state.selectObject)
  const clearSelection = useSceneStore(state => state.clearSelection)
  const setHoveredObject = useSceneStore(state => state.setHoveredObject)
  const clearHover = useSceneStore(state => state.clearHover)
  const viewMode = useSceneStore(state => state.viewMode)

  const handleClick = useCallback((event: any) => {
    // Prevent event if in walk/fly mode (should lock pointer instead)
    if ((viewMode === 'walk' || viewMode === 'fly') && event.object.parent?.type !== 'Scene') {
      return
    }

    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation()
    }

    // Check if clicked object has generated userData
    let clickedObject = event.object
    while (clickedObject && !clickedObject.userData.generated) {
      clickedObject = clickedObject.parent
    }

    if (clickedObject?.userData.generated) {
      const objectUuid = clickedObject.userData.objectUuid
      const placementUuid = clickedObject.userData.placementUuid
      const instanceId = `${objectUuid}-${placementUuid}`

      const clickEvent: SceneClickEvent = {
        objectUuid,
        instanceId,
        placementIndex: clickedObject.userData.placementIndex,
        point: event.point ? [event.point.x, event.point.y, event.point.z] : [0, 0, 0],
        object: clickedObject
      }

      selectObject(objectUuid, instanceId)
    } else {
      clearSelection()
    }
  }, [selectObject, clearSelection, viewMode])

  const handlePointerOver = useCallback((event: any) => {
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation()
    }

    // Find the top-level generated object
    let hoveredObject = event.object
    while (hoveredObject && !hoveredObject.userData.generated) {
      hoveredObject = hoveredObject.parent
    }

    if (hoveredObject?.userData.generated) {
      const objectUuid = hoveredObject.userData.objectUuid
      const placementUuid = hoveredObject.userData.placementUuid
      const instanceId = `${objectUuid}-${placementUuid}`

      setHoveredObject(objectUuid, instanceId)

      // Change cursor to pointer
      if (gl.domElement.style.cursor !== 'pointer') {
        gl.domElement.style.cursor = 'pointer'
      }
    }
  }, [setHoveredObject, gl])

  const handlePointerOut = useCallback((event: any) => {
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation()
    }
    clearHover()

    // Reset cursor
    if (gl.domElement.style.cursor === 'pointer') {
      gl.domElement.style.cursor = 'auto'
    }
  }, [clearHover, gl])

  // Handle keyboard events for selection clearing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearSelection()
        clearHover()
      }
    }

    // Focus the canvas element to receive keyboard events
    gl.domElement.tabIndex = 0
    gl.domElement.style.outline = 'none'

    gl.domElement.addEventListener('keydown', handleKeyDown)

    return () => {
      gl.domElement.removeEventListener('keydown', handleKeyDown)
    }
  }, [clearSelection, clearHover, gl])

  return {
    handleClick,
    handlePointerOver,
    handlePointerOut
  }
}
