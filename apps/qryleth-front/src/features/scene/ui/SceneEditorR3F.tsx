import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Paper,
  Container,
  Badge,
  ActionIcon,
  Tooltip,
  Group,
  Modal,
  Stack,
  TextInput,
  Textarea,
  Button,
  Text,
  Divider
} from '@mantine/core'
import { SceneChatInterface } from './ChatInterface'
import { Scene3D } from './renderer/Scene3D.tsx'
import { SceneObjectManager } from './objectManager/SceneObjectManager.tsx'
import { ScriptingPanel } from './ScriptingPanel/ScriptingPanel.tsx'
import { ObjectEditorR3F, useObjectEditorToolRegistration, PanelToggleButtons, useGlobalPanelState } from '@/features/object-editor'
import { useSceneToolRegistration } from '@/features/scene'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconX, IconDeviceFloppy } from '@tabler/icons-react'
import {
  useSceneStore,
  useViewMode,
  useRenderMode,
  useTransformMode,
  useGridVisible,
  // useSceneLayers
} from '../model/sceneStore'
import { useSceneHistory } from '../lib/hooks/useSceneHistory'
import { db } from '@/shared/lib/database'
import MainLayout from '@/widgets/layouts/MainLayout'
import { UiMode } from '@/shared/types/ui'
import type { SceneStatus } from '@/features/scene/model/store-types'
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
import { buildUpdatedObject } from '@/features/object-editor/lib/saveUtils'
import { ViewModeSegment, DragHandleVertical, InlineEdit } from '@/shared/ui'
import { SceneEditorToolBar } from './SceneEditorToolBar'
import { LeftToolbar } from './LeftToolbar'
import { RightToolbar } from './RightToolbar'

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
}

/**
 * R3F-enabled Scene Editor that combines the 3D scene with object management
 * This replaces the traditional SceneEditor component for R3F workflows
 */
export const SceneEditorR3F: React.FC<SceneEditorR3FProps> = ({
  showObjectManager = true,
  uuid,
  isNew = false
}) => {
  // Автоматическая регистрация инструментов сцены и редактора объектов
  useSceneToolRegistration()
  useObjectEditorToolRegistration()
  // Initialize scene history for undo/redo and get controls
  const { undo, redo, canUndo, canRedo } = useSceneHistory()

  const [editorOpened, setEditorOpened] = useState(false)
  const [editingObject, setEditingObject] = useState<{objectUuid: string, instanceId?: string} | null>(null)
  const [saveSceneModalOpened, setSaveSceneModalOpened] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [scriptingPanelVisible, setScriptingPanelVisible] = useState(false)
  const [objectPanelCollapsed, setObjectPanelCollapsed] = useState(false)
  // Состояние подтверждения удаления инстанса
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ globalIndex: number; title: string } | null>(null)

  // Локальное состояние инлайн-редактирования названия сцены
  // Позволяет вводить имя без дергания стора на каждый кейстрок, если потребуется расширить поведение.
  const [sceneNameDraft, setSceneNameDraft] = useState<string>('')
  const [isEditingSceneName, setIsEditingSceneName] = useState<boolean>(false)

  // Ресайз панелей: более современный UX с drag-handles
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [leftPanelWidthPx, setLeftPanelWidthPx] = useState<number>(360)
  const [rightPanelWidthPx, setRightPanelWidthPx] = useState<number>(320)
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null)
  const [containerBounds, setContainerBounds] = useState<{ left: number; right: number } | null>(null)

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

  /**
   * Обрабатывает изменение размеров при перетаскивании разделителей панелей.
   * Здесь же задаются минимальные/максимальные ширины панелей. Пороговые значения
   * подобраны так, чтобы на ноутбуках (более узкие экраны) оставлять больше места
   * области рендеринга по центру.
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingSide || !containerBounds) return

      // Чуть уменьшаем минимальные ширины панелей, чтобы на ноутбуках
      // центр (рендеринг) был крупнее. Ранее было 260/240.
      const minLeft = 220
      const maxLeft = objectPanelCollapsed 
        ? window.innerWidth * 0.5  // Если правая панель скрыта - можно до половины экрана
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
  }, [resizingSide, containerBounds, scriptingPanelVisible])

  /**
   * Инициализирует стартовые ширины и состояние панелей в зависимости от
   * текущей ширины окна. Цель — на ноутбуках автоматически дать больше
   * пространства центральной области рендеринга.
   *
   * Правила (подобраны эмпирически):
   * - <= 1280px: левая панель свёрнута, правая панель уже (≈240px)
   * - <= 1440px: обе панели уже (левая ≈300px, правая ≈260px)
   * - > 1440px: дефолтные ширины (360px и 320px)
   */
  useEffect(() => {
    try {
      const width = window.innerWidth

      if (width <= 1280) {
        // Узкие ноутбуки: свернуть слева по умолчанию, справа сделать уже
        setChatCollapsed(true)
        setLeftPanelWidthPx(280)
        setRightPanelWidthPx(240)
      } else if (width <= 1440) {
        // Типичные ноутбуки/ультрабуки: обе панели компактнее
        setLeftPanelWidthPx(300)
        setRightPanelWidthPx(260)
      } else {
        // Десктопы/широкие экраны: оставить значения по умолчанию
        setLeftPanelWidthPx(360)
        setRightPanelWidthPx(320)
      }
    } catch (e) {
      // В не-браузерных окружениях безопасно игнорируем
    }
    // Один раз на маунт: стартовая адаптация
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginResize = (side: 'left' | 'right') => (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setContainerBounds({ left: rect.left, right: rect.right })
    setResizingSide(side)
    e.preventDefault()
    e.stopPropagation()
  }

  // Глобальное состояние панелей для ObjectEditor
  const globalPanelState = useGlobalPanelState()

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


  const saveSceneToDatabase = async (name: string, description?: string, uuid?: string) => {
    try {
      const state = useSceneStore.getState()
      const sceneData = state.getCurrentSceneData()
      let sceneUuid: string
      let successMessage: string

      if (uuid) {
        // Update existing scene
        await db.updateScene(uuid, name, sceneData, description, undefined)
        sceneUuid = uuid
        successMessage = `Сцена "${name}" сохранена`
      } else {
        // Create new scene
        sceneUuid = await db.saveScene(name, sceneData, description, undefined)
        successMessage = `Сцена "${name}" сохранена в библиотеку`
      }

      state.setSceneMetadata({
        uuid: sceneUuid,
        name: name,
        status: 'saved'
      })

      notifications.show({
        title: 'Успешно!',
        message: successMessage,
        color: 'green',
        icon: <IconCheck size="1rem" />,
      })

      return true
    } catch (error) {
      console.error('Failed to save scene:', error)
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось сохранить сцену',
        color: 'red',
        icon: <IconX size="1rem" />,
      })
      return false
    }
  }

  const handleSaveSceneToLibrary = async () => {
    // If scene already exists (has UUID), save directly
    if (sceneMetaData?.uuid) {
      await saveSceneToDatabase(sceneMetaData.name, undefined, sceneMetaData.uuid)
    } else {
      // For new scenes, show modal
      setSaveSceneModalOpened(true)
    }
  }

  const handleSaveScene = async (name: string, description?: string) => {
    const success = await saveSceneToDatabase(name, description)
    if (success) {
      setSaveSceneModalOpened(false)
    }
  }

  const handleEditObject = (objectUuid: string, instanceId?: string) => {
    setEditingObject({ objectUuid, instanceId })
    setEditorOpened(true)
  }

  /**
   * Сохраняет изменения, полученные из ObjectEditor,
   * обновляя примитивы, материалы и BoundingBox объекта сцены.
   * После обновления отображает уведомление об успешном сохранении.
   */
  const handleSaveObjectEdit = (object: GfxObject) => {
    updateObject(object.uuid, {
      primitives: object.primitives,
      materials: object.materials,
      boundingBox: object.boundingBox,
      primitiveGroups: object.primitiveGroups,
      primitiveGroupAssignments: object.primitiveGroupAssignments,
    })

    notifications.show({
      title: 'Успешно!',
      message: 'Изменения объекта сохранены',
      color: 'green',
      icon: <IconCheck size="1rem" />
    })
  }

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

  /**
   * Формирует объект из состояния редактора и закрывает модальное окно.
   */
  const handleEditorSaveClick = () => {
    if (!editingObjectData) return
    const updated = buildUpdatedObject(editingObjectData)
    handleSaveObjectEdit(updated)
    setEditorOpened(false)
  }

  const editingObjectData = React.useMemo(() => {
    if (!editingObject) return undefined
    const obj = objects.find(o => o.uuid === editingObject.objectUuid)
    if (!obj) return undefined
    return JSON.parse(JSON.stringify(obj))
  }, [editingObject, objects])

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
    setObjectPanelCollapsed(prev => {
      const newCollapsed = !prev
      
      // Если открываем правую панель и левая слишком широкая - уменьшаем её
      if (!newCollapsed && leftPanelWidthPx > window.innerWidth * 0.32) {
        const newMaxLeft = scriptingPanelVisible
          ? Math.min(window.innerWidth * 0.48, 820)
          : Math.min(window.innerWidth * 0.32, 480)
        setLeftPanelWidthPx(Math.min(leftPanelWidthPx, newMaxLeft))
      }
      
      return newCollapsed
    })
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

  /**
   * Панель управления камерами для Play-режима.
   * Компонент рендерится поверх канвы только при UiMode.Play и позволяет
   * переключать режим камеры (Orbit/Walk/Fly) кнопками. Дополнительно
   * отображает постоянную текстовую подсказку о горячих клавишах 1/2/3,
   * чтобы пользователь всегда видел, как быстро переключать режимы без мыши.
   *
   * Синхронизация с хоткеями обеспечивается через общее состояние стора:
   * нажатия 1/2/3 меняют viewMode, что мгновенно отражается в активной
   * кнопке панельки; нажатие кнопок меняет viewMode и тем самым активирует
   * соответствующую камеру.
   */
  const PlayCameraPanel: React.FC = () => (
    <Group gap={8} wrap="nowrap" align="center">
      <ViewModeSegment value={viewMode} onChange={setViewMode} frosted size="xs" />
      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap', userSelect: 'none' }}>
        Переключение камер: 1 — Orbit, 2 — Walk, 3 — Fly
      </Text>
    </Group>
  )

  return (
    <>
      <MainLayout
        headerVisible={!isPlay}
        navbarVisible={!isPlay}
        rightSection={(
          <>
            {/* Кнопка сохранения сцены (primary) + Play справа от неё */}
            {!isPlay && (
              <Group gap={8} wrap="nowrap" align="center">
                <Group gap={6} wrap="nowrap" align="center">
                  {/* Инлайн-редактирование названия сцены через shared компонент InlineEdit */}
                  <InlineEdit
                    value={sceneNameDraft}
                    onChange={handleSceneNameChange}
                    onEditStart={() => setIsEditingSceneName(true)}
                    onEditEnd={handleSceneNameBlur}
                    size="xs"
                    ariaLabel={'Название сцены'}
                    placeholder={'Название сцены'}
                    minInputWidth={160}
                  />
                  {/* Компактный индикатор статуса рядом с названием */}
                  <Badge color={getStatusColor(sceneMetaData.status as SceneStatus)} variant="light" size="sm">
                    {getStatusText(sceneMetaData.status as SceneStatus)}
                  </Badge>
                </Group>

                {sceneMetaData.status !== 'saved' && <Tooltip label="Сохранить (Ctrl/Cmd+S)" withArrow>
                    <ActionIcon
                        size="md"
                        variant={'subtle'}
                        color={'blue'}
                        onClick={handleSaveSceneToLibrary}
                        aria-label={'Сохранить'}
                    >
                      <IconDeviceFloppy size={24} />
                    </ActionIcon>
                  </Tooltip>
                }
              </Group>
            )}

            <Divider ml="md" mr="md" orientation="vertical"  />

            <Tooltip label="Отменить (Ctrl+Z)">
              <ActionIcon variant="subtle" size="sm" onClick={undo} disabled={!canUndo}>
                <IconArrowBack size="1.5rem" />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Вернуть (Ctrl+Y)">
              <ActionIcon variant="subtle" size="sm" onClick={redo} disabled={!canRedo}>
                <IconArrowForward size="1.5rem" />
              </ActionIcon>
            </Tooltip>
            <Divider ml="md" mr="md" orientation="vertical"  />


            <Divider ml="md" mr="md" orientation="vertical"  />

            {!isPlay && (
                <Tooltip label="Войти в режим просмотра (Play)" withArrow>
                  <Button
                    variant={"gradient"}
                    style={{height: '32px'}}
                    onClick={() => togglePlay()}
                    rightSection={<IconPlayerPlay size={18} />}
                  >
                    Play
                  </Button>
                </Tooltip>
            )}
          </>
        )}
      >
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
        {!isPlay && (
          <LeftToolbar
            chatCollapsed={chatCollapsed}
            onToggleChat={toggleChatPanel}
            scriptingPanelVisible={scriptingPanelVisible}
            onToggleScripting={toggleScriptingPanel}
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
          {!isPlay && (
            <SceneEditorToolBar
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
            {isPlay && (
              <Box
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  zIndex: 20,
                  display: 'flex',
                  gap: 12,
                  padding: 6,
                  background: 'color-mix(in srgb, var(--mantine-color-dark-7) 72%, transparent)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '10px',
                  boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
                  transition: 'opacity 200ms ease'
                }}
              >
                {/* Панель переключения камер доступна только в Play */}
                <PlayCameraPanel />
                <Tooltip label="Выйти из Play" withArrow>
                  <ActionIcon size="md" variant="filled" color="red" onClick={handleTogglePlay} aria-label="Выйти из Play">
                    <IconPlayerStop size={18} />
                  </ActionIcon>
                </Tooltip>
              </Box>
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

        {/* Правый тулбар с иконкой менеджера объектов - показывается только когда правая панель скрыта */}
        {!isPlay && showObjectManager && objectPanelCollapsed && (
          <RightToolbar
            objectPanelCollapsed={objectPanelCollapsed}
            onToggleObjectPanel={toggleRightPanel}
          />
        )}
      </Container>
      </MainLayout>
      <Modal
        opened={editorOpened}
        onClose={() => setEditorOpened(false)}
        fullScreen
        styles={{
          body: {
            height: 'calc(100dvh - 120px)',
            padding: 0
          },
          content: {
            height: '100dvh'
          },
          header: {
            padding: '1rem'
          },
          title:{
            flexGrow: 1,
            marginRight: '2rem'
          }
        }}
        title={
          <Group justify="space-between" style={{ width: '100%' }}>
            <Text size="lg" fw={500}>
              {editingObjectData ? `Редактор объекта: ${editingObjectData.name}` : 'Редактор объекта'}
            </Text>
            <Group gap="xs">
              <Tooltip label="Сохранить" withArrow>
                <ActionIcon color="gray" variant="subtle" onClick={handleEditorSaveClick}>
                  <IconDeviceFloppy size={24} />
                </ActionIcon>
              </Tooltip>
              <PanelToggleButtons
                activeLeftPanel={globalPanelState.panelState.leftPanel}
                activeRightPanel={globalPanelState.panelState.rightPanel}
                onToggle={globalPanelState.togglePanel}
                size="md"
              />
            </Group>
          </Group>
        }
      >
          <ObjectEditorR3F
            objectData={editingObjectData}
            externalPanelState={globalPanelState}
            modalMode={true}
          />
      </Modal>
      <SaveSceneModal
        opened={saveSceneModalOpened}
        onClose={() => setSaveSceneModalOpened(false)}
        onSave={handleSaveScene}
        currentSceneName={sceneMetaData?.name}
      />

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

interface SaveSceneModalProps {
  opened: boolean
  onClose: () => void
  onSave: (name: string, description?: string) => void
  currentSceneName?: string
}

const SaveSceneModal: React.FC<SaveSceneModalProps> = ({ opened, onClose, onSave, currentSceneName }) => {
  const [sceneName, setSceneName] = useState('')
  const [sceneDescription, setSceneDescription] = useState('')

  const handleSave = () => {
    if (!sceneName.trim()) {
      notifications.show({
        title: 'Ошибка',
        message: 'Введите название сцены',
        color: 'red',
        icon: <IconX size="1rem" />,
      })
      return
    }

  onSave(sceneName.trim(), sceneDescription.trim() || undefined)
    setSceneName('')
    setSceneDescription('')
  }

  const handleClose = () => {
    setSceneName('')
    setSceneDescription('')
    onClose()
  }

  // Set default name when modal opens
  React.useEffect(() => {
    if (opened && currentSceneName && !sceneName) {
      setSceneName(currentSceneName)
    }
  }, [opened, currentSceneName, sceneName])

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Сохранить сцену"
      size="md"
    >
      <Stack gap="md">
        <TextInput
          label="Название сцены"
          placeholder="Введите название..."
          value={sceneName}
          onChange={(e) => setSceneName(e.currentTarget.value)}
          required
        />
        <Textarea
          label="Описание (необязательно)"
          placeholder="Краткое описание сцены..."
          value={sceneDescription}
          onChange={(e) => setSceneDescription(e.currentTarget.value)}
          minRows={3}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            Сохранить
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

