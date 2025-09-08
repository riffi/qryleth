import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { UiMode, ViewModeEnum } from '@/shared/types/ui'
import * as THREE from 'three'

/**
 * Хук глобальных горячих клавиш сцены.
 *
 * Поведение:
 * - Всегда: клавиша 'P' переключает Play-режим (Edit ↔ Play).
 * - В Play: разрешены только Esc (выход из Play) и '1'/'2'/'3' для смены камеры (Orbit/Walk/Fly);
 *   все прочие хоткеи редактора отключены.
 * - В Edit: доступны хоткеи редактора (undo/redo, смена режима трансформаций, перемещение/масштаб).
 * - Игнорирует ввод в текстовых полях/CodeMirror и во время drag-resize (эвристика по курсору).
 * - При выходе из Play освобождает pointer lock (если активен Walk/Fly).
 */
export const useKeyboardShortcuts = () => {
  const { camera } = useThree()
  const ignoreNextPointerUnlock = useRef(false)
  const selectedObject = useSceneStore(state => state.selectedObject)
  const objectInstances = useSceneStore(state => state.objectInstances)
  const updateObjectInstance = useSceneStore(state => state.updateObjectInstance)
  const clearSelection = useSceneStore(state => state.clearSelection)
  const setTransformMode = useSceneStore(state => state.setTransformMode)
  const undo = useSceneStore(state => state.undo)
  const redo = useSceneStore(state => state.redo)
  const canUndo = useSceneStore(state => state.canUndo)
  const canRedo = useSceneStore(state => state.canRedo)
  const uiMode = useSceneStore(state => state.uiMode)
  const togglePlay = useSceneStore(state => state.togglePlay)
  const setViewMode = useSceneStore(state => state.setViewMode)

  useEffect(() => {
    /**
     * Обработчик нажатий клавиш в режиме редактирования сцены.
     *
     * Назначение:
     * - Игнорирует ввод в полях ввода и CodeMirror, а также во время перетаскивания ресайзера лэйаута.
     * - Обрабатывает глобальный переключатель Play (клавиша 'P') в любом режиме UI.
     * - Включает базовые хоткеи редактирования: Undo/Redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y),
     *   смена режима трансформации (G/R/S), перемещение выбранного объекта относительно камеры или по оси Y.
     * - Явно НЕ обрабатывает хоткеи масштабирования через '+' и '-' — они удалены, чтобы не конфликтовать
     *   с управлением скоростью полёта в Play-режиме. Масштабирование выполняется через режим 'Scale' и гизмо.
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent handling if typing in input fields
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement) {
        return
      }

      // Prevent handling if typing in CodeMirror editor
      const target = event.target as HTMLElement
      if (target && (
        target.classList.contains('cm-editor') ||
        target.closest('.cm-editor') ||
        target.classList.contains('cm-content') ||
        target.closest('.cm-content')
      )) {
        return
      }

      // Ignore toggles during layout drag-resize (simple heuristic)
      try {
        if (document?.body?.style?.cursor && document.body.style.cursor.includes('col-resize')) {
          return
        }
      } catch {}

      // Global Play toggle (работает в любом uiMode)
      if (!event.ctrlKey && !event.metaKey) {
        const key = event.key.toLowerCase()
        if (key === 'p') {
          event.preventDefault()
          const wasPlay = uiMode === UiMode.Play
          togglePlay()
          // При выходе из Play освобождаем pointer lock
          if (wasPlay && typeof document !== 'undefined' && document.exitPointerLock) {
            try { ignoreNextPointerUnlock.current = true; document.exitPointerLock() } catch {}
          }
          return
        }
        // Esc в Play теперь обрабатывается в scene-play-mode/usePlayHotkeys
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

      // Горячие клавиши камер в Play вынесены в scene-play-mode/usePlayHotkeys

      // Transform mode shortcuts (Edit mode)
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
      if (!selectedObject || !selectedObject.instanceUuid) return

      const objectInstance = objectInstances.find(
        inst => inst.uuid === selectedObject.instanceUuid
      )
      if (!objectInstance) return

  const moveAmount = 0.5
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

      //
      // ВАЖНО: хоткеи изменения масштаба инстанса через '+' и '-' УДАЛЕНЫ,
      // чтобы не конфликтовать с регулировкой скорости полёта камеры в Play-режиме.
      // Масштабирование доступно через режим трансформации 'scale' (клавиша 'S') и гизмо.
      //
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

        // Прямые хоткеи масштабирования ('+', '-') удалены — см. комментарий выше
      }

      if (needsUpdate) {
        event.preventDefault()
        updateObjectInstance(selectedObject.instanceUuid, newObjectInstance)
        // updateObjectInstance уже сохраняет историю и помечает сцену изменённой
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    /**
     * Обработчик изменения состояния pointer lock.
     *
     * Назначение:
     * - При неявном выходе из pointer lock в Play-режиме (Walk/Fly) возвращает камеру в Orbit
     *   и переключает UI обратно в Edit, если это не был управляемый выход после нажатия 'P'.
     */
    const handlePointerLockChange = () => {
      try {
        const locked = !!document.pointerLockElement
        if (!locked) {
          if (ignoreNextPointerUnlock.current) {
            ignoreNextPointerUnlock.current = false
            return
          }
          const state = useSceneStore.getState()
          if (state.uiMode === UiMode.Play && (state.viewMode === 'walk' || state.viewMode === 'fly')) {
            try { state.setViewMode('orbit') } catch {}
            state.togglePlay()
          }
        }
      } catch {}
    }
    document.addEventListener('pointerlockchange', handlePointerLockChange)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [
    selectedObject,
    objectInstances,
    updateObjectInstance,
    clearSelection,
    setTransformMode,
    undo,
    redo,
    canUndo,
    canRedo,
    camera,
    uiMode,
    togglePlay,
    setViewMode
  ])
}
