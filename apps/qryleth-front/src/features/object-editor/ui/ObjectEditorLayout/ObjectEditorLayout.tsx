import React, { useEffect, useRef, useState } from 'react'
import { Box, Container, Paper } from '@mantine/core'
import { ObjectScene3D } from '../renderer/ObjectScene3D'
import { PrimitiveControlPanel } from '../PrimitiveControlPanel/PrimitiveControlPanel'
import { GroupControlPanel } from '../GroupControlPanel/GroupControlPanel'
import { MaterialControlPanel } from '../MaterialControlPanel/MaterialControlPanel'
import { ObjectManagementPanel } from '../ObjectManagementPanel/ObjectManagementPanel'
import { usePanelState } from '../PanelToggleButtons/hooks/usePanelState'
import { DragHandleVertical } from '@/shared/ui'
import {
  useSelectedMaterialUuid,
  useSelectedGroupUuids,
  useSelectedItemType
} from '../../model/objectStore'
import type { GfxObject } from '@/entities/object'

interface ObjectEditorLayoutProps {
  objectData?: GfxObject
  children?: React.ReactNode
  /** Дополнительные элементы управления в header */
  headerControls?: React.ReactNode
  /** Компонент чата для левой панели */
  chatComponent?: React.ReactNode
  /** Внешнее управление состоянием панелей (для интеграции с page/modal header) */
  externalPanelState?: {
    panelState: any
    togglePanel: (panel: any) => void
    showPanel: (panel: any) => void
  }
  /** Скрыть внутренний заголовок (для модального режима) */
  hideHeader?: boolean
}

/**
 * Layout для редактора объектов с поддержкой переключаемых панелей.
 * Реализует логику взаимоисключающих левых панелей (чат vs свойства).
 */
export const ObjectEditorLayout: React.FC<ObjectEditorLayoutProps> = ({
  objectData,
  children,
  headerControls,
  chatComponent,
  externalPanelState,
  hideHeader = false
}) => {
  // Состояние и ссылки для управления ресайзом панелей
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [leftPanelWidthPx, setLeftPanelWidthPx] = useState<number>(400)
  const [rightPanelWidthPx, setRightPanelWidthPx] = useState<number>(350)
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null)
  const [containerBounds, setContainerBounds] = useState<{ left: number; right: number } | null>(null)

  /**
   * Ограничивает значение value в пределах [min, max].
   */
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

  /**
   * Обработчик движения мыши во время ресайза: вычисляет и применяет новую ширину панели.
   */
  useEffect(() => {
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
  }, [resizingSide, containerBounds])

  /**
   * Инициализирует начало ресайза выбранной панели, сохраняя границы контейнера.
   */
  const beginResize = (side: 'left' | 'right') => (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setContainerBounds({ left: rect.left, right: rect.right })
    setResizingSide(side)
    e.preventDefault()
    e.stopPropagation()
  }
  const selectedMaterialUuid = useSelectedMaterialUuid()
  const selectedGroupUuids = useSelectedGroupUuids()
  const selectedItemType = useSelectedItemType()
  const internalPanelState = usePanelState()

  // Используем внешнее состояние панелей если передано, иначе внутреннее
  const { panelState, showPanel } = externalPanelState || internalPanelState

  // Автоматическое переключение на свойства при выборе примитива/материала/группы
  useEffect(() => {
    if ((selectedMaterialUuid || selectedGroupUuids.length > 0) && panelState.leftPanel === 'chat') {
      showPanel('properties')
    }
  }, [selectedMaterialUuid, selectedGroupUuids.length, panelState.leftPanel, showPanel])

  const renderLeftPanel = () => {
    if (!panelState.leftPanel) return null

    if (panelState.leftPanel === 'chat' && chatComponent) {
      return (
        <Paper
          shadow="sm"
          radius="md"
          style={{
            width: `${leftPanelWidthPx}px`,
            height: '100%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: resizingSide ? undefined : 'width 160ms ease'
          }}
        >
          {chatComponent}
        </Paper>
      )
    }

    if (panelState.leftPanel === 'properties') {
      return (
        <Paper
          shadow="sm"
          radius="md"
          style={{
            width: `${leftPanelWidthPx}px`,
            height: '100%',
            flexShrink: 0,
            overflow: 'hidden',
            transition: resizingSide ? undefined : 'width 160ms ease'
          }}
        >
          {selectedMaterialUuid ? (
            <MaterialControlPanel />
          ) : selectedItemType === 'group' && selectedGroupUuids.length === 1 ? (
            <GroupControlPanel />
          ) : (
            <PrimitiveControlPanel />
          )}
        </Paper>
      )
    }

    return null
  }

  const renderRightPanel = () => {
    if (!panelState.rightPanel || panelState.rightPanel !== 'manager') {
      return null
    }

    return (
      <Paper
        shadow="sm"
        radius="md"
        style={{
          width: `${rightPanelWidthPx}px`,
          flexShrink: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: resizingSide ? undefined : 'width 160ms ease'
        }}
      >
        <ObjectManagementPanel />
      </Paper>
    )
  }

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      <Container
        size="xl"
        fluid
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          gap: 6,
          height: '100%',
          overflow: 'hidden',
          flex: 1
        }}
      >
        {renderLeftPanel()}

        {/* Ручка между левой панелью и центром */}
        {panelState.leftPanel && (
          <DragHandleVertical onMouseDown={beginResize('left')} ariaLabel="Изменить ширину левой панели" />
        )}

        <Paper
          shadow="sm"
          radius="md"
          style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 400 }}
        >
          {children || <ObjectScene3D />}
        </Paper>

        {/* Ручка между центром и правой панелью */}
        {panelState.rightPanel === 'manager' && (
          <DragHandleVertical onMouseDown={beginResize('right')} ariaLabel="Изменить ширину правой панели" />
        )}

        {renderRightPanel()}
      </Container>
    </Box>
  )
}
