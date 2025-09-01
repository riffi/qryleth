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
import { db, type SceneRecord, type ObjectRecord } from '@/shared/lib/database'
import { loadScenes as loadScenesApi, loadObjects as loadObjectsApi } from '@/features/object-library'
import { LibraryObjectCard, LibraryBrowser, useLibrarySearch } from '@/features/object-library'
//__REPLACE_BELOW__
import MainLayout from '@/widgets/layouts/MainLayout'
import { useNavigate } from 'react-router-dom'
import { useVisualSettingsStore } from '@/shared/model/visualSettingsStore'

const LibraryPage: React.FC = () => {
  const navigate = useNavigate()
  const [scenes, setScenes] = useState<SceneRecord[]>([])
  const [objects, setObjects] = useState<ObjectRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading] = useState(false)
  // Читаем и сохраняем активную вкладку через глобальный визуальный стор
  const activeTab = useVisualSettingsStore(s => s.libraryTab)
  const setActiveTabRaw = useVisualSettingsStore(s => s.setLibraryTab)
  const setActiveTab = (value: string | null) => setActiveTabRaw((value as 'scenes' | 'objects') ?? 'scenes')

  const loadScenes = async () => {
    try {
      const allScenes = await loadScenesApi()
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
      const allObjects = await loadObjectsApi()
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

  const filteredScenes = useLibrarySearch(scenes, searchQuery, (s) => `${s.name} ${s.description ?? ''}`)
  const filteredObjects = useLibrarySearch(objects, searchQuery, (o) => `${o.name} ${o.description ?? ''}`)

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
        <LibraryBrowser
          scenes={filteredScenes}
          objects={filteredObjects}
          isLoading={isLoading}
          onEditScene={handleEditScene}
          onDeleteScene={handleDeleteScene}
          onCreateScene={() => navigate('/scenes/new')}
          onEditObject={handleEditObject}
          onDeleteObject={handleDeleteObject}
          onCreateObject={() => navigate('/objects/new')}
        />
      </Stack>
    </MainLayout>
  )
}

export default LibraryPage
