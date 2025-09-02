import React, { useEffect, useRef, useState } from 'react'
import { Box, Container, Paper } from '@mantine/core'
import { DragHandleVertical } from '@/shared/ui'
import {
  useSelectedMaterialUuid,
  useSelectedGroupUuids,
  useSelectedItemType
} from '@/features/editor/object/model/objectStore'
import { useObjectSelectedPrimitiveIds } from '@/features/editor/object/model/objectStore'
import type { GfxObject } from '@/entities/object'
import { useObjectPanelLayout } from '@/features/object-layout/hooks/useObjectPanelLayout'
import { ObjectScene3D } from '@/features/editor/object/ui/renderer/ObjectScene3D'
import { PrimitiveControlPanel } from '@/features/editor/object/ui/PrimitiveControlPanel/PrimitiveControlPanel'
import { GroupControlPanel } from '@/features/editor/object/ui/GroupControlPanel/GroupControlPanel'
import { MaterialControlPanel } from '@/features/editor/object/ui/MaterialControlPanel/MaterialControlPanel'
import { ObjectManagementPanel } from '@/features/editor/object/ui/ObjectManagementPanel/ObjectManagementPanel'
import { usePanelState } from '@/features/editor/object/ui/PanelToggleButtons/hooks/usePanelState'

interface ObjectEditorLayoutProps {
  /** Данные редактируемого объекта (для контекста и будущих расширений). */
  objectData?: GfxObject
  /** Вёрстка центральной области: обычно 3D‑сцена редактора объекта. */
  children?: React.ReactNode
  /** Дополнительные элементы управления в заголовке (если он показан). */
  headerControls?: React.ReactNode
  /** Компонент чата для левой панели (взаимоисключается со свойствами). */
  chatComponent?: React.ReactNode
  /** Внешнее состояние панелей (для интеграции со страницей/виджетом). */
  externalPanelState?: {
    panelState: any
    togglePanel: (panel: any) => void
    showPanel: (panel: any) => void
  }
  /** Скрыть внутренний заголовок (для встроенного режима). */
  hideHeader?: boolean
}

/**
 * Компоновщик ObjectEditor с поддержкой переключаемых панелей и ресайза.
 *
 * Ответственность компонента:
 * - Управление левой панелью (чат или свойства) и правой панелью (менеджер).
 * - Ресайз панелей с сохранением размеров в persist‑хранилище (object-layout).
 * - Встраивание 3D‑сцены (children) между панелями.
 */
export const ObjectEditorLayout: React.FC<ObjectEditorLayoutProps> = ({
  objectData,
  children,
  headerControls,
  chatComponent,
  externalPanelState,
  hideHeader = false,
}) => {
  // Persist‑раскладка ObjectEditor (инициализация и сеттеры ширин панелей)
  const layout = useObjectPanelLayout()

  // Ссылки и локальное состояние для интерактивного ресайза
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [leftPanelWidthPx, setLeftPanelWidthPx] = useState<number>(400)
  const [rightPanelWidthPx, setRightPanelWidthPx] = useState<number>(350)
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null)
  const [containerBounds, setContainerBounds] = useState<{ left: number; right: number } | null>(null)

  /**
   * Возвращает значение, ограниченное диапазоном [min, max].
   * Используется для предотвращения слишком маленьких/больших панелей при ресайзе.
   */
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

  /**
   * Обработчики мыши для режима ресайза: пересчитывают ширину соответствующей панели
   * на основании положения курсора и границ контейнера, обновляют persist‑значения.
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
        layout.setLeftPanelWidthPx(newWidth)
        setLeftPanelWidthPx(newWidth)
      } else if (resizingSide === 'right') {
        const newWidth = clamp(containerBounds.right - e.clientX, minRight, maxRight)
        layout.setRightPanelWidthPx(newWidth)
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
  }, [resizingSide, containerBounds, layout])

  /**
   * Синхронизация начальных и внешне изменённых (persist) ширин панелей с локальным состоянием.
   */
  useEffect(() => {
    if (typeof layout.leftPanelWidthPx === 'number') setLeftPanelWidthPx(layout.leftPanelWidthPx)
  }, [layout.leftPanelWidthPx])

  useEffect(() => {
    if (typeof layout.rightPanelWidthPx === 'number') setRightPanelWidthPx(layout.rightPanelWidthPx)
  }, [layout.rightPanelWidthPx])

  /**
   * Инициализирует начало ресайза выбранной панели: фиксирует геометрию контейнера и включает режим перетаскивания.
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
  const { panelState, hidePanel, showPanel } = externalPanelState || internalPanelState

  // Текущее количество выбранных примитивов
  const selectedPrimitiveIds = useObjectSelectedPrimitiveIds()

  /**
   * Если пользователь полностью снял выделение (нет примитивов, нет материала, нет группы)
   * и при этом открыта панель «Свойства» — скрываем её, чтобы не показывать пустой контент.
   */
  useEffect(() => {
    const nothingSelected = selectedPrimitiveIds.length === 0 && !selectedMaterialUuid && selectedGroupUuids.length === 0
    if (panelState.leftPanel === 'properties' && nothingSelected) {
      hidePanel?.('properties')
    }
  }, [selectedPrimitiveIds.length, selectedMaterialUuid, selectedGroupUuids.length, panelState.leftPanel, hidePanel])

  /**
   * Авто‑открытие панели «Свойства», когда пользователь сделал выбор (примитив/материал/группа),
   * но все левые панели скрыты. Если открыт чат — ничего не делаем.
   */
  useEffect(() => {
    const hasSelection = !!selectedMaterialUuid || selectedItemType === 'primitive' || selectedGroupUuids.length > 0
    const noLeftPanel = panelState.leftPanel === null
    if (noLeftPanel && hasSelection) {
      showPanel?.('properties')
    }
  }, [panelState.leftPanel, selectedMaterialUuid, selectedItemType, selectedGroupUuids.length, showPanel])

  /**
   * Рендерит левую панель: чат (если передан chatComponent) или свойства (материал/группа/примитив).
   */
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
            transition: resizingSide ? undefined : 'width 160ms ease',
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
            transition: resizingSide ? undefined : 'width 160ms ease',
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

  /**
   * Рендерит правую панель: менеджер объектов, когда он активен.
   */
  const renderRightPanel = () => {
    if (!panelState.rightPanel || panelState.rightPanel !== 'manager') return null

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
          transition: resizingSide ? undefined : 'width 160ms ease',
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
          flex: 1,
        }}
      >
        {renderLeftPanel()}

        {/* Ручка между левой панелью и центром */}
        {panelState.leftPanel && (
          <DragHandleVertical
            onMouseDown={beginResize('left')}
            ariaLabel="Изменить ширину левой панели"
            active={resizingSide === 'left'}
          />
        )}

        <Paper shadow="sm" radius="md" style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 400 }}>
          {children || <ObjectScene3D />}
        </Paper>

        {/* Ручка между центром и правой панелью */}
        {panelState.rightPanel === 'manager' && (
          <DragHandleVertical
            onMouseDown={beginResize('right')}
            ariaLabel="Изменить ширину правой панели"
            active={resizingSide === 'right'}
          />
        )}

        {renderRightPanel()}
      </Container>
    </Box>
  )
}
