import React, { useState, useEffect } from 'react'
import {
    Modal,
    Stack,
    Title,
    Text,
    Group,
    Button,
    TextInput,
    Textarea,
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
    IconPlus,
    IconTrash,
    IconDownload,
    IconSearch,
    IconCalendar,
    IconEdit,
    IconGavel,
    IconCube,
    IconPhoto
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { db, type SceneRecord, type ObjectRecord } from '../utils/database'

interface SceneLibraryModalProps {
    opened: boolean
    onClose: () => void
    onLoadScene?: (sceneData: any, sceneName?: string, sceneUuid?: string) => void
    onSaveCurrentScene?: (name: string, description?: string) => Promise<string>
    onAddObjectToScene?: (objectData: any) => void
}

export const SceneLibraryModal: React.FC<SceneLibraryModalProps> = ({
    opened,
    onClose,
    onLoadScene,
    onSaveCurrentScene,
    onAddObjectToScene
}) => {
    const [scenes, setScenes] = useState<SceneRecord[]>([])
    const [objects, setObjects] = useState<ObjectRecord[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [saveModalOpened, setSaveModalOpened] = useState(false)
    const [sceneName, setSceneName] = useState('')
    const [sceneDescription, setSceneDescription] = useState('')
    const [activeTab, setActiveTab] = useState<string>('scenes')

    // Load scenes from database
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

    // Load objects from database
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

    // Filter scenes by search query
    const filteredScenes = scenes.filter(scene =>
        scene.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (scene.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )

    // Filter objects by search query
    const filteredObjects = objects.filter(object =>
        object.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (object.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )

    // Load scene from library
    const handleLoadScene = async (scene: SceneRecord) => {
        try {
            setIsLoading(true)
            onLoadScene?.(scene.sceneData, scene.name, scene.uuid)
            onClose()
            notifications.show({
                title: 'Успешно!',
                message: `Сцена "${scene.name}" загружена`,
                color: 'green'
            })
        } catch (error) {
            console.error('Error loading scene:', error)
            notifications.show({
                title: 'Ошибка',
                message: 'Не удалось загрузить сцену',
                color: 'red'
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Delete scene from library
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

    // Save current scene to library
    const handleSaveCurrentScene = async () => {
        if (!sceneName.trim()) {
            notifications.show({
                title: 'Ошибка',
                message: 'Введите название сцены',
                color: 'red'
            })
            return
        }

        try {
            await onSaveCurrentScene?.(sceneName.trim(), sceneDescription.trim())
            await loadScenes()
            setSaveModalOpened(false)
            setSceneName('')
            setSceneDescription('')
            
            notifications.show({
                title: 'Успешно!',
                message: `Сцена "${sceneName}" сохранена в библиотеку`,
                color: 'green'
            })
        } catch (error) {
            console.error('Error saving scene:', error)
            notifications.show({
                title: 'Ошибка',
                message: 'Не удалось сохранить сцену',
                color: 'red'
            })
        }
    }

    // Add object to scene
    const handleAddObjectToScene = async (object: ObjectRecord) => {
        try {
            setIsLoading(true)
            onAddObjectToScene?.(object.objectData)
            notifications.show({
                title: 'Успешно!',
                message: `Объект "${object.name}" добавлен на сцену`,
                color: 'green'
            })
        } catch (error) {
            console.error('Error adding object to scene:', error)
            notifications.show({
                title: 'Ошибка',
                message: 'Не удалось добавить объект на сцену',
                color: 'red'
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Delete object from library
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

    // Format date for display
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
            loadScenes()
            loadObjects()
        }
    }, [opened])

    return (
        <>
            <Modal
                opened={opened}
                onClose={onClose}
                title={
                    <Group>
                        <Title order={3}>Библиотека</Title>
                        <Badge color="blue" variant="light">
                            {activeTab === 'scenes' ? `${scenes.length} сцен` : `${objects.length} объектов`}
                        </Badge>
                    </Group>
                }
                size="xl"
                fullScreen
                padding="lg"
            >
                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Tab value="scenes" leftSection={<IconPhoto size={16} />}>
                            Сцены
                        </Tabs.Tab>
                        <Tabs.Tab value="objects" leftSection={<IconCube size={16} />}>
                            Объекты
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="scenes">
                        <Stack gap="md" mt="md">
                            {/* Controls for Scenes */}
                            <Group justify="space-between">
                                <TextInput
                                    placeholder="Поиск по названию или описанию..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                                    leftSection={<IconSearch size={16} />}
                                    style={{ flex: 1 }}
                                />
                                <Button
                                    leftSection={<IconGavel size={16} />}
                                    onClick={() => setSaveModalOpened(true)}
                                    variant="light"
                                >
                                    Сохранить текущую сцену
                                </Button>
                            </Group>

                    {/* Scenes Grid */}
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
                                                        <Text fw={500} lineClamp={1}>
                                                            {scene.name}
                                                        </Text>
                                                        {scene.description && (
                                                            <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                                                                {scene.description}
                                                            </Text>
                                                        )}
                                                    </Box>
                                                </Group>

                                                <Group gap="xs" mt="auto">
                                                    <IconCalendar size={14} />
                                                    <Text size="xs" c="dimmed">
                                                        {formatDate(scene.updatedAt)}
                                                    </Text>
                                                </Group>

                                                <Group gap="xs" mt="xs">
                                                    <Button
                                                        size="xs"
                                                        leftSection={<IconDownload size={14} />}
                                                        onClick={() => handleLoadScene(scene)}
                                                        loading={isLoading}
                                                        style={{ flex: 1 }}
                                                    >
                                                        Загрузить
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
                            {/* Controls for Objects */}
                            <Group justify="space-between">
                                <TextInput
                                    placeholder="Поиск объектов..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                                    leftSection={<IconSearch size={16} />}
                                    style={{ flex: 1 }}
                                />
                            </Group>

                            {/* Objects Grid */}
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
                                                                <Text fw={500} lineClamp={1}>
                                                                    {object.name}
                                                                </Text>
                                                                {object.description && (
                                                                    <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                                                                        {object.description}
                                                                    </Text>
                                                                )}
                                                            </Box>
                                                        </Group>

                                                        <Group gap="xs" mt="auto">
                                                            <IconCalendar size={14} />
                                                            <Text size="xs" c="dimmed">
                                                                {formatDate(object.updatedAt)}
                                                            </Text>
                                                        </Group>

                                                        <Group gap="xs" mt="xs">
                                                            <Button
                                                                size="xs"
                                                                leftSection={<IconPlus size={14} />}
                                                                onClick={() => handleAddObjectToScene(object)}
                                                                loading={isLoading}
                                                                style={{ flex: 1 }}
                                                            >
                                                                Добавить на сцену
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
            </Modal>

            {/* Save Scene Modal */}
            <Modal
                opened={saveModalOpened}
                onClose={() => setSaveModalOpened(false)}
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
                        <Button variant="subtle" onClick={() => setSaveModalOpened(false)}>
                            Отмена
                        </Button>
                        <Button onClick={handleSaveCurrentScene}>
                            Сохранить
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    )
}