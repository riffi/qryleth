import React, { useState, useRef, useEffect } from 'react'
import {
  AppShell,
  Container,
  Group,
  Textarea,
  Button,
  Title,
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
  IconBrain,
  IconEye,
  IconRun,
  IconBooks,
  IconArrowBack,
  IconArrowForward
} from '@tabler/icons-react'
import { OpenAISettingsModal } from './components/OpenAISettingsModal'
import { SceneManager } from './components/SceneManager.tsx'
import { SceneLibraryModal } from './components/SceneLibraryModal'
import { ObjectEditor } from './components/ObjectEditor'
import { useThreeJSScene } from './hooks/useThreeJSScene'
import { fetchSceneJSON } from './utils/openAIAPI.ts'
import type {LightingSettings} from './types/scene'

function App() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [settingsOpened, setSettingsOpened] = useState(false)
  const [libraryOpened, setLibraryOpened] = useState(false)
  const [saveSceneModalOpened, setSaveSceneModalOpened] = useState(false)
  const [editorOpened, setEditorOpened] = useState(false)
  const [editingObject, setEditingObject] = useState<{objectIndex: number, instanceId?: string} | null>(null)
  const [currentLighting, setCurrentLighting] = useState<LightingSettings>({
    ambientColor: '#404040',
    ambientIntensity: 0.6,
    directionalColor: '#ffffff',
    directionalIntensity: 1.0,
    backgroundColor: '#f8f9fa'
  })
  const canvasRef = useRef<HTMLDivElement>(null)

  const { buildSceneFromDescription, clearScene, updateLighting, toggleObjectVisibility, removeObjectFromScene, objectsInfo, viewMode, switchViewMode, toggleInstanceVisibility, removeInstance, highlightObjects, clearHighlight, selectObject, clearSelection, selectedObject, getCurrentSceneData, loadSceneData, saveObjectToLibrary, addObjectToScene, currentScene, saveCurrentSceneToLibrary, checkSceneModified, getSceneObjects, updateObjectPrimitives, undo, redo, canUndo, canRedo } = useThreeJSScene(canvasRef)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      notifications.show({
        title: 'Ошибка',
        message: 'Введите описание объекта',
        color: 'red',
        icon: <IconX size="1rem" />,
      })
      return
    }

    setLoading(true)
    setStatus('generating')

    try {
      const sceneJSON = await fetchSceneJSON(prompt)
      buildSceneFromDescription(sceneJSON)
      setStatus('success')

      notifications.show({
        title: 'Успешно!',
        message: 'Сцена сгенерирована',
        color: 'green',
        icon: <IconCheck size="1rem" />,
      })
    } catch (error) {
      console.error('Generation error:', error)
      setStatus('error')

      notifications.show({
        title: 'Ошибка генерации',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        color: 'red',
        icon: <IconX size="1rem" />,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    clearScene()
    setStatus('idle')
    setPrompt('')
  }

  const handleLightingChange = (newLighting: LightingSettings) => {
    setCurrentLighting(newLighting)
    updateLighting(newLighting)
  }

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
        <AppShell
            header={{ height: 60 }}
            padding="sm"
            styles={{
              main: {
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
              },
            }}
        >
          <AppShell.Header>
            <Container size="xl" h="100%">
              <Group h="100%" justify="space-between">
                <Group gap="sm">
                  <IconBrain size={24} color="var(--mantine-color-gray-6)" />
                  <Title order={3} c="gray.5">
                    Qryleth 3D
                  </Title>
                </Group>

                <Group gap="xs">
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
                    <ActionIcon variant="subtle" size="sm" onClick={() => setLibraryOpened(true)} c={"gray.4"}>
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
                </Group>
              </Group>
            </Container>
          </AppShell.Header>

          <AppShell.Main>
            <Container
                size="xl"
                fluid
                h="100%"
                style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: 'var(--mantine-spacing-sm)' }}
            >
              <Paper shadow="sm" radius="md" p="sm" style={{ width: 320 }}>
                <Stack gap="sm">
                  <Title order={4} c="gray.6" size="md">
                    Чат
                  </Title>
                  <Textarea
                      placeholder="Опишите объект (например, 'дерево', 'дом', 'автомобиль')"
                      value={prompt}
                      autosize
                      minRows={2}
                      maxRows={8}
                      onChange={(event) => setPrompt(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !loading) {
                          handleGenerate()
                        }
                      }}
                      style={{ flex: 1 }}
                      size="sm"
                      disabled={loading}
                  />
                  <Group gap="xs">
                    <Button
                        onClick={handleGenerate}
                        loading={loading}
                        leftSection={<IconWand size="0.9rem" />}
                        size="sm"
                        disabled={!prompt.trim()}
                        style={{ flex: 1 }}
                    >
                      Создать
                    </Button>

                    <Button
                        onClick={handleClear}
                        variant="light"
                        color="gray"
                        size="sm"
                        disabled={loading}
                    >
                      Очистить
                    </Button>
                  </Group>

                  <Text size="xs" c="dimmed">
                    Опишите объект на русском языке для создания 3D-модели
                  </Text>
                </Stack>
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
                    visible={loading}
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
                      right: 8,
                      zIndex: 10,
                      backgroundColor: 'transparent',
                      borderRadius: 'var(--mantine-radius-sm)',
                      padding: 6,
                    }}
                >
                  <SegmentedControl
                      value={viewMode}
                      onChange={(value) => switchViewMode(value as 'orbit' | 'walk')}
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
                            <Group gap={4}>
                              <IconRun size={14} />
                              <span>Walk</span>
                            </Group>
                          )
                        }
                      ]}
                      size="xs"
                  />
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

              <SceneManager
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
              />
            </Container>
          </AppShell.Main>
        </AppShell>
        <OpenAISettingsModal opened={settingsOpened} onClose={() => setSettingsOpened(false)} />
        <SceneLibraryModal 
          opened={libraryOpened} 
          onClose={() => setLibraryOpened(false)}
          onLoadScene={loadSceneData}
          onSaveCurrentScene={saveCurrentSceneToLibrary}
          onAddObjectToScene={addObjectToScene}
        />
        
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
          objectData={editingObject ? getSceneObjects()[editingObject.objectIndex] : undefined}
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

export default App