import React, { useState, useRef, useEffect } from 'react'
import {
  Container,
  Group,
  Textarea,
  Button,
  Paper,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  LoadingOverlay,
  Stack,
  Box,
  SegmentedControl,
  Modal,
  TextInput,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconWand,
  IconSettings,
  IconInfoCircle,
  IconCheck,
  IconX,
  IconEye,
  IconRun,
  IconPlaneTilt,
  IconBooks,
  IconArrowBack,
  IconArrowForward,
  IconGridDots,
  IconArrowRightBar,
  IconRotate,
  IconResize
} from '@tabler/icons-react'
import { OpenAISettingsModal } from './OpenAISettingsModal'
import { ObjectManager } from './ObjectManager.tsx'
import { Link } from 'react-router-dom'
import { db } from '../utils/database'
import { ObjectEditor } from './ObjectEditor'
import { ChatInterface } from './ChatInterface'
import { useThreeJSScene } from '../hooks/useThreeJSScene'
import { fetchSceneJSON } from '../utils/openAIAPI.ts'
import MainLayout from '../layouts/MainLayout'
import type { LightingSettings, SceneResponse } from '../types/scene'

interface SceneEditorProps {
  uuid?: string
  isNew: boolean
}
function SceneEditor({ uuid, isNew }: SceneEditorProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [settingsOpened, setSettingsOpened] = useState(false)
  const [saveSceneModalOpened, setSaveSceneModalOpened] = useState(false)
  const [editorOpened, setEditorOpened] = useState(false)
  const [editingObject, setEditingObject] = useState<{objectIndex: number, instanceId?: string} | null>(null)
  const [currentLighting, setCurrentLighting] = useState<LightingSettings>({
    ambientColor: '#87CEEB',
    ambientIntensity: 0.6,
    directionalColor: '#FFD700',
    directionalIntensity: 1.0,
    backgroundColor: '#87CEEB'
  })
  const canvasRef = useRef<HTMLDivElement>(null)

  const { buildSceneFromDescription, clearScene, updateLighting, toggleObjectVisibility, removeObjectFromScene, objectsInfo, viewMode, switchViewMode, renderMode, switchRenderMode, transformMode, switchTransformMode, toggleInstanceVisibility, removeInstance, highlightObjects, clearHighlight, selectObject, clearSelection, selectedObject, getCurrentSceneData, loadSceneData, saveObjectToLibrary, addObjectToScene, currentScene, saveCurrentSceneToLibrary, checkSceneModified, getSceneObjects, updateObjectPrimitives, undo, redo, canUndo, canRedo, toggleGridVisibility, gridVisible, layers, createLayer, updateLayer, deleteLayer, moveObjectToLayer, toggleLayerVisibility, isInitialized } = useThreeJSScene(canvasRef)

  const handleSceneGenerated = (sceneResponse: SceneResponse) => {
    setStatus('generating')
    try {
      buildSceneFromDescription(sceneResponse)
      setStatus('success')
      notifications.show({
        title: 'Успешно!',
        message: 'Сцена сгенерирована',
        color: 'green',
        icon: <IconCheck size="1rem" />,
      })
    } catch (error) {
      console.error('Scene generation error:', error)
      setStatus('error')
      notifications.show({
        title: 'Ошибка генерации',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        color: 'red',
        icon: <IconX size="1rem" />,
      })
    }
  }

  const handleObjectAdded = (objectData: any) => {
    try {
      // Create scene object from the tool data
      const sceneObject = {
        name: objectData.name,
        primitives: objectData.primitives
      }

      // Add to scene
      addObjectToScene(sceneObject, objectData.position, objectData.rotation, objectData.scale)

      notifications.show({
        title: 'Успешно!',
        message: `Объект "${objectData.name}" добавлен в сцену`,
        color: 'green',
        icon: <IconCheck size="1rem" />,
      })
    } catch (error) {
      console.error('Object addition error:', error)
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось добавить объект в сцену',
        color: 'red',
        icon: <IconX size="1rem" />,
      })
    }
  }

  const handleClear = () => {
    clearScene()
    setStatus('idle')
  }

  const handleLightingChange = (newLighting: LightingSettings) => {
    setCurrentLighting(newLighting)
    updateLighting(newLighting)
  }

  // Apply default lighting preset once the 3D scene is initialized
  useEffect(() => {
    if (isInitialized) {
      updateLighting(currentLighting)
    }
  }, [isInitialized])

  // Load scene from route once editor is initialized
  useEffect(() => {
    if (uuid && isInitialized) {
      db.getScene(uuid).then(scene => {
        if (scene) {
          loadSceneData(scene.sceneData, scene.name, scene.uuid)
        }
      })
    }
  }, [uuid, isInitialized])

  // Обработка горячих клавиш для undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          undo()
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault()
          redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const getStatusColor = () => {
    switch (status) {
      case 'generating': return 'blue'
      case 'success': return 'green'
      case 'error': return 'red'
      default: return 'gray'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'generating': return 'Генерация...'
      case 'success': return 'Готово!'
      case 'error': return 'Ошибка'
      default: return 'Готов к работе'
    }
  }

  const handleSaveSceneToLibrary = async () => {
    // Если сцена уже существует (имеет UUID), сохраняем напрямую
    if (currentScene?.uuid) {
      try {
        await saveCurrentSceneToLibrary(currentScene.name)
        notifications.show({
          title: 'Успешно!',
          message: `Сцена "${currentScene.name}" сохранена`,
          color: 'green',
          icon: <IconCheck size="1rem" />,
        })
      } catch (error) {
        notifications.show({
          title: 'Ошибка',
          message: 'Не удалось сохранить сцену',
          color: 'red',
          icon: <IconX size="1rem" />,
        })
      }
    } else {
      // Для новых сцен показываем модальное окно
      setSaveSceneModalOpened(true)
    }
  }

  const handleSaveScene = async (name: string, description?: string) => {
    try {
      await saveCurrentSceneToLibrary(name, description)
      setSaveSceneModalOpened(false)
      notifications.show({
        title: 'Успешно!',
        message: `Сцена "${name}" сохранена в библиотеку`,
        color: 'green',
        icon: <IconCheck size="1rem" />,
      })
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось сохранить сцену',
        color: 'red',
        icon: <IconX size="1rem" />,
      })
    }
  }

  const handleEditObject = (objectIndex: number, instanceId?: string) => {
    setEditingObject({ objectIndex, instanceId })
    setEditorOpened(true)
  }

  const handleSaveObjectEdit = (objectIndex: number, instanceId: string | undefined, primitiveStates: {[key: number]: {position: [number, number, number], rotation: [number, number, number], dimensions: any}}) => {
    console.log('Saving object edit:', { objectIndex, instanceId, primitiveStates })

    // Apply the changes to the actual scene
    if (instanceId) {
      // For instance editing, update the specific instance
      // TODO: Need to add updateInstanceTransform method to useThreeJSScene
      console.log('Instance editing not fully implemented yet')
    } else {
      // For object editing, update the object's primitive data
      updateObjectPrimitives(objectIndex, primitiveStates)
    }

    notifications.show({
      title: 'Успешно!',
      message: 'Изменения объекта сохранены',
      color: 'green',
      icon: <IconCheck size="1rem" />,
    })
  }

  return (
      <>
        <MainLayout
          rightSection={(
            <>
              <Badge
                color={getStatusColor()}
                variant="light"
                size="sm"
              >
                {getStatusText()}
              </Badge>

              <Tooltip label="Отменить (Ctrl+Z)">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={undo}
                  disabled={!canUndo()}
                >
                  <IconArrowBack size="1rem" />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Вернуть (Ctrl+Y)">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={redo}
                  disabled={!canRedo()}
                >
                  <IconArrowForward size="1rem" />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Библиотека">
                <ActionIcon
                  component={Link}
                  to="/"
                  variant="subtle"
                  size="sm"
                  c={"gray.4"}
                >
                  <IconBooks size="1rem" />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Настройки">
                <ActionIcon variant="subtle" size="sm" onClick={() => setSettingsOpened(true)} c={"gray.4"}>
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
              <ChatInterface
                onSceneGenerated={handleSceneGenerated}
                onObjectAdded={handleObjectAdded}
              />
            </Paper>

            <Paper
                shadow="sm"
                radius="md"
                style={{
                  flex: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 400,
                }}
            >
              <LoadingOverlay
                  visible={status === 'generating'}
                  zIndex={1000}
                  overlayProps={{ radius: 'md', blur: 2 }}
                  loaderProps={{
                    color: 'blue',
                    type: 'dots'
                  }}
              />

              <Box
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 10,
                    backgroundColor: 'transparent',
                    borderRadius: 'var(--mantine-radius-sm)',
                    padding: 6,
                  }}
              >
                <Group gap="xs">
                  <Tooltip label={gridVisible ? "Скрыть сетку" : "Показать сетку"}>
                    <ActionIcon
                      variant={gridVisible ? "filled" : "light"}
                      c={gridVisible ? "white" : "gray"}
                      onClick={toggleGridVisibility}
                      size="md"
                    >
                      {gridVisible ? <IconGridDots size={18} /> : <IconGridDots size={18} />}
                    </ActionIcon>
                  </Tooltip>

                  <Group gap="xs">
                    <Tooltip label="Перемещение">
                      <ActionIcon
                        size="md"
                        variant={transformMode === 'translate' ? 'filled' : 'light'}
                        color="blue"
                        onClick={() => switchTransformMode('translate')}
                      >
                        <IconArrowRightBar size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Поворот">
                      <ActionIcon
                        size="md"
                        variant={transformMode === 'rotate' ? 'filled' : 'light'}
                        color="green"
                        onClick={() => switchTransformMode('rotate')}
                      >
                        <IconRotate size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Масштаб">
                      <ActionIcon
                        size="md"
                        variant={transformMode === 'scale' ? 'filled' : 'light'}
                        color="orange"
                        onClick={() => switchTransformMode('scale')}
                      >
                        <IconResize size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>

                  <SegmentedControl
                      value={renderMode}
                      onChange={(value) => switchRenderMode(value as 'solid' | 'wireframe')}
                      data={[
                        { value: 'solid', label: 'Solid' },
                        { value: 'wireframe', label: 'Wireframe' }
                      ]}
                      size="xs"
                  />

                  <SegmentedControl
                      value={viewMode}
                      onChange={(value) => switchViewMode(value as 'orbit' | 'walk' | 'fly')}
                      data={[
                        {
                          value: 'orbit',
                          label: (
                            <Group gap={4} wrap={"nowrap"}>
                              <IconEye size={14} />
                              <span>Orbit</span>
                            </Group>
                          )
                        },
                        {
                          value: 'walk',
                          label: (
                            <Group gap={4} wrap={"nowrap"}>
                              <IconRun size={14} />
                              <span>Walk</span>
                            </Group>
                          )
                        },
                        {
                          value: 'fly',
                          label: (
                            <Group gap={4} wrap={"nowrap"}>
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

              <Box
                  ref={canvasRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 'var(--mantine-radius-md)'
                  }}
              />
            </Paper>

            <ObjectManager
                objects={objectsInfo}
                onToggleVisibility={toggleObjectVisibility}
                onRemoveObject={removeObjectFromScene}
                onToggleInstanceVisibility={toggleInstanceVisibility}
                onRemoveInstance={removeInstance}
                onHighlightObject={highlightObjects}
                onClearHighlight={clearHighlight}
                onSelectObject={selectObject}
                selectedObject={selectedObject}
                onSaveObjectToLibrary={saveObjectToLibrary}
                currentScene={currentScene}
                onSaveSceneToLibrary={handleSaveSceneToLibrary}
                onEditObject={handleEditObject}
                lighting={currentLighting}
                onLightingChange={handleLightingChange}
                layers={layers}
                onCreateLayer={createLayer}
                onUpdateLayer={updateLayer}
                onDeleteLayer={deleteLayer}
                onToggleLayerVisibility={toggleLayerVisibility}
                onMoveObjectToLayer={moveObjectToLayer}
            />
          </Container>
        </MainLayout>
        <OpenAISettingsModal opened={settingsOpened} onClose={() => setSettingsOpened(false)} />

        {/* Quick Save Scene Modal */}
        <SaveSceneModal
          opened={saveSceneModalOpened}
          onClose={() => setSaveSceneModalOpened(false)}
          onSave={handleSaveScene}
          currentSceneName={currentScene?.name}
        />

        {/* Object Editor Modal */}
        <ObjectEditor
          opened={editorOpened}
          onClose={() => setEditorOpened(false)}
          objectInfo={editingObject ? objectsInfo.find(obj => obj.objectIndex === editingObject.objectIndex) : undefined}
          instanceId={editingObject?.instanceId}
          objectData={editingObject ? JSON.parse(JSON.stringify(getSceneObjects()[editingObject.objectIndex])) : undefined}
          onSave={handleSaveObjectEdit}
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
  }, [opened, currentSceneName])

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

export default SceneEditor
