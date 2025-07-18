import React, { useEffect, useState } from 'react'
import { Box, Paper, Container, Badge, ActionIcon, Tooltip, SegmentedControl, Group } from '@mantine/core'
import { ChatInterface } from '../../ChatInterface'
import { Scene3D } from '../Scene3D'
import { ObjectManager } from '../../ObjectManager'
import {
  useSceneStore,
  useViewMode,
  useRenderMode,
  useTransformMode,
  useGridVisible
} from '../../../stores/sceneStore'
import { useSceneHistory } from '../../../hooks/r3f/useSceneHistory'
import { db } from '../../../utils/database'
import MainLayout from '../../../layouts/MainLayout'
import type { SceneResponse, SceneObject, ScenePlacement } from '../../../types/scene'
import type { SceneStatus } from '../../../types/r3f'
import { Link } from 'react-router-dom'
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
  IconResize
} from '@tabler/icons-react'
import { OpenAISettingsModal } from '../../OpenAISettingsModal'

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
  // Initialize scene history for undo/redo and get controls
  const { undo, redo, canUndo, canRedo } = useSceneHistory()

  const [settingsOpened, setSettingsOpened] = useState(false)

  const viewMode = useViewMode()
  const setViewMode = useSceneStore(state => state.setViewMode)
  const renderMode = useRenderMode()
  const setRenderMode = useSceneStore(state => state.setRenderMode)
  const transformMode = useTransformMode()
  const setTransformMode = useSceneStore(state => state.setTransformMode)
  const gridVisible = useGridVisible()
  const toggleGridVisibility = useSceneStore(state => state.toggleGridVisibility)

  const currentScene = useSceneStore(state => state.currentScene)

  // Get scene store actions
  const { loadSceneData, clearScene, setCurrentScene } = useSceneStore.getState()

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
        setCurrentScene({
          name: 'Новая сцена',
          status: 'draft'
        })
      }
    }

    loadScene()
  }, [uuid, isNew, loadSceneData, clearScene, setCurrentScene])


  const handleSceneGenerated = (scene: SceneResponse) => {
    useSceneStore.getState().loadSceneData(scene)
  }

  const handleObjectAdded = (objectData: any) => {
    const { addObject, addPlacement, objects } = useSceneStore.getState()
    const newObject: SceneObject = {
      name: objectData.name,
      primitives: objectData.primitives,
      layerId: 'objects'
    }
    const objectIndex = objects.length
    addObject(newObject)

    const placement: ScenePlacement = {
      objectIndex,
      position: objectData.position || [0, 0, 0],
      rotation: objectData.rotation || [0, 0, 0],
      scale: objectData.scale || [1, 1, 1]
    }
    addPlacement(placement)
  }

  const handleSaveSceneToLibrary = async () => {
    try {
      const state = useSceneStore.getState()
      const sceneData = state.getCurrentSceneData()
      let sceneUuid: string

      if (state.currentScene.uuid) {
        await db.updateScene(
          state.currentScene.uuid,
          state.currentScene.name,
          sceneData,
          undefined,
          undefined
        )
        sceneUuid = state.currentScene.uuid
      } else {
        sceneUuid = await db.saveScene(
          state.currentScene.name,
          sceneData,
          undefined,
          undefined
        )
      }

      state.setCurrentScene({
        uuid: sceneUuid,
        name: state.currentScene.name,
        status: 'saved'
      })
    } catch (error) {
      console.error('Failed to save scene:', error)
    }
  }

  return (
    <>
      <MainLayout
        rightSection={(
          <>
            <Badge
              color={getStatusColor(currentScene.status as SceneStatus)}
              variant="light"
              size="sm"
            >
              {getStatusText(currentScene.status as SceneStatus)}
            </Badge>

            <Tooltip label="Отменить (Ctrl+Z)">
              <ActionIcon variant="subtle" size="sm" onClick={undo} disabled={!canUndo}>
                <IconArrowBack size="1rem" />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Вернуть (Ctrl+Y)">
              <ActionIcon variant="subtle" size="sm" onClick={redo} disabled={!canRedo}>
                <IconArrowForward size="1rem" />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Библиотека">
              <ActionIcon component={Link} to="/" variant="subtle" size="sm" c={"gray.4"}>
                <IconBooks size="1rem" />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Настройки">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setSettingsOpened(true)}
                c={"gray.4"}
              >
                <IconSettings size="1rem" />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Справка">
              <ActionIcon variant="subtle" size="sm" c={"gray.4"}>
                <IconInfoCircle size="1rem" />
              </ActionIcon>
            </Tooltip>
          </>
        )}
      >
        <Container
          size="xl"
          fluid
          h="100%"
          style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: 'var(--mantine-spacing-sm)' }}
        >
        <Paper shadow="sm" radius="md" style={{ width: 400, height: '100%' }}>
          <ChatInterface onSceneGenerated={handleSceneGenerated} onObjectAdded={handleObjectAdded} />
        </Paper>

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
                        <IconEye size={14} />
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
          <Paper shadow="sm" radius="md" style={{ width: 350, flexShrink: 0, maxHeight: height + 60, overflow: 'auto' }}>
            <ObjectManager onSaveSceneToLibrary={handleSaveSceneToLibrary} />
          </Paper>
        )}
      </Container>
      </MainLayout>
      <OpenAISettingsModal opened={settingsOpened} onClose={() => setSettingsOpened(false)} />
    </>
  )
}


