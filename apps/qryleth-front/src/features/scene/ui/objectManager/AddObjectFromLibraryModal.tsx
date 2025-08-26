import React, { useState, useEffect } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  Grid,
  ScrollArea,
  Box,
  Text
} from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { db, type ObjectRecord } from '@/shared/lib/database.ts'
import { ObjectPreviewCard } from '@/shared/ui'
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
      size="xl"
    >
      <Stack gap="md" style={{width:'100%'}}>
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
                  <ObjectPreviewCard
                    object={object}
                    onAdd={handleAddObject}
                    showAddButton={true}
                    showDeleteButton={false}
                    showDate={true}
                    size="sm"
                    loading={isLoading}
                  />
                </Grid.Col>
              ))}
            </Grid>
          )}
        </ScrollArea>
      </Stack>
    </Modal>
  )
}
