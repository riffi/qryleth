import React, { useEffect, useRef, useState, lazy } from 'react'
import { clamp } from '@/shared/lib/math/number'
import { Box, Container, Paper, Group, Text, ActionIcon } from '@mantine/core'
import { IconMessages, IconAdjustments, IconFolder, IconTrees, IconX } from '@tabler/icons-react'
import { DragHandleVertical } from '@/shared/ui'
import {
  useSelectedMaterialUuid,
  useSelectedGroupUuids,
  useSelectedItemType
} from '@/features/editor/object/model/objectStore'
import { useObjectSelectedPrimitiveIds } from '@/features/editor/object/model/objectStore'
import type { GfxObject } from '@/entities/object'
// Логика раскладки перенесена в фичу editor/object/layout
import { useObjectPanelLayout } from '@/features/editor/object/layout/hooks/useObjectPanelLayout'
import { ObjectScene3D } from '@/features/editor/object/ui/renderer/ObjectScene3D'
import { PrimitiveControlPanel } from '@/features/editor/object/ui/PrimitiveControlPanel/PrimitiveControlPanel'
import { GroupControlPanel } from '@/features/editor/object/ui/GroupControlPanel/GroupControlPanel'
import { MaterialControlPanel } from '@/features/editor/object/ui/MaterialControlPanel/MaterialControlPanel'
import { ObjectManagementPanel } from '@/features/editor/object/ui/ObjectManagementPanel/ObjectManagementPanel'
import { TreeGeneratorPanel } from '@/features/editor/object/ui/GeneratorPanels/TreeGeneratorPanel'
// Состояние панелей теперь берём из layout‑фичи (глобальный стор панелей)
import { useGlobalPanelState } from '@/features/editor/object/layout/model/panelVisibilityStore'
// Ленивый импорт панели отладки спрайтов листа
const LeafSpriteDebugPanel = lazy(() => import('@/features/editor/object/ui/debug/LeafSpriteDebugPanel'))

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
  // Инициализируем стор метаданных из входного объекта при монтировании/смене объекта
  useEffect(() => {
    (async () => {
      try {
        const { useObjectMetaStore } = await import('@/features/editor/object/model/objectMetaStore')
        useObjectMetaStore.getState().loadFromObject(objectData)
      } catch (e) {
        console.warn('Не удалось инициализировать метаданные объекта:', e)
      }
    })()
  }, [objectData])
  // Persist‑раскладка ObjectEditor (инициализация и сеттеры ширин панелей)
  const layout = useObjectPanelLayout()

  // Ссылки и локальное состояние для интерактивного ресайза
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [leftPanelWidthPx, setLeftPanelWidthPx] = useState<number>(400)
  const [rightPanelWidthPx, setRightPanelWidthPx] = useState<number>(350)
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null)
  const [containerBounds, setContainerBounds] = useState<{ left: number; right: number } | null>(null)

  // Ограничение ширины панелей используем из shared math

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
  const internalPanelState = useGlobalPanelState()
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
    const isOpen = !!panelState.leftPanel
    const isChat = panelState.leftPanel === 'chat'
    const isProps = panelState.leftPanel === 'properties'
    const isSpriteDebug = panelState.leftPanel === 'spriteDebug'

    return (
      <Paper
        shadow="sm"
        radius="md"
        style={{
          width: isOpen ? `${leftPanelWidthPx}px` : 0,
          height: '100%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: resizingSide ? undefined : 'width 200ms ease, opacity 200ms ease',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          background: 'color-mix(in srgb, var(--mantine-color-dark-7) 78%, transparent)',
          backdropFilter: 'blur(8px)'
        }}
        aria-hidden={!isOpen}
      >
        {isOpen && (
          <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
            <Group>
              {isChat ? <IconMessages size={20} /> : (isSpriteDebug ? <IconFolder size={20} /> : <IconAdjustments size={20} />)}
              <Text fw={500}>
                {isChat
                  ? 'Панель чата'
                  : isSpriteDebug
                    ? 'Отладка спрайта листа'
                    : selectedMaterialUuid
                    ? 'Свойства материала'
                    : (selectedItemType === 'group' ? 'Свойства группы' : 'Свойства примитива')}
              </Text>
            </Group>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => hidePanel?.(isChat ? 'chat' : (isSpriteDebug ? 'spriteDebug' : 'properties'))}
              aria-label={isChat ? 'Скрыть чат' : 'Скрыть свойства'}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        )}
        <Box style={{ flex: 1, minHeight: 0 }}>
          {isChat && chatComponent}
          {isProps && (
            selectedMaterialUuid ? (
              <MaterialControlPanel />
            ) : selectedItemType === 'group' && selectedGroupUuids.length === 1 ? (
              <GroupControlPanel />
            ) : (
              <PrimitiveControlPanel />
            )
          )}
          {isSpriteDebug && (
            <React.Suspense fallback={<Text p="sm">Загрузка...</Text>}>
              <LeafSpriteDebugPanel />
            </React.Suspense>
          )}
        </Box>
      </Paper>
    )
  }

  /**
   * Рендерит правую панель: менеджер объектов или генератор деревьев.
   */
  const renderRightPanel = () => {
    const current = panelState.rightPanel
    const isOpen = current !== null
    return (
      <Paper
        shadow="sm"
        radius="md"
        style={{
          width: isOpen ? `${rightPanelWidthPx}px` : 0,
          flexShrink: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: resizingSide ? undefined : 'width 200ms ease, opacity 200ms ease',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          background: 'color-mix(in srgb, var(--mantine-color-dark-7) 78%, transparent)',
          backdropFilter: 'blur(8px)'
        }}
        aria-hidden={!isOpen}
      >
        {isOpen && (
          <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
            <Group>
              {current === 'manager' ? <IconFolder size={20} /> : <IconTrees size={20} />}
              <Text fw={500}>{current === 'manager' ? 'Менеджер объектов' : 'Генератор дерева'}</Text>
            </Group>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => hidePanel?.(current!)}
              aria-label={current === 'manager' ? 'Скрыть менеджер' : 'Скрыть генератор'}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        )}
        <Box style={{ flex: 1, minHeight: 0 }}>
          {current === 'manager' && <ObjectManagementPanel />}
          {current === 'treeGenerator' && <TreeGeneratorPanel />}
        </Box>
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
          // Контейнер без внутренних отступов по бокам — как в SceneEditor
          gap: 0,
          height: '100%',
          overflow: 'hidden',
          flex: 1,
          position: 'relative',
          paddingInline: 0,
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
        {!!panelState.rightPanel && (
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
