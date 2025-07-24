import { useEffect } from 'react'
import { useObjectStore } from '../../model/objectStore'

/**
 * React-хук обрабатывает горячие клавиши в редакторе объекта.
 * При нажатии Ctrl+A выделяет все примитивы.
 */
export const useOEKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Игнорируем ввод в текстовых полях
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      // Ctrl+A / Cmd+A — выбрать все примитивы
      if ((event.ctrlKey || event.metaKey) && ((event.key.toLowerCase() === 'a') || (event.key.toLowerCase() === 'ф'))) {
        event.preventDefault()
        const state = useObjectStore.getState()
        const count = state.primitives.length
        const indices = Array.from({ length: count }, (_, i) => i)
        state.setSelectedPrimitives(indices)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}
