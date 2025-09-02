import React from 'react'
import { clamp } from '@/shared/lib/math/number'
import { objectPanelLayoutStore } from '../model/panelLayoutStore'

export type ResizeSide = 'left' | 'right' | null

/**
 * Хук раскладки панелей ObjectEditor (левая/правая панель и их размеры).
 *
 * Отвечает за:
 * - хранение и изменение размеров панелей через persist‑хранилище VisualSettingsStore;
 * - расчёт ограничений при ресайзе и обработку событий мыши;
 * - однократную первичную инициализацию значений на основе ширины окна.
 */
export function useObjectPanelLayout() {
  const leftPanelWidthPx = objectPanelLayoutStore.useLeftPanelWidthPx()
  const rightPanelWidthPx = objectPanelLayoutStore.useRightPanelWidthPx()
  const setLeftPanelWidthPx = objectPanelLayoutStore.useSetLeftPanelWidthPx()
  const setRightPanelWidthPx = objectPanelLayoutStore.useSetRightPanelWidthPx()

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [resizingSide, setResizingSide] = React.useState<ResizeSide>(null)
  const [containerBounds, setContainerBounds] = React.useState<{ left: number; right: number } | null>(null)

  // Ограничение ширины панелей при ресайзе берём из общего math‑утилити

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingSide || !containerBounds) return

      const minLeft = 260
      const maxLeft = Math.min(window.innerWidth * 0.5, 820)
      const minRight = 240
      const maxRight = Math.min(window.innerWidth * 0.4, 520)

      if (resizingSide === 'left') {
        const newWidth = clamp(e.clientX - containerBounds.left, minLeft, maxLeft)
        setLeftPanelWidthPx(newWidth)
      } else if (resizingSide === 'right') {
        const newWidth = clamp(containerBounds.right - e.clientX, minRight, maxRight)
        setRightPanelWidthPx(newWidth)
      }
    }

    const handleMouseUp = () => setResizingSide(null)

    if (resizingSide) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizingSide, containerBounds, setLeftPanelWidthPx, setRightPanelWidthPx])

  React.useEffect(() => {
    const inited = objectPanelLayoutStore.getLayoutInitialized()
    if (inited) return
    try {
      const width = window.innerWidth
      if (width <= 1280) {
        setLeftPanelWidthPx(280)
        setRightPanelWidthPx(240)
      } else if (width <= 1440) {
        setLeftPanelWidthPx(300)
        setRightPanelWidthPx(260)
      } else {
        setLeftPanelWidthPx(360)
        setRightPanelWidthPx(320)
      }
    } catch (_) {
      // ignore SSR / env issues
    }
    objectPanelLayoutStore.markLayoutInitialized()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Начать перетаскивание разделителя для изменения ширины панели.
   * @param side Сторона панели: 'left' | 'right'
   */
  const beginResize = (side: 'left' | 'right') => (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setContainerBounds({ left: rect.left, right: rect.right })
    setResizingSide(side)
    e.preventDefault()
    e.stopPropagation()
  }

  return {
    // размеры
    leftPanelWidthPx,
    rightPanelWidthPx,
    setLeftPanelWidthPx,
    setRightPanelWidthPx,

    // тех. состояние
    containerRef,
    resizingSide,
    beginResize,
  }
}
