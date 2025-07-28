import React, { useState, useEffect } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  Grid,
  Card,
  Text,
  Group,
  Badge,
  Button,
  ScrollArea,
  Box,
  ActionIcon,
  Tooltip
} from '@mantine/core'
import { IconSearch, IconCalendar, IconCube, IconX } from '@tabler/icons-react'
import { db, type ObjectRecord } from '@/shared/lib/database.ts'
import { notifications } from '@mantine/notifications'
import type { SceneObject } from '@/entities/scene/types'

interface AddObjectFromLibraryModalProps {
  opened: boolean
  onClose: () => void
  onAddObject: (object: ObjectRecord) => void
  targetLayerId: string | null
  /** Список объектов сцены для фильтрации уже добавленных */
  sceneObjects: SceneObject[]
}

export const AddObjectFromLibraryModal: React.FC<AddObjectFromLibraryModalProps> = ({
  opened,
  onClose,
  onAddObject,
  targetLayerId,
  sceneObjects
}) => {
  const [objects, setObjects] = useState<ObjectRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Загружает все объекты библиотеки из IndexedDB
   */
  const loadObjects = async () => {
    try {
      setIsLoading(true)
      const allObjects = await db.getAllObjects()
      setObjects(allObjects)
    } catch (error) {
      console.error('Error loading objects:', error)
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить объекты из библиотеки',
        color: 'red'
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Список объектов библиотеки без тех, что уже есть в сцене
   */
  const availableObjects = React.useMemo(
    () =>
      objects.filter(
        object => !sceneObjects.some(o => o.libraryUuid === object.uuid)
      ),
    [objects, sceneObjects]
  )

  const filteredObjects = availableObjects.filter(
    object =>
      object.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (object.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

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
    if (opened) {
      loadObjects()
    }
  }, [opened])

  /**
   * Добавляет выбранный объект в сцену и закрывает окно
   */
  const handleAddObject = (object: ObjectRecord) => {
    onAddObject(object)
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Добавить объект из библиотеки"
      size="lg"
      styles={{ body: { maxHeight: '70vh', overflow: 'hidden' } }}
    >
      <Stack gap="md">
        <TextInput
          placeholder="Поиск объектов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1 }}
        />

        <ScrollArea style={{ height: 'calc(70vh - 120px)' }}>
          {filteredObjects.length === 0 ? (
            <Box ta="center" py="xl">
              <Text size="lg" c="dimmed">
                {searchQuery ? 'Объекты не найдены' : 'Нет сохраненных объектов'}
              </Text>
              <Text size="sm" c="dimmed" mt="xs">
                {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Создайте объекты в редакторе объектов'}
              </Text>
            </Box>
          ) : (
            <Grid>
              {filteredObjects.map((object) => (
                <Grid.Col key={object.uuid} span={{ base: 12, sm: 6, md: 4 }}>
                  <Card shadow="sm" padding="md" radius="md" withBorder>
                    <Stack gap="sm">
                      <Group justify="space-between" align="flex-start">
                        <Box style={{ flex: 1 }}>
                          <Text fw={500} lineClamp={1}>{object.name}</Text>
                          {object.description && (
                            <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                              {object.description}
                            </Text>
                          )}
                        </Box>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => onClose()}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>

                      <Group gap="xs">
                        <IconCalendar size={14} />
                        <Text size="xs" c="dimmed">
                          {formatDate(object.updatedAt)}
                        </Text>
                      </Group>

                      <Group gap="xs" mt="xs">
                        <Badge color="blue" variant="light" size="sm">
                          {object.objectData.primitives.length} примитивов
                        </Badge>
                      </Group>

                      <Group gap="xs" mt="xs">
                        <Button
                          size="xs"
                          leftSection={<IconCube size={14} />}
                          onClick={() => handleAddObject(object)}
                          loading={isLoading}
                          style={{ flex: 1 }}
                        >
                          Добавить
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          )}
        </ScrollArea>
      </Stack>
    </Modal>
  )
}
