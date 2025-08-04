import React, { useEffect, useState } from 'react'
import { Box, Paper, Container, Badge, ActionIcon, Tooltip, SegmentedControl, Group, Modal, Stack, TextInput, Textarea, Button, Text } from '@mantine/core'
import { SceneChatInterface } from './ChatInterface'
import { Scene3D } from './renderer/Scene3D.tsx'
import { SceneObjectManager } from './objectManager/SceneObjectManager.tsx'
import { ScriptingPanel } from './ScriptingPanel/ScriptingPanel.tsx'
import { ObjectEditorR3F, useObjectEditorToolRegistration, PanelToggleButtons, useGlobalPanelState } from '@/features/object-editor'
import { useSceneToolRegistration } from '@/features/scene'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconPlanet, IconX } from '@tabler/icons-react'
import {
  useSceneStore,
  useViewMode,
  useRenderMode,
  useTransformMode,
  useGridVisible,
  useSceneLayers
} from '../model/sceneStore'
import { useSceneHistory } from '../lib/hooks/useSceneHistory'
import { db } from '@/shared/lib/database'
import MainLayout from '@/widgets/layouts/MainLayout'
import type { SceneObject, SceneObjectInstance } from '@/entities/scene/types'
import type { SceneStatus } from '@/features/scene/model/store-types'
import { Link } from 'react-router-dom'
import { generateUUID } from '@/shared/lib/uuid'
import {
  IconArrowBack,
  IconArrowForward,
  IconBooks,
  IconSettings,
  IconInfoCircle,
  IconEye,
  IconRun,
  IconPlaneTilt,
  IconGridDots,
  IconArrowRightBar,
  IconRotate,
  IconResize,
  IconChevronLeft,
  IconChevronRight,
  IconCode
} from '@tabler/icons-react'
import { OpenAISettingsModal } from '../../../widgets/OpenAISettingsModal'
import type {GfxObject, GfxObjectWithTransform, GfxPrimitive} from "@/entities";
import {placeInstance} from "../lib/placement/ObjectPlacementUtils.ts";

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
  width?: number
  height?: number
  showObjectManager?: boolean
  uuid?: string
  isNew?: boolean
}

/**
 * R3F-enabled Scene Editor that combines the 3D scene with object management
 * This replaces the traditional SceneEditor component for R3F workflows
 */
export const SceneEditorR3F: React.FC<SceneEditorR3FProps> = ({
  width = 1200,
  height = 800,
  showObjectManager = true,
  uuid,
  isNew = false
}) => {
  // Автоматическая регистрация инструментов сцены и редактора объектов
  useSceneToolRegistration()
  useObjectEditorToolRegistration()
  // Initialize scene history for undo/redo and get controls
  const { undo, redo, canUndo, canRedo } = useSceneHistory()

  const [settingsOpened, setSettingsOpened] = useState(false)
  const [editorOpened, setEditorOpened] = useState(false)
  const [editingObject, setEditingObject] = useState<{objectUuid: string, instanceId?: string} | null>(null)
  const [saveSceneModalOpened, setSaveSceneModalOpened] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [scriptingPanelVisible, setScriptingPanelVisible] = useState(false)

  // Глобальное состояние панелей для ObjectEditor
  const globalPanelState = useGlobalPanelState()

  const viewMode = useViewMode()
  const setViewMode = useSceneStore(state => state.setViewMode)
  const renderMode = useRenderMode()
  const setRenderMode = useSceneStore(state => state.setRenderMode)
  const transformMode = useTransformMode()
  const setTransformMode = useSceneStore(state => state.setTransformMode)
  const gridVisible = useGridVisible()
  const layers = useSceneLayers()
  const toggleGridVisibility = useSceneStore(state => state.toggleGridVisibility)

  const objects = useSceneStore(state => state.objects)
  const updateObject = useSceneStore(state => state.updateObject)

  const sceneMetaData = useSceneStore(state => state.sceneMetaData)

  // Get scene store actions
  const { loadSceneData, clearScene, setSceneMetadata } = useSceneStore.getState()

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
      }
    }

    loadScene()
  }, [uuid, isNew, loadSceneData, clearScene, setSceneMetadata])


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
      boundingBox: object.boundingBox
    })

    notifications.show({
      title: 'Успешно!',
      message: 'Изменения объекта сохранены',
      color: 'green',
      icon: <IconCheck size="1rem" />
    })
  }

  const editingObjectData = React.useMemo(() => {
    if (!editingObject) return undefined
    const obj = objects.find(o => o.uuid === editingObject.objectUuid)
    if (!obj) return undefined
    return JSON.parse(JSON.stringify(obj))
  }, [editingObject, objects])

  return (
    <>
      <MainLayout
        rightSection={(
          <>
            <Badge
              color={getStatusColor(sceneMetaData.status as SceneStatus)}
              variant="light"
              size="sm"
            >
              {getStatusText(sceneMetaData.status as SceneStatus)}
            </Badge>

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

            <Tooltip label="Настройки">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setSettingsOpened(true)}
                c={"gray.4"}
              >
                <IconSettings size="1.5rem" />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Панель скриптинга">
              <ActionIcon
                variant="subtle"
                size="sm"
                c={"gray.4"}
                onClick={() => setScriptingPanelVisible(true)}
              >
                <IconCode size="1.5rem" />
              </ActionIcon>
            </Tooltip>

          </>
        )}
      >
        <Container
          size="xl"
          fluid
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            gap: 'var(--mantine-spacing-sm)',
            height: '100%',
            overflow: 'hidden'
        }}
        >
        {!chatCollapsed && (
          <Paper shadow="sm" radius="md" style={{ width: scriptingPanelVisible ? 800 : 400, height: '100%' }}>
            {scriptingPanelVisible ? (
              <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Group justify="space-between" p="sm" bg="gray.8">
                  <Group>
                    <IconCode size={20} />
                    <Text fw={500}>Панель скриптинга</Text>
                  </Group>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => setScriptingPanelVisible(false)}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
                <Box style={{ flex: 1, minHeight: 0 }}>
                  <ScriptingPanel height="100%" />
                </Box>
              </Box>
            ) : (
              <SceneChatInterface onCollapse={() => setChatCollapsed(true)} />
            )}
          </Paper>
        )}

        {chatCollapsed && (
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: '100%'
            }}
          >
            <Tooltip label="Развернуть чат">
              <ActionIcon
                variant="filled"
                size="lg"
                onClick={() => setChatCollapsed(false)}
                style={{
                  borderRadius: '0 8px 8px 0'
                }}
              >
                <IconChevronRight size={20} />
              </ActionIcon>
            </Tooltip>
          </Box>
        )}

        <Paper
          shadow="sm"
          radius="md"
          style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 400 }}
        >
          <Box
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 10,
              padding: 6
            }}
          >
            <Group gap="xs">
              <Tooltip label={gridVisible ? 'Скрыть сетку' : 'Показать сетку'}>
                <ActionIcon
                  variant={gridVisible ? 'filled' : 'light'}
                  c={gridVisible ? 'white' : 'gray'}
                  onClick={toggleGridVisibility}
                  size="md"
                >
                  <IconGridDots size={18} />
                </ActionIcon>
              </Tooltip>

              <Group gap="xs">
                <Tooltip label="Перемещение">
                  <ActionIcon
                    size="md"
                    variant={transformMode === 'translate' ? 'filled' : 'light'}
                    color="blue"
                    onClick={() => setTransformMode('translate')}
                  >
                    <IconArrowRightBar size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Поворот">
                  <ActionIcon
                    size="md"
                    variant={transformMode === 'rotate' ? 'filled' : 'light'}
                    color="green"
                    onClick={() => setTransformMode('rotate')}
                  >
                    <IconRotate size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Масштаб">
                  <ActionIcon
                    size="md"
                    variant={transformMode === 'scale' ? 'filled' : 'light'}
                    color="orange"
                    onClick={() => setTransformMode('scale')}
                  >
                    <IconResize size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>

              <SegmentedControl
                value={renderMode}
                onChange={(value) => setRenderMode(value as 'solid' | 'wireframe')}
                data={[
                  { value: 'solid', label: 'Solid' },
                  { value: 'wireframe', label: 'Wireframe' }
                ]}
                size="xs"
              />

              <SegmentedControl
                value={viewMode}
                onChange={(value) => setViewMode(value as 'orbit' | 'walk' | 'fly')}
                data={[
                  {
                    value: 'orbit',
                    label: (
                      <Group gap={4} wrap="nowrap">
                        <IconPlanet size={14} />
                        <span>Orbit</span>
                      </Group>
                    )
                  },
                  {
                    value: 'walk',
                    label: (
                      <Group gap={4} wrap="nowrap">
                        <IconRun size={14} />
                        <span>Walk</span>
                      </Group>
                    )
                  },
                  {
                    value: 'fly',
                    label: (
                      <Group gap={4} wrap="nowrap">
                        <IconPlaneTilt size={14} />
                        <span>Fly</span>
                      </Group>
                    )
                  }
                ]}
                size="xs"
              />
            </Group>
          </Box>

          <Box style={{ width: '100%', height: '100%' }}>
            <Scene3D />
          </Box>
        </Paper>

        {showObjectManager && (
          <Paper
            shadow="sm"
            radius="md"
            style={{ width: 350, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <SceneObjectManager
              onSaveSceneToLibrary={handleSaveSceneToLibrary}
              onEditObject={handleEditObject}
            />
          </Paper>
        )}
      </Container>
      </MainLayout>
      <OpenAISettingsModal opened={settingsOpened} onClose={() => setSettingsOpened(false)} />
      <Modal
        opened={editorOpened}
        onClose={() => setEditorOpened(false)}
        fullScreen
        styles={{
          body: {
            height: 'calc(100vh - 120px)',
            padding: 0
          },
          content: {
            height: '100vh'
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
            <Group>
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
          onClose={() => setEditorOpened(false)}
          objectData={editingObjectData}
          onSave={handleSaveObjectEdit}
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

