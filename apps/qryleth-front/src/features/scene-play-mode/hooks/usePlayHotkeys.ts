import { useEffect } from 'react'
import type { UiMode } from '@/shared/types/ui'

/**
 * Хук горячих клавиш Play‑режима (без привязки к стору).
 *
 * Ответственность:
 * - В режиме Play обрабатывает только клавиши камер: '1' Orbit, '2' Walk, '3' Fly, '4' Flyover.
 * - Обрабатывает Esc для выхода из Play (через переданный колбэк onExitPlay).
 * - Игнорирует ввод в текстовых полях/CodeMirror, а также во время drag‑resize (по курсору col-resize).
 *
 * Важное замечание: глобальный переключатель Play по клавише 'P' остаётся в общем
 * хуке редактора (scene/useKeyboardShortcuts), чтобы работать в любом uiMode.
 */
export function usePlayHotkeys(params: {
  uiMode: UiMode
  onExitPlay: () => void
  onSetViewMode: (mode: 'orbit' | 'walk' | 'fly' | 'flyover') => void
}) {
  const { uiMode, onExitPlay, onSetViewMode } = params

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Только для режима Play
      if ((uiMode as any) !== 'play') return

      // Пропускаем ввод в текстовых полях
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      const target = event.target as HTMLElement
      if (target && (target.classList?.contains('cm-editor') || target.closest?.('.cm-editor'))) return

      // Во время ресайза панелей не обрабатываем
      try {
        if (document?.body?.style?.cursor && document.body.style.cursor.includes('col-resize')) return
      } catch {}

      switch (event.key) {
        case '1':
          event.preventDefault(); onSetViewMode('orbit'); return
        case '2':
          event.preventDefault(); onSetViewMode('walk'); return
        case '3':
          event.preventDefault(); onSetViewMode('fly'); return
        case '4':
          event.preventDefault(); onSetViewMode('flyover'); return
        case 'Escape':
        case 'esc':
        case 'EscapeLeft':
          event.preventDefault(); onExitPlay(); return
        default:
          return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [uiMode, onExitPlay, onSetViewMode])
}

