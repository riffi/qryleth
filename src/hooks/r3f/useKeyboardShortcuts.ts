import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../../features/scene/store/sceneStore'
import * as THREE from 'three'

export const useKeyboardShortcuts = () => {
  const { camera } = useThree()
  const selectedObject = useSceneStore(state => state.selectedObject)
  const objectInstances = useSceneStore(state => state.objectInstances)
  const updateObjectInstance = useSceneStore(state => state.updateObjectInstance)
  const markSceneAsModified = useSceneStore(state => state.markSceneAsModified)
  const saveToHistory = useSceneStore(state => state.saveToHistory)
  const clearSelection = useSceneStore(state => state.clearSelection)
  const setTransformMode = useSceneStore(state => state.setTransformMode)
  const undo = useSceneStore(state => state.undo)
  const redo = useSceneStore(state => state.redo)
  const canUndo = useSceneStore(state => state.canUndo)
  const canRedo = useSceneStore(state => state.canRedo)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent handling if typing in input fields
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement) {
        return
      }

      // Handle Ctrl/Cmd combinations first
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'z':
            event.preventDefault()
            if (event.shiftKey) {
              // Ctrl+Shift+Z = Redo
              if (canRedo()) redo()
            } else {
              // Ctrl+Z = Undo
              if (canUndo()) undo()
            }
            return
          case 'y':
            // Ctrl+Y = Redo (alternative)
            event.preventDefault()
            if (canRedo()) redo()
            return
        }
      }

      // Transform mode shortcuts
      switch (event.key.toLowerCase()) {
        case 'g':
          event.preventDefault()
          setTransformMode('translate')
          break
        case 'r':
          event.preventDefault()
          setTransformMode('rotate')
          break
        case 's':
          event.preventDefault()
          setTransformMode('scale')
          break
        case 'escape':
          event.preventDefault()
          clearSelection()
          break
      }

      // Object movement shortcuts (only if object is selected)
      if (!selectedObject || selectedObject.objectInstanceIndex === undefined) return

      const objectInstance = objectInstances[selectedObject.objectInstanceIndex]
      if (!objectInstance) return

      const moveAmount = 0.5
      const scaleAmount = 0.1
      let needsUpdate = false
      const newObjectInstance = { ...objectInstance }

      // Calculate camera-relative movement vectors
      const forward = new THREE.Vector3()
      const right = new THREE.Vector3()
      const up = new THREE.Vector3(0, 1, 0)

      camera.getWorldDirection(forward)
      forward.y = 0 // Keep movement on XZ plane
      forward.normalize()
      right.crossVectors(up, forward)
      right.normalize()

      switch (event.key.toLowerCase()) {
        // Movement shortcuts
        case 'arrowup':
        case 'w':
          if (event.shiftKey) {
            // Move forward relative to camera
            const movement = forward.multiplyScalar(moveAmount)
            newObjectInstance.transform = {
              ...objectInstance.transform,
              position: [
                (objectInstance.transform?.position?.[0] || 0) + movement.x,
                (objectInstance.transform?.position?.[1] || 0) + movement.y,
                (objectInstance.transform?.position?.[2] || 0) + movement.z
              ]
            }
          } else {
            // Move up (Y axis)
            newObjectInstance.transform = {
              ...objectInstance.transform,
              position: [
                objectInstance.transform?.position?.[0] || 0,
                (objectInstance.transform?.position?.[1] || 0) + moveAmount,
                objectInstance.transform?.position?.[2] || 0
              ]
            }
          }
          needsUpdate = true
          break

        case 'arrowdown':
        case 's':
          if (event.shiftKey) {
            // Move backward relative to camera
            const movement = forward.multiplyScalar(-moveAmount)
            newObjectInstance.transform = {
              ...objectInstance.transform,
              position: [
                (objectInstance.transform?.position?.[0] || 0) + movement.x,
                (objectInstance.transform?.position?.[1] || 0) + movement.y,
                (objectInstance.transform?.position?.[2] || 0) + movement.z
              ]
            }
          } else {
            // Move down (Y axis)
            newObjectInstance.transform = {
              ...objectInstance.transform,
              position: [
                objectInstance.transform?.position?.[0] || 0,
                (objectInstance.transform?.position?.[1] || 0) - moveAmount,
                objectInstance.transform?.position?.[2] || 0
              ]
            }
          }
          needsUpdate = true
          break

        case 'arrowleft':
        case 'a':
          if (!event.shiftKey) {
            // Move left relative to camera
            const movement = right.multiplyScalar(moveAmount)
            newObjectInstance.transform = {
              ...objectInstance.transform,
              position: [
                (objectInstance.transform?.position?.[0] || 0) + movement.x,
                (objectInstance.transform?.position?.[1] || 0) + movement.y,
                (objectInstance.transform?.position?.[2] || 0) + movement.z
              ]
            }
            needsUpdate = true
          }
          break

        case 'arrowright':
        case 'd':
          if (!event.shiftKey) {
            // Move right relative to camera
            const movement = right.multiplyScalar(-moveAmount)
            newObjectInstance.transform = {
              ...objectInstance.transform,
              position: [
                (objectInstance.transform?.position?.[0] || 0) + movement.x,
                (objectInstance.transform?.position?.[1] || 0) + movement.y,
                (objectInstance.transform?.position?.[2] || 0) + movement.z
              ]
            }
            needsUpdate = true
          }
          break

        // Scaling shortcuts
        case '+':
        case '=':
          const currentScale = objectInstance.transform?.scale || [1, 1, 1]
          const newScaleUp = currentScale.map(s => Math.max(0.1, s * (1 + scaleAmount)))
          newObjectInstance.transform = {
            ...objectInstance.transform,
            scale: newScaleUp as [number, number, number]
          }
          needsUpdate = true
          break

        case '-':
        case '_':
          const currentScaleDown = objectInstance.transform?.scale || [1, 1, 1]
          const newScaleDown = currentScaleDown.map(s => Math.max(0.1, s * (1 - scaleAmount)))
          newObjectInstance.transform = {
            ...objectInstance.transform,
            scale: newScaleDown as [number, number, number]
          }
          needsUpdate = true
          break
      }

      if (needsUpdate) {
        event.preventDefault()
        updateObjectInstance(selectedObject.objectInstanceIndex, newObjectInstance)
        markSceneAsModified()
        saveToHistory()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    selectedObject,
    objectInstances,
    updateObjectInstance,
    markSceneAsModified,
    saveToHistory,
    clearSelection,
    setTransformMode,
    undo,
    redo,
    canUndo,
    canRedo,
    camera
  ])
}
