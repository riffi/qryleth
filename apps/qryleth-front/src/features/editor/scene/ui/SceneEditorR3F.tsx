import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Paper,
  Container,
  ActionIcon,
  Tooltip,
  Group,
  Modal,
  Stack,
  Button,
  Text,
  Divider
} from '@mantine/core'
import { SceneChatInterface } from './ChatInterface'
import { Scene3D } from './renderer/Scene3D.tsx'
import { SceneObjectManager } from './objectManager/SceneObjectManager.tsx'
import { ScriptingPanel } from './ScriptingPanel/ScriptingPanel.tsx'
// import from object-editor удалены: редактор поднимается на уровень виджета
import { useSceneToolRegistration } from '@/features/editor/scene/lib/ai'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconX } from '@tabler/icons-react'
import {
  useSceneStore,
  useViewMode,
  useRenderMode,
  useTransformMode,
  useGridVisible,
  // useSceneLayers
} from '../model/sceneStore'
import { useSceneHistory } from '@/features/editor/scene/lib/hooks/useSceneHistory'
import { db } from '@/shared/lib/database'
// MainLayout убран из фичи; обёртка осуществляется на уровне виджета SceneEditor
import { UiMode } from '@/shared/types/ui'
import type { SceneStatus } from '@/entities/scene/types'
import {
  IconArrowBack,
  IconArrowForward,
  IconFolder,
  IconCode,
  IconMessages,
  IconPlayerPlay,
  IconPlayerStop
} from '@tabler/icons-react'
import type { GfxObject } from "@/entities";
import { ViewModeSegment, DragHandleVertical } from '@/shared/ui'
import { useScenePanelLayout } from '@/features/editor/scene/layout'
// Тулбары передаются из виджета как компоненты (фича scene-toolbar)

const getStatusColor = (status: SceneStatus) => {
  switch (status) {
    case 'draft':
      return 'orange'
    case 'modified':
      return 'yellow'
    case 'saved':
      return 'green'
    default:
      return 'gray'
  }
}

const getStatusText = (status: SceneStatus) => {
  switch (status) {
    case 'draft':
      return 'Черновик'
    case 'modified':
      return 'Есть изменения'
    case 'saved':
      return 'Сохранена'
    default:
      return 'Неизвестно'
  }
}

interface SceneEditorR3FProps {
  showObjectManager?: boolean
  uuid?: string
  isNew?: boolean
  /** Запрос на сохранение сцены (виджет решает, показать модал или сразу сохранить) */
  onSaveSceneRequest?: (payload: { uuid?: string; name?: string }) => void
  /** Компоненты тулбаров, поставляемые виджетом */
  LeftToolbarComponent?: React.ComponentType<any>
  RightToolbarComponent?: React.ComponentType<any>
  TopToolbarComponent?: React.ComponentType<any>
  /** Компонент оверлея Play (фича scene-play-mode) */
  PlayOverlayComponent?: React.ComponentType<any>
  /** Запрос на открытие редактора объекта (виджет рендерит ObjectEditorR3F) */
  onRequestEditObject?: (objectUuid: string, instanceId?: string) => void
}

/**
 * R3F-enabled Scene Editor that combines the 3D scene with object management
 * This replaces the traditional SceneEditor component for R3F workflows
 */
export const SceneEditorR3F: React.FC<SceneEditorR3FProps> = ({
  showObjectManager = true,
  uuid,
  isNew = false,
  onSaveSceneRequest,
  LeftToolbarComponent,
  RightToolbarComponent,
  TopToolbarComponent,
  PlayOverlayComponent,
  onRequestEditObject,
}) => {
  // Автоматическая регистрация только инструментов сцены.
  // Инструменты ObjectEditor подключаются исключительно в его собственном сервисе,
  // чтобы избежать попадания их в глобальный LangChain сервис сцены.
  useSceneToolRegistration()
  // Initialize scene history for undo/redo and get controls
  const { undo, redo, canUndo, canRedo } = useSceneHistory()

  // Редактор объекта переносится на уровень виджета
  // Сохранение сцены делегируется виджету через onSaveSceneRequest
  // Управление раскладкой панелей вынесено в фичу scene-layout
  const {
    chatCollapsed,
    setChatCollapsed,
    scriptingPanelVisible,
    setScriptingPanelVisible,
    objectPanelCollapsed,
    setObjectPanelCollapsed,
    leftPanelWidthPx,
    setLeftPanelWidthPx,
    rightPanelWidthPx,
    setRightPanelWidthPx,
    containerRef,
    resizingSide,
    beginResize,
  } = useScenePanelLayout()
  // Состояние подтверждения удаления инстанса
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ globalIndex: number; title: string } | null>(null)

  // Локальное состояние инлайн-редактирования названия сцены
  // Позволяет вводить имя без дергания стора на каждый кейстрок, если потребуется расширить поведение.
  const [sceneNameDraft, setSceneNameDraft] = useState<string>('')
  const [isEditingSceneName, setIsEditingSceneName] = useState<boolean>(false)

  // Логика ресайза и первичной адаптации перенесена в хук useScenePanelLayout

  // Глобальное состояние панелей для ObjectEditor
  // const globalPanelState = useGlobalPanelState()

  const viewMode = useViewMode()
  const setViewMode = useSceneStore(state => state.setViewMode)
  const renderMode = useRenderMode()
  const setRenderMode = useSceneStore(state => state.setRenderMode)
  const transformMode = useTransformMode()
  const setTransformMode = useSceneStore(state => state.setTransformMode)
  const gridVisible = useGridVisible()
  // const layers = useSceneLayers()
  const toggleGridVisibility = useSceneStore(state => state.toggleGridVisibility)
  // Настройка автопривязки цели OrbitControls при выборе
  const autoOrbitTargetOnSelect = useSceneStore(state => state.autoOrbitTargetOnSelect)
  const toggleAutoOrbitTargetOnSelect = useSceneStore(state => state.toggleAutoOrbitTargetOnSelect)
  // Текущее состояние UI-режима (редактирование / play) и переключатель
  const uiMode = useSceneStore(state => state.uiMode)
  const togglePlay = useSceneStore(state => state.togglePlay)

  const objects = useSceneStore(state => state.objects)
  const objectInstances = useSceneStore(state => state.objectInstances)
  const updateObject = useSceneStore(state => state.updateObject)
  const selectedObject = useSceneStore(state => state.selectedObject)
  const removeObjectInstance = useSceneStore(state => state.removeObjectInstance)
  const clearSelection = useSceneStore(state => state.clearSelection)

  /**
   * Вычисляет данные о выбранном инстансе объекта для отображения в верхней панели
   * рядом с инструментами трансформации.
   *
   * Возвращает:
   * - name: имя объекта
   * - index: локальный индекс инстанса в рамках одного объекта (последовательность фильтрованных инстансов этого объекта)
   * - globalIndex: позиция инстанса в глобальном массиве `objectInstances` (используется для удаления)
   * - instance: сам инстанс
   * Если выбран не инстанс или данные не найдены — возвращает undefined.
   */
  const selectedInstanceInfo = React.useMemo(() => {
    if (!selectedObject?.isInstanced || !selectedObject.instanceUuid) return undefined
    const globalIndex = objectInstances.findIndex(i => i.uuid === selectedObject.instanceUuid)
    if (globalIndex < 0) return undefined
    const inst = objectInstances[globalIndex]
    const obj = objects.find(o => o.uuid === inst.objectUuid)
    if (!obj) return undefined
    // Индекс в рамках всех инстансов данного объекта
    const instancesOfObject = objectInstances.filter(i => i.objectUuid === inst.objectUuid)
    const localIndex = instancesOfObject.findIndex(i => i.uuid === selectedObject.instanceUuid)
    return {
      name: obj.name,
      index: localIndex,
      globalIndex,
      instance: inst
    }
  }, [selectedObject?.isInstanced, selectedObject?.instanceUuid, objectInstances, objects])

  const sceneMetaData = useSceneStore(state => state.sceneMetaData)

  // Get scene store actions
  const { loadSceneData, clearScene, setSceneMetadata } = useSceneStore.getState()
  const markSceneAsModified = useSceneStore.getState().markSceneAsModified

  // Load scene data from database if uuid is provided
  useEffect(() => {
    const loadScene = async () => {
      if (uuid && !isNew) {
        try {
          const sceneData = await db.getScene(uuid)
          if (sceneData) {
            loadSceneData(sceneData.sceneData, sceneData.name, uuid)
          }
        } catch (error) {
          console.error('Failed to load scene:', error)
        }
      } else if (isNew) {
        // Clear scene for new scene
        clearScene()
        setSceneMetadata({
          name: 'Новая сцена',
          status: 'draft'
        })
        setSceneNameDraft('Новая сцена')
      }
    }

    loadScene()
  }, [uuid, isNew, loadSceneData, clearScene, setSceneMetadata])

  useEffect(() => {
    // Синхронизация черновика названия при загрузке/смене сцены
    setSceneNameDraft(sceneMetaData?.name || '')
  }, [sceneMetaData?.name])
  // Сохранение сцены перенесено на уровень виджета через onSaveSceneRequest

  const handleSaveSceneToLibrary = async () => {
    onSaveSceneRequest?.({ uuid: sceneMetaData?.uuid, name: sceneMetaData?.name })
  }

  const handleEditObject = (objectUuid: string, instanceId?: string) => {
    onRequestEditObject?.(objectUuid, instanceId)
  }

  /**
   * Сохраняет изменения, полученные из ObjectEditor,
   * обновляя примитивы, материалы и BoundingBox объекта сцены.
   * После обновления отображает уведомление об успешном сохранении.
   */
  // Сохранение изменений объекта выполняется на уровне виджета

  /**
   * Обновляет название сцены в zustand-хранилище и помечает сцену как изменённую.
   * @param newName Новое название сцены, введённое пользователем инлайн в хедере
   */
  const handleSceneNameChange = (newName: string) => {
    setSceneNameDraft(newName)
    const current = useSceneStore.getState().sceneMetaData
    setSceneMetadata({ ...current, name: newName })
    markSceneAsModified()
  }

  /**
   * Обработчик завершения редактирования названия (по blur).
   * Здесь фиксируем выход из режима редактирования. Логика сохранения
   * уже выполнена в handleSceneNameChange по мере ввода.
   */
  const handleSceneNameBlur = () => {
    setIsEditingSceneName(false)
  }

  /**
   * Глобальный хоткей сохранения сцены: Ctrl/Cmd + S.
   * Перехватывает нажание, предотвращает дефолт и вызывает сохранение.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')
      if (isSave) {
        e.preventDefault()
        handleSaveSceneToLibrary()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sceneMetaData?.uuid, sceneMetaData?.name])

  /**
   * Открывает модальное окно подтверждения удаления инстанса.
   * Фиксирует текущее целевое состояние (заголовок и глобальный индекс)
   * для корректного удаления даже при возможной смене выделения до подтверждения.
   */
  const openDeleteConfirm = React.useCallback(() => {
    if (!selectedInstanceInfo) return
    setPendingDelete({
      globalIndex: selectedInstanceInfo.globalIndex,
      title: `${selectedInstanceInfo.name} [${selectedInstanceInfo.index + 1}]`
    })
    setDeleteConfirmOpened(true)
  }, [selectedInstanceInfo])

  /**
   * Закрывает модальное окно подтверждения удаления без выполнения действия.
   */
  const closeDeleteConfirm = React.useCallback(() => {
    setDeleteConfirmOpened(false)
    setPendingDelete(null)
  }, [])

  /**
   * Подтверждает удаление инстанса: удаляет по сохранённому глобальному индексу,
   * сбрасывает выделение и показывает уведомление с подсказкой про Undo (Ctrl+Z).
   * Сценарий отката уже поддерживается механизмом истории стора.
   */
  const confirmDeleteInstance = React.useCallback(() => {
    if (!pendingDelete) return
    removeObjectInstance(pendingDelete.globalIndex)
    clearSelection()
    setDeleteConfirmOpened(false)
    setPendingDelete(null)
    notifications.show({
      title: 'Инстанс удалён',
      message: 'Действие можно отменить: Ctrl+Z или кнопкой Undo в хедере',
      color: 'yellow',
      icon: <IconCheck size="1rem" />
    })
  }, [pendingDelete, removeObjectInstance, clearSelection])

  /**
   * Глобальный хоткей удаления инстанса: клавиша Delete.
   *
   * Поведение:
   * - Игнорируется, если фокус в полях ввода или редакторе кода.
   * - Срабатывает только при наличии выбранного инстанса.
   * - Не удаляет сразу: открывает модалку подтверждения, согласованную с кнопкой корзины.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // В режиме Play не реагируем на Delete
      if (uiMode === UiMode.Play) return
      // Пропускаем, если ввод идёт в текстовых полях
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const target = e.target as HTMLElement
      if (target && (target.classList?.contains('cm-editor') || target.closest?.('.cm-editor'))) return
      if (e.key === 'Delete') {
        // Открываем подтверждение удаления выбранного инстанса
        if (selectedInstanceInfo) {
          e.preventDefault()
          openDeleteConfirm()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedInstanceInfo, openDeleteConfirm, uiMode])

  // Редактирование объекта и сохранение поднимаются на уровень виджета

  /**
   * Удаляет выбранный инстанс из сцены без подтверждения.
   * Используется как утилита, но в UI по умолчанию вызываем openDeleteConfirm.
   */
  const handleDeleteSelectedInstance = React.useCallback(() => {
    if (!selectedInstanceInfo) return
    removeObjectInstance(selectedInstanceInfo.globalIndex)
    clearSelection()
  }, [selectedInstanceInfo, removeObjectInstance, clearSelection])


  // Ширины панелей: управляются в px для корректного ресайза
  const chatPanelWidth = `${leftPanelWidthPx}px`
  const objectPanelWidth = `${rightPanelWidthPx}px`

  // Ширина вертикальной ручки-резайзера между панелями и центром, px (см. DragHandleVertical.width по умолчанию)
  const dragHandleWidthPx = 6

  // Смещения тулбаров: когда панели открыты — тулбары сдвигаются от краёв контейнера на ширину панели + разделитель
  // Не зависят от isPlay, т.к. сами тулбары не рендерятся в play; так избегаем обращения к isPlay до инициализации
  const leftToolbarOffsetPx = (!chatCollapsed) ? (leftPanelWidthPx + dragHandleWidthPx) : 0
  const rightToolbarOffsetPx = (!objectPanelCollapsed) ? (rightPanelWidthPx + dragHandleWidthPx) : 0

  // Handlers to toggle panels from header
  const toggleChatPanel = () => {
    if (!chatCollapsed && !scriptingPanelVisible) {
      // Если чат уже открыт и скриптинг закрыт - закрываем левую панель
      setChatCollapsed(true)
    } else {
      // Открываем чат и закрываем скриптинг
      setScriptingPanelVisible(false)
      setChatCollapsed(false)
    }
  }

  const toggleScriptingPanel = () => {
    if (scriptingPanelVisible) {
      // Если скриптинг открыт - закрываем его (и всю левую панель)
      setScriptingPanelVisible(false)
      setChatCollapsed(true)
    } else {
      // Открываем скриптинг и закрываем чат
      setChatCollapsed(false)
      setScriptingPanelVisible(true)
    }
  }

  const toggleRightPanel = () => {
    const newCollapsed = !objectPanelCollapsed
    // Если открываем правую панель и левая слишком широкая - уменьшаем её
    if (!newCollapsed && leftPanelWidthPx > window.innerWidth * 0.32) {
      const newMaxLeft = scriptingPanelVisible
        ? Math.min(window.innerWidth * 0.48, 820)
        : Math.min(window.innerWidth * 0.32, 480)
      setLeftPanelWidthPx(Math.min(leftPanelWidthPx, newMaxLeft))
    }
    setObjectPanelCollapsed(newCollapsed)
  }


  /**
   * Обработчик переключения play-режима из UI (кнопки Play/Exit).
   * На данном этапе просто вызывает togglePlay(); переходы без мерцаний.
   */
  const handleTogglePlay = () => {
    // Если выходим из Play, сначала снимаем pointer lock и принудительно переключаем камеру на Orbit,
    // чтобы избежать мгновенного повторного захвата мыши обработчиками Walk/Fly.
    if (uiMode === UiMode.Play) {
      try { document?.exitPointerLock?.() } catch {}
      try { setViewMode('orbit') } catch {}
    }
    togglePlay()
  }

  const isPlay = uiMode === UiMode.Play
  // Play overlay и хоткеи обрабатываются на уровне виджета/scene-play-mode
  // Отслеживаем текущую скорость полёта (FlyControls шлёт событие 'flySpeedChange')
  const [flySpeed, setFlySpeed] = useState<number | undefined>(undefined)
  useEffect(() => {
    const handler = (e: CustomEvent) => setFlySpeed(e.detail)
    window.addEventListener('flySpeedChange', handler as EventListener)
    return () => window.removeEventListener('flySpeedChange', handler as EventListener)
  }, [])

  return (
    <>
        <Container
          size="xl"
          fluid
          ref={containerRef}
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            gap: 0,
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            transition: 'gap 120ms ease',
            paddingInline: 0
        }}
        >
        {/* Левый тулбар с иконками чата и скриптинга */}
        {!isPlay && LeftToolbarComponent && (
          <LeftToolbarComponent
            chatCollapsed={chatCollapsed}
            onToggleChat={toggleChatPanel}
            scriptingPanelVisible={scriptingPanelVisible}
            onToggleScripting={toggleScriptingPanel}
            // Смещаем тулбар вправо, если левая панель открыта
            offsetLeftPx={leftToolbarOffsetPx}
          />
        )}

        {!isPlay && !chatCollapsed && (
          <Paper
            shadow="sm"
            radius="md"
            style={{
              width: chatPanelWidth,
              height: '100%',
              minWidth: 260,
              display: 'flex',
              overflow: 'hidden',
              transition: resizingSide ? undefined : 'width 160ms ease, opacity 200ms ease',
              opacity: isPlay ? 0 : 1,
              background: 'color-mix(in srgb, var(--mantine-color-dark-7) 78%, transparent)',
              backdropFilter: 'blur(8px)'
            }}
          >
            {scriptingPanelVisible ? (
              <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
                  <Group>
                    <IconCode size={20} />
                    <Text fw={500}>Панель скриптинга</Text>
                  </Group>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => {
                      setScriptingPanelVisible(false)
                      setChatCollapsed(true)
                    }}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
                <Box style={{ flex: 1, minHeight: 0 }}>
                  <ScriptingPanel height="100%" />
                </Box>
              </Box>
            ) : (
              <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
                {/* Заголовок панели чата по аналогии с панелью скриптинга */}
                <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
                  <Group>
                    <IconMessages size={20} />
                    <Text fw={500}>Панель чата</Text>
                  </Group>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => setChatCollapsed(true)}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
                <Box style={{ flex: 1, minHeight: 0 }}>
                  <SceneChatInterface />
                </Box>
              </Box>
            )}
          </Paper>
        )}

        {/* Drag handle between left panel and center */}
        {!isPlay && !chatCollapsed && (
          <DragHandleVertical onMouseDown={beginResize('left')} ariaLabel="Изменить ширину левой панели" active={resizingSide === 'left'} />
        )}

        {/* Center */}
        <Paper
          shadow="sm"
          radius={0}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            minHeight: 400,
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--mantine-color-dark-7) 65%, transparent), transparent)'
          }}
        >
          {!isPlay && TopToolbarComponent && (
            <TopToolbarComponent
              gridVisible={gridVisible}
              onToggleGrid={toggleGridVisibility}
              autoOrbitTargetOnSelect={autoOrbitTargetOnSelect}
              onToggleAutoOrbitTargetOnSelect={toggleAutoOrbitTargetOnSelect}
              renderMode={renderMode}
              onChangeRenderMode={setRenderMode}
              transformMode={transformMode}
              onChangeTransformMode={setTransformMode}
              selectedInstanceLabel={selectedInstanceInfo ? `${selectedInstanceInfo.name} [${selectedInstanceInfo.index + 1}]` : undefined}
              onDeleteSelectedInstance={selectedInstanceInfo ? openDeleteConfirm : undefined}
            />
          )}

          <Box style={{ width: '100%', height: '100%' }}>
            <Scene3D className="scene-canvas" onSceneReady={() => {}} />
            {isPlay && PlayOverlayComponent && (
              <PlayOverlayComponent
                viewMode={viewMode as any}
                onChangeViewMode={setViewMode as any}
                onExitPlay={handleTogglePlay}
                flySpeed={flySpeed}
              />
            )}
          </Box>
        </Paper>

        {showObjectManager && !isPlay && (
          <>
            {/* Drag handle between center and right panel */}
            {!objectPanelCollapsed && (
              <DragHandleVertical onMouseDown={beginResize('right')} ariaLabel="Изменить ширину правой панели" active={resizingSide === 'right'} />
            )}

            {!objectPanelCollapsed && (
              <Paper
                shadow="sm"
                radius="md"
                style={{
                  width: objectPanelWidth,
                  flexShrink: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 240,
                  overflow: 'hidden',
                  transition: resizingSide ? undefined : 'width 160ms ease, opacity 200ms ease',
                  opacity: isPlay ? 0 : 1,
                  background: 'color-mix(in srgb, var(--mantine-color-dark-7) 78%, transparent)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                {/* Заголовок панели менеджера объектов с иконкой закрытия */}
                <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
                  <Group>
                    <IconFolder size={20} />
                    <Text fw={500}>Менеджер объектов</Text>
                  </Group>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => setObjectPanelCollapsed(true)}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
                <Box style={{ flex: 1, minHeight: 0 }}>
                  <SceneObjectManager
                    onSaveSceneToLibrary={handleSaveSceneToLibrary}
                    onEditObject={handleEditObject}
                  />
                </Box>
              </Paper>
            )}
          </>
        )}

        {/* Правый тулбар: виден всегда в режиме редактора; смещается влево при открытой правой панели */}
        {!isPlay && showObjectManager && RightToolbarComponent && (
          <RightToolbarComponent
            objectPanelCollapsed={objectPanelCollapsed}
            onToggleObjectPanel={toggleRightPanel}
            // Смещаем тулбар влево от правого края, если правая панель открыта
            offsetRightPx={rightToolbarOffsetPx}
          />
        )}
      </Container>

      {/* Подтверждение удаления инстанса */}
      <Modal
        opened={deleteConfirmOpened}
        onClose={closeDeleteConfirm}
        title="Удалить инстанс?"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Вы уверены, что хотите удалить инстанс {pendingDelete?.title}?
            Это действие можно отменить через историю (Undo / Ctrl+Z).
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDeleteConfirm}>Отмена</Button>
            <Button color="red" onClick={confirmDeleteInstance}>Удалить</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}

