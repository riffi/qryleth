import React from 'react'
import { clamp } from '@/shared/lib/math/number'
import { sceneLayoutStore } from '../model/panelLayoutStore'

export type ResizeSide = 'left' | 'right' | null

/**
 * Хук управления раскладкой панелей редактора сцены (левая/центральная/правая).
 *
 * Отвечает за:
 * - состояние свёрнутости левой панели (чат/скриптинг) и правой панели (менеджер объектов);
 * - текущие ширины панелей и их изменение перетаскиванием разделителей;
 * - одноразовую адаптацию стартовых размеров под ширину окна на первом запуске.
 *
 * Внутри использует persist‑store визуальных настроек, но наружу предоставляет
 * удобное API фичи `scene-layout` — это позволяет в будущем заменить реализацию
 * без изменения потребителей.
 */
export function useScenePanelLayout() {
  // Состояние панелей из стора визуальных настроек (через фасад фичи)
  const chatCollapsed = sceneLayoutStore.useChatCollapsed()
  const setChatCollapsed = sceneLayoutStore.useSetChatCollapsed()
  const scriptingPanelVisible = sceneLayoutStore.useScriptingVisible()
  const setScriptingPanelVisible = sceneLayoutStore.useSetScriptingVisible()
  const objectPanelCollapsed = sceneLayoutStore.useObjectPanelCollapsed()
  const setObjectPanelCollapsed = sceneLayoutStore.useSetObjectPanelCollapsed()
  const leftPanelWidthPx = sceneLayoutStore.useLeftPanelWidthPx()
  const rightPanelWidthPx = sceneLayoutStore.useRightPanelWidthPx()
  const setLeftPanelWidthPx = sceneLayoutStore.useSetLeftPanelWidthPx()
  const setRightPanelWidthPx = sceneLayoutStore.useSetRightPanelWidthPx()

  // Внутренние вспомогательные состояния для перетаскивания разделителей
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [resizingSide, setResizingSide] = React.useState<ResizeSide>(null)
  const [containerBounds, setContainerBounds] = React.useState<{ left: number; right: number } | null>(null)

  // Универсальная функция ограничения диапазона из shared

  /**
   * Обработчики движения мыши во время перетаскивания разделителей панелей.
   * Реализуют ограничения по минимальным/максимальным ширинам и адаптацию под ширину экрана.
   */
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingSide || !containerBounds) return

      const minLeft = 220
      const maxLeft = objectPanelCollapsed
        ? window.innerWidth * 0.5
        : scriptingPanelVisible
          ? Math.min(window.innerWidth * 0.48, 820)
          : Math.min(window.innerWidth * 0.32, 480)
      const minRight = 200
      const maxRight = Math.min(window.innerWidth * 0.36, 520)

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
  }, [resizingSide, containerBounds, scriptingPanelVisible, objectPanelCollapsed, setLeftPanelWidthPx, setRightPanelWidthPx])

  /**
   * Одноразовая адаптация стартовых размеров панелей под ширину устройства/экрана.
   * Выполняется один раз на устройстве и помечается через persist‑стор, чтобы не
   * перетирать пользовательские настройки при последующих маунтах.
   */
  React.useEffect(() => {
    const isInitialized = sceneLayoutStore.getLayoutInitialized()
    if (isInitialized) return
    try {
      const width = window.innerWidth

      if (width <= 1280) {
        setChatCollapsed(true)
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
      // безопасно игнорируем в не‑браузерных окружениях
    }
    sceneLayoutStore.markLayoutInitialized()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Начать перетаскивание разделителя.
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
    // Флаги панелей
    chatCollapsed,
    setChatCollapsed,
    scriptingPanelVisible,
    setScriptingPanelVisible,
    objectPanelCollapsed,
    setObjectPanelCollapsed,

    // Размеры панелей
    leftPanelWidthPx,
    rightPanelWidthPx,
    setLeftPanelWidthPx,
    setRightPanelWidthPx,

    // Ресайз
    containerRef,
    resizingSide,
    beginResize,
  }
}
