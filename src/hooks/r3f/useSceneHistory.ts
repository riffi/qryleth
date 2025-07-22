import { useCallback, useEffect } from 'react'
import { useSceneStore } from '@/features/scene/model/sceneStore.ts'
import type { UseSceneHistoryReturn } from '@/features/scene/model/view-types'

export const useSceneHistory = (): UseSceneHistoryReturn => {
  const undo = useSceneStore(state => state.undo)
  const redo = useSceneStore(state => state.redo)
  const canUndo = useSceneStore(state => state.canUndo())
  const canRedo = useSceneStore(state => state.canRedo())
  const saveToHistory = useSceneStore(state => state.saveToHistory)

  // Debounced save to history to prevent excessive saves
  const debouncedSaveToHistory = useCallback(() => {
    const timeoutId = setTimeout(() => {
      saveToHistory()
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [saveToHistory])

  // Global keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if not typing in input fields
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'z':
            event.preventDefault()
            if (event.shiftKey) {
              // Ctrl+Shift+Z = Redo
              if (canRedo) redo()
            } else {
              // Ctrl+Z = Undo
              if (canUndo) undo()
            }
            break
          case 'y':
            // Ctrl+Y = Redo (alternative)
            event.preventDefault()
            if (canRedo) redo()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [undo, redo, canUndo, canRedo])

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    saveToHistory: debouncedSaveToHistory
  }
}
