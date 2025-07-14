import React, { useState, useRef } from 'react'
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
  IconBooks
} from '@tabler/icons-react'
import { OpenAISettingsModal } from './components/OpenAISettingsModal'
import { ObjectManager } from './components/ObjectManager'
import { SceneLibraryModal } from './components/SceneLibraryModal'
import { useThreeJSScene } from './hooks/useThreeJSScene'
import { fetchSceneJSON } from './utils/openAIAPI.ts'

function App() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [settingsOpened, setSettingsOpened] = useState(false)
  const [libraryOpened, setLibraryOpened] = useState(false)
  const [saveSceneModalOpened, setSaveSceneModalOpened] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const { buildSceneFromDescription, clearScene, toggleObjectVisibility, removeObjectFromScene, objectsInfo, viewMode, switchViewMode, toggleInstanceVisibility, removeInstance, highlightObjects, clearHighlight, selectObject, clearSelection, selectedObject, getCurrentSceneData, loadSceneData, saveObjectToLibrary, addObjectToScene, currentScene, saveCurrentSceneToLibrary, checkSceneModified } = useThreeJSScene(canvasRef)

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

  const handleSaveSceneToLibrary = () => {
    setSaveSceneModalOpened(true)
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
                  <IconBrain size={24} color="var(--mantine-color-blue-6)" />
                  <Title order={3} c="blue.6">
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

                  <Tooltip label="Библиотека">
                    <ActionIcon variant="subtle" size="sm" onClick={() => setLibraryOpened(true)}>
                      <IconBooks size="1rem" />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label="Настройки">
                    <ActionIcon variant="subtle" size="sm" onClick={() => setSettingsOpened(true)}>
                      <IconSettings size="1rem" />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label="Справка">
                    <ActionIcon variant="subtle" size="sm">
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
                      backgroundColor: 'var(--mantine-color-white)',
                      borderRadius: 'var(--mantine-radius-sm)',
                      padding: 6,
                      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)'
                    }}
                >
                  <SegmentedControl
                      value={viewMode}
                      onChange={(value) => switchViewMode(value as 'orbit' | 'walk')}
                      data={[
                        {
                          value: 'orbit',
                          label: (
                            <Group gap={4}>
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