import React, { useState, useEffect } from 'react'
import {
  Stack,
  Title,
  Text,
  Group,
  Button,
  TextInput,
  Grid,
  Card,
  ActionIcon,
  Tooltip,
  Badge,
  ScrollArea,
  Box,
  Divider,
  Tabs
} from '@mantine/core'
import {
  IconTrash,
  IconEdit,
  IconSearch,
  IconCalendar,
  IconCube,
  IconPhoto
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { db, type SceneRecord, type ObjectRecord } from '../shared/lib/database'
import MainLayout from '../widgets/layouts/MainLayout'
import { useNavigate } from 'react-router-dom'

const LibraryPage: React.FC = () => {
  const navigate = useNavigate()
  const [scenes, setScenes] = useState<SceneRecord[]>([])
  const [objects, setObjects] = useState<ObjectRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('scenes')

  const loadScenes = async () => {
    try {
      const allScenes = await db.getAllScenes()
      setScenes(allScenes)
    } catch (error) {
      console.error('Error loading scenes:', error)
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить сцены из библиотеки',
        color: 'red'
      })
    }
  }

  const loadObjects = async () => {
    try {
      const allObjects = await db.getAllObjects()
      setObjects(allObjects)
    } catch (error) {
      console.error('Error loading objects:', error)
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить объекты из библиотеки',
        color: 'red'
      })
    }
  }

  const filteredScenes = scenes.filter(scene =>
    scene.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (scene.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  const filteredObjects = objects.filter(object =>
    object.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (object.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  const handleEditScene = (scene: SceneRecord) => {
    navigate(`/scenes/${scene.uuid}/edit`)
  }

  const handleDeleteScene = async (scene: SceneRecord) => {
    try {
      await db.deleteScene(scene.uuid)
      await loadScenes()
      notifications.show({
        title: 'Успешно!',
        message: `Сцена "${scene.name}" удалена`,
        color: 'green'
      })
    } catch (error) {
      console.error('Error deleting scene:', error)
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось удалить сцену',
        color: 'red'
      })
    }
  }

  const handleDeleteObject = async (object: ObjectRecord) => {
    try {
      await db.deleteObject(object.uuid)
      await loadObjects()
      notifications.show({
        title: 'Успешно!',
        message: `Объект "${object.name}" удален`,
        color: 'green'
      })
    } catch (error) {
      console.error('Error deleting object:', error)
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось удалить объект',
        color: 'red'
      })
    }
  }

  const handleEditObject = (object: ObjectRecord) => {
    navigate(`/objects/${object.uuid}/edit`)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  useEffect(() => {
    loadScenes()
    loadObjects()
  }, [])

  return (
    <MainLayout>
      <Stack p="md" gap="md">
        <Group justify="space-between">
          <Group gap="sm">
            <Title order={3}>Библиотека</Title>
            <Badge color="blue" variant="light">
              {activeTab === 'scenes' ? `${scenes.length} сцен` : `${objects.length} объектов`}
            </Badge>
          </Group>
          {activeTab === 'scenes' ? (
            <Button size="sm" onClick={() => navigate('/scenes/new')}>Создать сцену</Button>
          ) : (
            <Button size="sm" onClick={() => navigate('/objects/new')}>Создать объект</Button>
          )}
        </Group>
        <Divider />
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="scenes" leftSection={<IconPhoto size={16} />}>Сцены</Tabs.Tab>
            <Tabs.Tab value="objects" leftSection={<IconCube size={16} />}>Объекты</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="scenes">
            <Stack gap="md" mt="md">
              <Group justify="space-between">
                <TextInput
                  placeholder="Поиск по названию или описанию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  leftSection={<IconSearch size={16} />}
                  style={{ flex: 1 }}
                />
              </Group>
              <ScrollArea style={{ height: 'calc(100vh - 200px)' }}>
                {filteredScenes.length === 0 ? (
                  <Box ta="center" py="xl">
                    <Text size="lg" c="dimmed">
                      {searchQuery ? 'Сцены не найдены' : 'Библиотека пуста'}
                    </Text>
                    <Text size="sm" c="dimmed" mt="xs">
                      {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Сохраните первую сцену, чтобы начать'}
                    </Text>
                  </Box>
                ) : (
                  <Grid>
                    {filteredScenes.map((scene) => (
                      <Grid.Col key={scene.uuid} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                        <Card shadow="sm" padding="md" radius="md" withBorder>
                          <Stack gap="sm">
                            <Group justify="space-between" align="flex-start">
                              <Box style={{ flex: 1 }}>
                                <Text fw={500} lineClamp={1}>{scene.name}</Text>
                                {scene.description && (
                                  <Text size="sm" c="dimmed" lineClamp={2} mt={4}>{scene.description}</Text>
                                )}
                              </Box>
                            </Group>
                            <Group gap="xs" mt="auto">
                              <IconCalendar size={14} />
                              <Text size="xs" c="dimmed">{formatDate(scene.updatedAt)}</Text>
                            </Group>
                            <Group gap="xs" mt="xs">
                              <Button
                                size="xs"
                                leftSection={<IconEdit size={14} />}
                                onClick={() => handleEditScene(scene)}
                                loading={isLoading}
                                style={{ flex: 1 }}
                              >
                                Редактировать
                              </Button>
                              <Tooltip label="Удалить сцену">
                                <ActionIcon
                                  size="sm"
                                  color="red"
                                  variant="subtle"
                                  onClick={() => handleDeleteScene(scene)}
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Stack>
                        </Card>
                      </Grid.Col>
                    ))}
                  </Grid>
                )}
              </ScrollArea>
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="objects">
            <Stack gap="md" mt="md">
              <Group justify="space-between">
                <TextInput
                  placeholder="Поиск объектов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  leftSection={<IconSearch size={16} />}
                  style={{ flex: 1 }}
                />
              </Group>
              <ScrollArea style={{ height: 'calc(100vh - 280px)' }}>
                {filteredObjects.length === 0 ? (
                  <Box ta="center" py="xl">
                    <Text size="lg" c="dimmed">
                      {searchQuery ? 'Объекты не найдены' : 'Нет сохраненных объектов'}
                    </Text>
                    <Text size="sm" c="dimmed" mt="xs">
                      {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Сохраните объекты через менеджер объектов'}
                    </Text>
                  </Box>
                ) : (
                  <Grid>
                    {filteredObjects.map((object) => (
                      <Grid.Col key={object.uuid} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                        <Card shadow="sm" padding="md" radius="md" withBorder>
                          <Stack gap="sm">
                            <Group justify="space-between" align="flex-start">
                              <Box style={{ flex: 1 }}>
                                <Text fw={500} lineClamp={1}>{object.name}</Text>
                                {object.description && (
                                  <Text size="sm" c="dimmed" lineClamp={2} mt={4}>{object.description}</Text>
                                )}
                              </Box>
                            </Group>
                            <Group gap="xs" mt="auto">
                              <IconCalendar size={14} />
                              <Text size="xs" c="dimmed">{formatDate(object.updatedAt)}</Text>
                            </Group>
                            <Group gap="xs" mt="xs">
                              <Button
                                size="xs"
                                leftSection={<IconEdit size={14} />}
                                onClick={() => handleEditObject(object)}
                                loading={isLoading}
                                style={{ flex: 1 }}
                              >
                                Редактировать
                              </Button>
                              <Tooltip label="Удалить объект">
                                <ActionIcon
                                  size="sm"
                                  color="red"
                                  variant="subtle"
                                  onClick={() => handleDeleteObject(object)}
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Stack>
                        </Card>
                      </Grid.Col>
                    ))}
                  </Grid>
                )}
              </ScrollArea>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </MainLayout>
  )
}

export default LibraryPage
