import React from 'react'
import { Stack, Group, Tabs, TextInput, Text, Grid, Card, ActionIcon, Tooltip, ScrollArea, Box, Button } from '@mantine/core'
import { IconSearch, IconPhoto, IconCube, IconEdit, IconTrash, IconCalendar } from '@tabler/icons-react'
import type { SceneRecord, ObjectRecord } from '@/shared/lib/database'
import { LibraryObjectCard } from './LibraryObjectCard'
import { useLibraryStore } from '../model/libraryStore'
import { useLibrarySearch } from '../lib/hooks/useLibrarySearch'

export interface LibraryBrowserProps {
  scenes: SceneRecord[]
  objects: ObjectRecord[]
  isLoading?: boolean
  onEditScene: (scene: SceneRecord) => void
  onDeleteScene: (scene: SceneRecord) => void
  onCreateScene: () => void
  onEditObject: (obj: ObjectRecord) => void
  onDeleteObject: (obj: ObjectRecord) => void
  onCreateObject: () => void
}

/**
 * LibraryBrowser — презентационная оболочка вкладок Библиотеки с поиском и списками.
 * Не работает с БД напрямую — данные и обработчики приходят из внешнего кода (страницы).
 */
export const LibraryBrowser: React.FC<LibraryBrowserProps> = ({
  scenes,
  objects,
  isLoading,
  onEditScene,
  onDeleteScene,
  onCreateScene,
  onEditObject,
  onDeleteObject,
  onCreateObject
}) => {
  const searchQuery = useLibraryStore(s => s.searchQuery)
  const setSearchQuery = useLibraryStore(s => s.setSearchQuery)

  const filteredScenes = useLibrarySearch(scenes, searchQuery, (s) => `${s.name} ${s.description ?? ''}`)
  const filteredObjects = useLibrarySearch(objects, searchQuery, (o) => {
    const tags = (o.tags && Array.isArray(o.tags)) ? o.tags.join(' ') : (o.objectData?.tags || []).join(' ')
    return `${o.name} ${o.description ?? ''} ${tags}`
  })

  const formatDate = (date: Date) => new Date(date).toLocaleString('ru-RU', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <TextInput
          placeholder="Поиск по названию или описанию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1 }}
        />
        <Group>
          <Button size="sm" onClick={onCreateScene}>Создать сцену</Button>
          <Button size="sm" onClick={onCreateObject}>Создать объект</Button>
        </Group>
      </Group>

      <Tabs defaultValue="scenes">
        <Tabs.List>
          <Tabs.Tab value="scenes" leftSection={<IconPhoto size={16} />}>Сцены</Tabs.Tab>
          <Tabs.Tab value="objects" leftSection={<IconCube size={16} />}>Объекты</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="scenes">
          <ScrollArea style={{ height: 'calc(100vh - 260px)' }} styles={{ viewport: { overflowX: 'hidden' } }}>
            {filteredScenes.length === 0 ? (
              <Box ta="center" py="xl">
                <Text size="lg" c="dimmed">{searchQuery ? 'Сцены не найдены' : 'Библиотека пуста'}</Text>
                <Text size="sm" c="dimmed" mt="xs">{searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Сохраните первую сцену, чтобы начать'}</Text>
              </Box>
            ) : (
              <Box px="sm">
                <Grid>
                  {filteredScenes.map((scene) => (
                    <Grid.Col key={scene.uuid} span={{ base: 12, sm: 6, md: 4, lg: 3, xl: 2 }}>
                      <Card shadow="sm" padding="md" radius="md" withBorder>
                        <Stack gap="sm">
                          <Group justify="space_between" align="flex-start">
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
                              onClick={() => onEditScene(scene)}
                              loading={isLoading}
                              style={{ flex: 1 }}
                            >
                              Редактировать
                            </Button>
                            <Tooltip label="Удалить сцену">
                              <ActionIcon size="sm" color="red" variant="subtle" onClick={() => onDeleteScene(scene)}>
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              </Box>
            )}
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel value="objects">
          <ScrollArea style={{ height: 'calc(100vh - 260px)' }} styles={{ viewport: { overflowX: 'hidden' } }}>
            {filteredObjects.length === 0 ? (
              <Box ta="center" py="xl">
                <Text size="lg" c="dimmed">{searchQuery ? 'Объекты не найдены' : 'Нет сохраненных объектов'}</Text>
                <Text size="sm" c="dimmed" mt="xs">{searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Сохраните объекты через менеджер объектов'}</Text>
              </Box>
            ) : (
              <Box px="sm">
                <Grid>
                  {filteredObjects.map((object) => (
                    <Grid.Col key={object.uuid} span={{ base: 12, sm: 6, md: 4, lg: 3, xl: 2 }}>
                      <LibraryObjectCard
                        object={object}
                        onEdit={onEditObject}
                        onDelete={onDeleteObject}
                        showDeleteButton={true}
                        showDate={true}
                        size="sm"
                        loading={isLoading}
                      />
                    </Grid.Col>
                  ))}
                </Grid>
              </Box>
            )}
          </ScrollArea>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
