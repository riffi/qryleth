import { useState, useRef } from 'react'
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
  IconRun
} from '@tabler/icons-react'
import { OpenAISettingsModal } from './components/OpenAISettingsModal'
import { ObjectManager } from './components/ObjectManager'
import { useThreeJSScene } from './hooks/useThreeJSScene'
import { fetchSceneJSON } from './utils/openAIAPI.ts'

function App() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [settingsOpened, setSettingsOpened] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const { buildSceneFromDescription, clearScene, toggleObjectVisibility, removeObjectFromScene, objectsInfo, viewMode, switchViewMode } = useThreeJSScene(canvasRef)

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

  return (
      <>
        <AppShell
            header={{ height: 70 }}
            padding="md"
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
                <Group>
                  <IconBrain size={32} color="var(--mantine-color-blue-6)" />
                  <Title order={2} c="blue.6">
                    Qryleth 3D Generator
                  </Title>
                </Group>

                <Group>
                  <Badge
                      color={getStatusColor()}
                      variant="light"
                      size="lg"
                  >
                    {getStatusText()}
                  </Badge>

                  <Tooltip label="Настройки">
                    <ActionIcon variant="subtle" size="lg" onClick={() => setSettingsOpened(true)}>
                      <IconSettings size="1.2rem" />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label="Информация">
                    <ActionIcon variant="subtle" size="lg">
                      <IconInfoCircle size="1.2rem" />
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
                style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: 'var(--mantine-spacing-md)' }}
            >
              <Paper shadow="sm" radius="md" p="md" style={{ width: 360 }}>
                <Stack gap="md">
                  <Textarea
                      placeholder="Опишите объект (например, 'дерево', 'дом', 'автомобиль')"
                      value={prompt}
                      autosize
                      minRows={3}
                      maxRows={10}
                      onChange={(event) => setPrompt(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !loading) {
                          handleGenerate()
                        }
                      }}
                      style={{ flex: 1 }}
                      size="md"
                      disabled={loading}
                  />
                  <Group>

                    <Button
                        onClick={handleGenerate}
                        loading={loading}
                        leftSection={<IconWand size="1rem" />}
                        size="md"
                        disabled={!prompt.trim()}
                    >
                      Сгенерировать
                    </Button>

                    <Button
                        onClick={handleClear}
                        variant="light"
                        color="gray"
                        size="md"
                        disabled={loading}
                    >
                      Очистить
                    </Button>
                  </Group>

                  <Text size="sm" c="dimmed">
                    Опишите объект на русском языке, и ИИ создаст его 3D-модель в реальном времени.
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
                      top: 10,
                      right: 10,
                      zIndex: 10,
                      backgroundColor: 'var(--mantine-color-white)',
                      borderRadius: 'var(--mantine-radius-md)',
                      padding: 8,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                    }}
                >
                  <SegmentedControl
                      value={viewMode}
                      onChange={(value) => switchViewMode(value as 'orbit' | 'walk')}
                      data={[
                        {
                          value: 'orbit',
                          label: (
                            <Group gap={8}>
                              <IconEye size={16} />
                              <span>Orbit</span>
                            </Group>
                          )
                        },
                        {
                          value: 'walk',
                          label: (
                            <Group gap={8}>
                              <IconRun size={16} />
                              <span>Walk</span>
                            </Group>
                          )
                        }
                      ]}
                      size="sm"
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
              />
            </Container>
          </AppShell.Main>
        </AppShell>
        <OpenAISettingsModal opened={settingsOpened} onClose={() => setSettingsOpened(false)} />
      </>
  )
}

export default App