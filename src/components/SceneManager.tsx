import React, { useState } from 'react'
import {
    Paper,
    Stack,
    Title,
    Text,
    Group,
    Badge,
    ScrollArea,
    Box,
    Divider,
    ActionIcon,
    Tooltip,
    Collapse,
    ColorInput,
    Slider,
    NumberInput,
    Modal,
    TextInput,
    Button,
    Menu
} from '@mantine/core'
import { IconCube, IconEye, IconEyeOff, IconTrash, IconChevronDown, IconChevronRight, IconBookmark, IconDeviceFloppy, IconEdit, IconFileText, IconBulb, IconColorPicker, IconPlus, IconLayersLinked } from '@tabler/icons-react'
import type {ObjectInstance, SceneReference, Visible} from '../types/common'
import type {LightingSettings, SceneLayer} from '../types/scene'

export interface ObjectInfo extends Visible {
    name: string
    count: number
    objectIndex: number
    instances?: ObjectInstance[]
    layerId?: string
}

interface SceneManagerProps {
    objects: ObjectInfo[]
    onToggleVisibility?: (objectIndex: number) => void
    onRemoveObject?: (objectIndex: number) => void
    onToggleInstanceVisibility?: (objectIndex: number, instanceId: string) => void
    onRemoveInstance?: (objectIndex: number, instanceId: string) => void
    onHighlightObject?: (objectIndex: number, instanceId?: string) => void
    onClearHighlight?: () => void
    onSelectObject?: (objectIndex: number, instanceId?: string) => void
    selectedObject?: {objectIndex: number, instanceId?: string} | null
    onSaveObjectToLibrary?: (objectIndex: number) => void
    currentScene?: SceneReference
    onSaveSceneToLibrary?: () => void
    onEditObject?: (objectIndex: number, instanceId?: string) => void
    lighting?: LightingSettings
    onLightingChange?: (lighting: LightingSettings) => void
    layers?: SceneLayer[]
    onCreateLayer?: (name: string) => void
    onUpdateLayer?: (layerId: string, updates: Partial<SceneLayer>) => void
    onDeleteLayer?: (layerId: string) => void
    onToggleLayerVisibility?: (layerId: string) => void
    onMoveObjectToLayer?: (objectIndex: number, layerId: string) => void
}

export const SceneManager: React.FC<SceneManagerProps> = ({
                                                                objects,
                                                                onToggleVisibility,
                                                                onRemoveObject,
                                                                onToggleInstanceVisibility,
                                                                onRemoveInstance,
                                                                onHighlightObject,
                                                                onClearHighlight,
                                                                onSelectObject,
                                                                selectedObject,
                                                                onSaveObjectToLibrary,
                                                                currentScene,
                                                                onSaveSceneToLibrary,
                                                                onEditObject,
                                                                lighting,
                                                                onLightingChange,
                                                                layers,
                                                                onCreateLayer,
                                                                onUpdateLayer,
                                                                onDeleteLayer,
                                                                onToggleLayerVisibility,
                                                                onMoveObjectToLayer
                                                            }) => {
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
    const [lightingExpanded, setLightingExpanded] = useState(false)
    const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['objects']))
    const [createLayerModalOpened, setCreateLayerModalOpened] = useState(false)
    const [editLayerModalOpened, setEditLayerModalOpened] = useState(false)
    const [newLayerName, setNewLayerName] = useState('')
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
    const [draggedObjectIndex, setDraggedObjectIndex] = useState<number | null>(null)
    const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null)
    const [contextMenuOpened, setContextMenuOpened] = useState(false)
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
    const [contextMenuObjectIndex, setContextMenuObjectIndex] = useState<number | null>(null)
    const totalObjects = objects.reduce((sum, obj) => sum + obj.count, 0)
    
    const toggleLayerExpanded = (layerId: string) => {
        setExpandedLayers(prev => {
            const newSet = new Set(prev)
            if (newSet.has(layerId)) {
                newSet.delete(layerId)
            } else {
                newSet.add(layerId)
            }
            return newSet
        })
    }

    const handleCreateLayer = () => {
        if (newLayerName.trim() && onCreateLayer) {
            onCreateLayer(newLayerName.trim())
            setNewLayerName('')
            setCreateLayerModalOpened(false)
        }
    }

    const handleUpdateLayer = () => {
        if (newLayerName.trim() && onUpdateLayer && editingLayerId) {
            onUpdateLayer(editingLayerId, { name: newLayerName.trim() })
            setNewLayerName('')
            setEditingLayerId(null)
            setEditLayerModalOpened(false)
        }
    }

    const openEditLayerModal = (layerId: string, currentName: string) => {
        setEditingLayerId(layerId)
        setNewLayerName(currentName)
        setEditLayerModalOpened(true)
    }

    // Drag & Drop handlers
    const handleDragStart = (e: React.DragEvent, objectIndex: number) => {
        setDraggedObjectIndex(objectIndex)
        e.dataTransfer.setData('text/plain', objectIndex.toString())
    }

    const handleDragOver = (e: React.DragEvent, layerId: string) => {
        e.preventDefault()
        setDragOverLayerId(layerId)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOverLayerId(null)
    }

    const handleDrop = (e: React.DragEvent, layerId: string) => {
        e.preventDefault()
        const objectIndex = parseInt(e.dataTransfer.getData('text/plain'))
        
        if (objectIndex !== null && onMoveObjectToLayer) {
            onMoveObjectToLayer(objectIndex, layerId)
        }
        
        setDraggedObjectIndex(null)
        setDragOverLayerId(null)
    }

    // Context Menu handlers
    const handleContextMenu = (e: React.MouseEvent, objectIndex: number) => {
        e.preventDefault()
        setContextMenuPosition({ x: e.clientX, y: e.clientY })
        setContextMenuObjectIndex(objectIndex)
        setContextMenuOpened(true)
    }

    const handleMoveToLayer = (layerId: string) => {
        if (contextMenuObjectIndex !== null && onMoveObjectToLayer) {
            onMoveObjectToLayer(contextMenuObjectIndex, layerId)
        }
        setContextMenuOpened(false)
        setContextMenuObjectIndex(null)
    }

    const getObjectsByLayer = (layerId: string) => {
        return objects.filter((obj) => {
            const sceneObject = obj as any
            return sceneObject.layerId === layerId || (!sceneObject.layerId && layerId === 'objects')
        })
    }

    const toggleExpanded = (objectIndex: number) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev)
            if (newSet.has(objectIndex)) {
                newSet.delete(objectIndex)
            } else {
                newSet.add(objectIndex)
            }
            return newSet
        })
    }

    const getStatusColor = () => {
        switch (currentScene?.status) {
            case 'draft': return 'orange'
            case 'modified': return 'yellow'
            case 'saved': return 'green'
            default: return 'gray'
        }
    }

    const getStatusText = () => {
        switch (currentScene?.status) {
            case 'draft': return 'Черновик'
            case 'modified': return 'Есть изменения'
            case 'saved': return 'Сохранена'
            default: return 'Неизвестно'
        }
    }

    // Компонент для отображения объекта
    const ObjectItem = ({ obj, isExpanded, isSelected, onToggleExpanded, onHighlight, onClearHighlight, 
                          onSelect, onToggleVisibility, onRemove, onSaveToLibrary, onEdit, 
                          onToggleInstanceVisibility, onRemoveInstance, selectedObject }: any) => {
        return (
            <Box>
                <Paper
                    p="sm"
                    withBorder
                    draggable
                    style={{
                        opacity: obj.visible ? 1 : 0.6,
                        transition: 'opacity 0.2s ease',
                        cursor: draggedObjectIndex === obj.objectIndex ? 'grabbing' : 'grab',
                        backgroundColor: isSelected
                            ? 'var(--mantine-color-dark-5)'
                            : 'var(--mantine-color-dark-6)',
                        borderColor: isSelected
                            ? 'var(--mantine-color-orange-4)'
                            : 'var(--mantine-color-dark-4)'
                    }}
                    onMouseEnter={onHighlight}
                    onMouseLeave={onClearHighlight}
                    onClick={onSelect}
                    onDragStart={(e) => handleDragStart(e, obj.objectIndex)}
                    onContextMenu={(e) => handleContextMenu(e, obj.objectIndex)}
                >
                    <Group justify="space-between" align="center">
                        <Group gap="sm" style={{ flex: 1 }}>
                            <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="gray"
                                onClick={onToggleExpanded}
                            >
                                {isExpanded ? (
                                    <IconChevronDown size={14} />
                                ) : (
                                    <IconChevronRight size={14} />
                                )}
                            </ActionIcon>
                            <IconCube size={16} color="var(--mantine-color-blue-6)" />
                            <Box style={{ flex: 1 }}>
                                <Text size="sm" fw={500} lineClamp={1}>
                                    {obj.name}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    Всего: {obj.count}
                                </Text>
                            </Box>
                        </Group>

                        <Group gap="xs">
                            <Tooltip label="Редактировать">
                                <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="orange"
                                    onClick={() => onEdit()}
                                >
                                    <IconEdit size={14} />
                                </ActionIcon>
                            </Tooltip>

                            <Tooltip label="Сохранить в библиотеку">
                                <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="green"
                                    onClick={() => onSaveToLibrary()}
                                >
                                    <IconBookmark size={14} />
                                </ActionIcon>
                            </Tooltip>

                            <Tooltip label={obj.visible ? 'Скрыть' : 'Показать'}>
                                <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color={obj.visible ? 'blue' : 'gray'}
                                    onClick={() => onToggleVisibility()}
                                >
                                    {obj.visible ? (
                                        <IconEye size={14} />
                                    ) : (
                                        <IconEyeOff size={14} />
                                    )}
                                </ActionIcon>
                            </Tooltip>

                            <Tooltip label="Удалить все копии">
                                <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="red"
                                    onClick={() => onRemove()}
                                >
                                    <IconTrash size={14} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </Group>
                </Paper>
                
                <Collapse in={isExpanded}>
                    <Box ml="md" mt="xs">
                        <Stack gap="xs">
                            {obj.instances && obj.instances.length > 0 ? (
                                obj.instances.map((instance: any) => (
                                    <Paper
                                        key={instance.id}
                                        p="xs"
                                        withBorder
                                        style={{
                                            opacity: instance.visible ? 1 : 0.6,
                                            backgroundColor: selectedObject?.objectIndex === obj.objectIndex && selectedObject?.instanceId === instance.id
                                                ? 'var(--mantine-color-dark-5)'
                                                : 'var(--mantine-color-dark-6)',
                                            borderColor: selectedObject?.objectIndex === obj.objectIndex && selectedObject?.instanceId === instance.id
                                                ? 'var(--mantine-color-orange-4)'
                                                : 'var(--mantine-color-dark-4)',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={() => onHighlight(instance.id)}
                                        onMouseLeave={() => onClearHighlight()}
                                        onClick={() => onSelect(instance.id)}
                                    >
                                        <Group justify="space-between" align="center">
                                            <Group gap="sm" style={{ flex: 1 }}>
                                                <Box w={4} h={4} style={{ backgroundColor: 'var(--mantine-color-blue-6)', borderRadius: '50%' }} />
                                                <Box style={{ flex: 1 }}>
                                                    <Text size="xs" fw={500}>
                                                        Экземпляр {instance.id}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                        x:{instance.position[0].toFixed(1)} y:{instance.position[1].toFixed(1)} z:{instance.position[2].toFixed(1)}
                                                    </Text>
                                                </Box>
                                            </Group>
                                            
                                            <Group gap="xs">
                                                <Tooltip label="Редактировать экземпляр">
                                                    <ActionIcon
                                                        size="xs"
                                                        variant="subtle"
                                                        color="orange"
                                                        onClick={() => onEdit(instance.id)}
                                                    >
                                                        <IconEdit size={12} />
                                                    </ActionIcon>
                                                </Tooltip>

                                                <Tooltip label={instance.visible ? 'Скрыть' : 'Показать'}>
                                                    <ActionIcon
                                                        size="xs"
                                                        variant="subtle"
                                                        color={instance.visible ? 'blue' : 'gray'}
                                                        onClick={() => onToggleInstanceVisibility?.(obj.objectIndex, instance.id)}
                                                    >
                                                        {instance.visible ? (
                                                            <IconEye size={12} />
                                                        ) : (
                                                            <IconEyeOff size={12} />
                                                        )}
                                                    </ActionIcon>
                                                </Tooltip>

                                                <Tooltip label="Удалить экземпляр">
                                                    <ActionIcon
                                                        size="xs"
                                                        variant="subtle"
                                                        color="red"
                                                        onClick={() => onRemoveInstance?.(obj.objectIndex, instance.id)}
                                                    >
                                                        <IconTrash size={12} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Group>
                                    </Paper>
                                ))
                            ) : (
                                <Text size="xs" c="dimmed" ta="center">
                                    Нет экземпляров
                                </Text>
                            )}
                        </Stack>
                    </Box>
                </Collapse>
            </Box>
        )
    }

    const handleLightingChange = (key: keyof LightingSettings, value: any) => {
        if (onLightingChange && lighting) {
            onLightingChange({
                ...lighting,
                [key]: value
            })
        }
    }

    return (
        <>
        <Paper shadow="sm" radius="md" p="sm" style={{ width: 280, height: '100%' }}>
            <Stack gap="sm" style={{ height: '100%' }}>
                {/* Main Scene Header */}
                <Title order={4} c="gray.6" size="md">
                    Сцена
                </Title>

                {/* Current Scene Header */}
                {currentScene && (
                    <>
                        <Group justify="space-between" align="center">
                            <Group gap="xs" style={{ flex: 1 }}>
                                <IconFileText size={14} color="var(--mantine-color-blue-6)" />
                                <Text size="xs" fw={500} lineClamp={1} style={{ flex: 1 }}>
                                    {currentScene.name}
                                </Text>
                            </Group>
                            <Group gap="xs">
                                <Badge variant="light" color={getStatusColor()} size="xs">
                                    {getStatusText()}
                                </Badge>
                                {(currentScene.status === 'draft' || currentScene.status === 'modified') && (
                                    <Tooltip label="Сохранить сцену в библиотеку">
                                        <ActionIcon
                                            size="xs"
                                            variant="light"
                                            color="green"
                                            onClick={onSaveSceneToLibrary}
                                        >
                                            <IconDeviceFloppy size={12} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </Group>
                        </Group>
                        <Divider />
                    </>
                )}

                <Group justify="space-between" align="center">
                    <Text size="xs" fw={500} c="dimmed">
                        Объекты
                    </Text>
                    <Group gap="xs">
                        <Tooltip label="Создать новый слой">
                            <ActionIcon 
                                size="sm" 
                                variant="light" 
                                color="purple"
                                onClick={() => setCreateLayerModalOpened(true)}
                            >
                                <IconPlus size={14} />
                            </ActionIcon>
                        </Tooltip>
                        <Badge variant="light" color="blue" size="xs">
                            {totalObjects}
                        </Badge>
                    </Group>
                </Group>

                <Divider />

                {/* Lighting Controls */}
                {lighting && onLightingChange && (
                    <>
                        <Group justify="space-between" align="center">
                            <Group gap="sm">
                                <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="gray"
                                    onClick={() => setLightingExpanded(prev => !prev)}
                                >
                                    {lightingExpanded ? (
                                        <IconChevronDown size={14} />
                                    ) : (
                                        <IconChevronRight size={14} />
                                    )}
                                </ActionIcon>
                                <IconBulb size={16} color="var(--mantine-color-yellow-6)" />
                                <Text size="xs" fw={500} c="dimmed">
                                    Освещение
                                </Text>
                            </Group>
                        </Group>

                        <Collapse in={lightingExpanded}>
                            <Stack gap="xs" ml="md">
                                <Box>
                                    <Text size="xs" fw={500} mb="xs">Фоновое освещение</Text>
                                    <Group gap="xs">
                                        <ColorInput
                                            size="xs"
                                            value={lighting.ambientColor || '#6b7280'}
                                            onChange={(value) => handleLightingChange('ambientColor', value)}
                                            withEyeDropper={false}
                                            style={{ flex: 1 }}
                                        />
                                        <NumberInput
                                            size="xs"
                                            value={lighting.ambientIntensity || 0.4}
                                            onChange={(value) => handleLightingChange('ambientIntensity', value)}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            style={{ width: 60 }}
                                        />
                                    </Group>
                                </Box>

                                <Box>
                                    <Text size="xs" fw={500} mb="xs">Направленный свет</Text>
                                    <Group gap="xs">
                                        <ColorInput
                                            size="xs"
                                            value={lighting.directionalColor || '#ffffff'}
                                            onChange={(value) => handleLightingChange('directionalColor', value)}
                                            withEyeDropper={false}
                                            style={{ flex: 1 }}
                                        />
                                        <NumberInput
                                            size="xs"
                                            value={lighting.directionalIntensity || 0.8}
                                            onChange={(value) => handleLightingChange('directionalIntensity', value)}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            style={{ width: 60 }}
                                        />
                                    </Group>
                                </Box>

                                <Box>
                                    <Text size="xs" fw={500} mb="xs">Фон сцены</Text>
                                    <ColorInput
                                        size="xs"
                                        value={lighting.backgroundColor || '#1a1b1e'}
                                        onChange={(value) => handleLightingChange('backgroundColor', value)}
                                        withEyeDropper={false}
                                    />
                                </Box>
                            </Stack>
                        </Collapse>

                        <Divider />
                    </>
                )}


                <ScrollArea 
                    style={{ flex: 1 }}
                    onClick={() => setContextMenuOpened(false)}
                >
                    <Stack gap="xs">
                        {objects.length === 0 ? (
                            <Text size="sm" c="dimmed" ta="center" py="xl">
                                Нет объектов на сцене
                            </Text>
                        ) : layers && layers.length > 0 ? (
                            // Группируем объекты по слоям
                            layers.map((layer) => {
                                const layerObjects = getObjectsByLayer(layer.id)
                                const isLayerExpanded = expandedLayers.has(layer.id)
                                
                                return (
                                    <div key={layer.id}>
                                        <Paper 
                                            p="xs" 
                                            withBorder 
                                            style={{ 
                                                backgroundColor: dragOverLayerId === layer.id 
                                                    ? 'var(--mantine-color-blue-7)' 
                                                    : 'var(--mantine-color-dark-6)', 
                                                marginBottom: '8px',
                                                border: dragOverLayerId === layer.id 
                                                    ? '2px dashed var(--mantine-color-blue-4)' 
                                                    : '1px solid var(--mantine-color-dark-4)'
                                            }}
                                            onDragOver={(e) => handleDragOver(e, layer.id)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, layer.id)}
                                        >
                                            <Group justify="space-between" align="center">
                                                <Group gap="xs">
                                                    <ActionIcon
                                                        size="sm"
                                                        variant="transparent"
                                                        onClick={() => toggleLayerExpanded(layer.id)}
                                                    >
                                                        {isLayerExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                                                    </ActionIcon>
                                                    <IconLayersLinked size={14} />
                                                    <Text size="xs" fw={500}>
                                                        {layer.name}
                                                    </Text>
                                                </Group>
                                                <Group gap="xs">
                                                    <Badge variant="light" color="purple" size="xs">
                                                        {layerObjects.length}
                                                    </Badge>
                                                    <ActionIcon
                                                        size="sm"
                                                        variant="transparent"
                                                        onClick={() => onToggleLayerVisibility && onToggleLayerVisibility(layer.id)}
                                                    >
                                                        {layer.visible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                                                    </ActionIcon>
                                                    <ActionIcon
                                                        size="sm"
                                                        variant="transparent"
                                                        onClick={() => openEditLayerModal(layer.id, layer.name)}
                                                    >
                                                        <IconEdit size={14} />
                                                    </ActionIcon>
                                                    {layer.id !== 'objects' && (
                                                        <ActionIcon
                                                            size="sm"
                                                            variant="transparent"
                                                            color="red"
                                                            onClick={() => onDeleteLayer && onDeleteLayer(layer.id)}
                                                        >
                                                            <IconTrash size={14} />
                                                        </ActionIcon>
                                                    )}
                                                </Group>
                                            </Group>
                                        </Paper>
                                        
                                        <Collapse in={isLayerExpanded}>
                                            <Stack gap="xs" pl="md">
                                                {layerObjects.length === 0 ? (
                                                    <Text size="xs" c="dimmed" ta="center" py="sm">
                                                        Пустой слой
                                                    </Text>
                                                ) : (
                                                    layerObjects.map((obj) => (
                                                        <ObjectItem
                                                            key={`${obj.name}-${obj.objectIndex}`}
                                                            obj={obj}
                                                            isExpanded={expandedItems.has(obj.objectIndex)}
                                                            isSelected={selectedObject?.objectIndex === obj.objectIndex && !selectedObject?.instanceId}
                                                            onToggleExpanded={() => toggleExpanded(obj.objectIndex)}
                                                            onHighlight={() => onHighlightObject?.(obj.objectIndex)}
                                                            onClearHighlight={() => onClearHighlight?.()}
                                                            onSelect={() => onSelectObject?.(obj.objectIndex)}
                                                            onToggleVisibility={() => onToggleVisibility?.(obj.objectIndex)}
                                                            onRemove={() => onRemoveObject?.(obj.objectIndex)}
                                                            onSaveToLibrary={() => onSaveObjectToLibrary?.(obj.objectIndex)}
                                                            onEdit={() => onEditObject?.(obj.objectIndex)}
                                                            onToggleInstanceVisibility={onToggleInstanceVisibility}
                                                            onRemoveInstance={onRemoveInstance}
                                                            selectedObject={selectedObject}
                                                        />
                                                    ))
                                                )}
                                            </Stack>
                                        </Collapse>
                                    </div>
                                )
                            })
                        ) : (
                            // Fallback для случая без слоев
                            objects.map((obj) => {
                                const isExpanded = expandedItems.has(obj.objectIndex)
                                const isSelected = selectedObject?.objectIndex === obj.objectIndex && !selectedObject?.instanceId
                                return (
                                    <Box key={`${obj.name}-${obj.objectIndex}`}>
                                        <Paper
                                            p="sm"
                                            withBorder
                                            style={{
                                                opacity: obj.visible ? 1 : 0.6,
                                                transition: 'opacity 0.2s ease',
                                                cursor: 'pointer',
                                                backgroundColor: isSelected
                                                    ? 'var(--mantine-color-dark-5)'
                                                    : 'var(--mantine-color-dark-6)',
                                                borderColor: isSelected
                                                    ? 'var(--mantine-color-orange-4)'
                                                    : 'var(--mantine-color-dark-4)'
                                            }}
                                            onMouseEnter={() => onHighlightObject?.(obj.objectIndex)}
                                            onMouseLeave={() => onClearHighlight?.()}
                                            onClick={() => onSelectObject?.(obj.objectIndex)}
                                        >
                                            <Group justify="space-between" align="center">
                                                <Group gap="sm" style={{ flex: 1 }}>
                                                    <ActionIcon
                                                        size="sm"
                                                        variant="subtle"
                                                        color="gray"
                                                        onClick={() => toggleExpanded(obj.objectIndex)}
                                                    >
                                                        {isExpanded ? (
                                                            <IconChevronDown size={14} />
                                                        ) : (
                                                            <IconChevronRight size={14} />
                                                        )}
                                                    </ActionIcon>
                                                    <IconCube size={16} color="var(--mantine-color-blue-6)" />
                                                    <Box style={{ flex: 1 }}>
                                                        <Text size="sm" fw={500} lineClamp={1}>
                                                            {obj.name}
                                                        </Text>
                                                        <Text size="xs" c="dimmed">
                                                            Всего: {obj.count}
                                                        </Text>
                                                    </Box>
                                                </Group>

                                                <Group gap="xs">
                                                    <Tooltip label="Редактировать">
                                                        <ActionIcon
                                                            size="sm"
                                                            variant="subtle"
                                                            color="orange"
                                                            onClick={() => onEditObject?.(obj.objectIndex)}
                                                        >
                                                            <IconEdit size={14} />
                                                        </ActionIcon>
                                                    </Tooltip>

                                                    <Tooltip label="Сохранить в библиотеку">
                                                        <ActionIcon
                                                            size="sm"
                                                            variant="subtle"
                                                            color="green"
                                                            onClick={() => onSaveObjectToLibrary?.(obj.objectIndex)}
                                                        >
                                                            <IconBookmark size={14} />
                                                        </ActionIcon>
                                                    </Tooltip>

                                                    <Tooltip label={obj.visible ? 'Скрыть' : 'Показать'}>
                                                        <ActionIcon
                                                            size="sm"
                                                            variant="subtle"
                                                            color={obj.visible ? 'blue' : 'gray'}
                                                            onClick={() => onToggleVisibility?.(obj.objectIndex)}
                                                        >
                                                            {obj.visible ? (
                                                                <IconEye size={14} />
                                                            ) : (
                                                                <IconEyeOff size={14} />
                                                            )}
                                                        </ActionIcon>
                                                    </Tooltip>

                                                    <Tooltip label="Удалить все копии">
                                                        <ActionIcon
                                                            size="sm"
                                                            variant="subtle"
                                                            color="red"
                                                            onClick={() => onRemoveObject?.(obj.objectIndex)}
                                                        >
                                                            <IconTrash size={14} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Group>
                                            </Group>
                                        </Paper>
                                        
                                        <Collapse in={isExpanded}>
                                            <Box ml="md" mt="xs">
                                                <Stack gap="xs">
                                                    {obj.instances && obj.instances.length > 0 ? (
                                                        obj.instances.map((instance) => (
                                                            <Paper
                                                                key={instance.id}
                                                                p="xs"
                                                                withBorder
                                                                style={{
                                                                    opacity: instance.visible ? 1 : 0.6,
                                                                    backgroundColor: selectedObject?.objectIndex === obj.objectIndex && selectedObject?.instanceId === instance.id
                                                                        ? 'var(--mantine-color-dark-5)'
                                                                        : 'var(--mantine-color-dark-6)',
                                                                    borderColor: selectedObject?.objectIndex === obj.objectIndex && selectedObject?.instanceId === instance.id
                                                                        ? 'var(--mantine-color-orange-4)'
                                                                        : 'var(--mantine-color-dark-4)',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onMouseEnter={() => onHighlightObject?.(obj.objectIndex, instance.id)}
                                                                onMouseLeave={() => onClearHighlight?.()}
                                                                onClick={() => onSelectObject?.(obj.objectIndex, instance.id)}
                                                            >
                                                                <Group justify="space-between" align="center">
                                                                    <Group gap="sm" style={{ flex: 1 }}>
                                                                        <Box w={4} h={4} style={{ backgroundColor: 'var(--mantine-color-blue-6)', borderRadius: '50%' }} />
                                                                        <Box style={{ flex: 1 }}>
                                                                            <Text size="xs" fw={500}>
                                                                                Экземпляр {instance.id}
                                                                            </Text>
                                                                            <Text size="xs" c="dimmed">
                                                                                x:{instance.position[0].toFixed(1)} y:{instance.position[1].toFixed(1)} z:{instance.position[2].toFixed(1)}
                                                                            </Text>
                                                                        </Box>
                                                                    </Group>
                                                                    
                                                                    <Group gap="xs">
                                                                        <Tooltip label="Редактировать экземпляр">
                                                                            <ActionIcon
                                                                                size="xs"
                                                                                variant="subtle"
                                                                                color="orange"
                                                                                onClick={() => onEditObject?.(obj.objectIndex, instance.id)}
                                                                            >
                                                                                <IconEdit size={12} />
                                                                            </ActionIcon>
                                                                        </Tooltip>

                                                                        <Tooltip label={instance.visible ? 'Скрыть' : 'Показать'}>
                                                                            <ActionIcon
                                                                                size="xs"
                                                                                variant="subtle"
                                                                                color={instance.visible ? 'blue' : 'gray'}
                                                                                onClick={() => onToggleInstanceVisibility?.(obj.objectIndex, instance.id)}
                                                                            >
                                                                                {instance.visible ? (
                                                                                    <IconEye size={12} />
                                                                                ) : (
                                                                                    <IconEyeOff size={12} />
                                                                                )}
                                                                            </ActionIcon>
                                                                        </Tooltip>
                                                                        
                                                                        <Tooltip label="Удалить экземпляр">
                                                                            <ActionIcon
                                                                                size="xs"
                                                                                variant="subtle"
                                                                                color="red"
                                                                                onClick={() => onRemoveInstance?.(obj.objectIndex, instance.id)}
                                                                            >
                                                                                <IconTrash size={12} />
                                                                            </ActionIcon>
                                                                        </Tooltip>
                                                                    </Group>
                                                                </Group>
                                                            </Paper>
                                                        ))
                                                    ) : (
                                                        <Text size="xs" c="dimmed" ta="center" py="sm">
                                                            Нет экземпляров
                                                        </Text>
                                                    )}
                                                </Stack>
                                            </Box>
                                        </Collapse>
                                    </Box>
                                )
                            })
                        )}
                    </Stack>
                </ScrollArea>

                {objects.length > 0 && (
                    <>
                        <Divider />
                        <Text size="xs" c="dimmed" ta="center">
                            Всего объектов: {totalObjects}
                        </Text>
                        <Text size="xs" c="dimmed" ta="center">
                            Перетащите объект в слой или ПКМ для выбора слоя
                        </Text>
                        
                        {selectedObject && (
                            <>
                                <Divider />
                                <Text size="xs" c="dimmed" ta="center">
                                    Выбран объект для управления
                                </Text>
                                <Text size="xs" c="dimmed" ta="center">
                                    ←→↑↓ перемещение по XZ
                                </Text>
                                <Text size="xs" c="dimmed" ta="center">
                                    Num8/Num2 перемещение по Y
                                </Text>
                                <Text size="xs" c="dimmed" ta="center">
                                    +/- изменение размера
                                </Text>
                                <Text size="xs" c="dimmed" ta="center">
                                    Esc отмена выбора
                                </Text>
                            </>
                        )}
                    </>
                )}
            </Stack>
        </Paper>
        
        {/* Модальные окна */}
        <Modal
            opened={createLayerModalOpened}
            onClose={() => {
                setCreateLayerModalOpened(false)
                setNewLayerName('')
            }}
            title="Создать новый слой"
            size="sm"
        >
            <Stack gap="md">
                <TextInput
                    label="Название слоя"
                    placeholder="Введите название слоя"
                    value={newLayerName}
                    onChange={(e) => setNewLayerName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleCreateLayer()
                        }
                    }}
                    autoFocus
                />
                <Group justify="flex-end" gap="sm">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setCreateLayerModalOpened(false)
                            setNewLayerName('')
                        }}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={handleCreateLayer}
                        disabled={!newLayerName.trim()}
                    >
                        Создать
                    </Button>
                </Group>
            </Stack>
        </Modal>

        <Modal
            opened={editLayerModalOpened}
            onClose={() => {
                setEditLayerModalOpened(false)
                setNewLayerName('')
                setEditingLayerId(null)
            }}
            title="Редактировать слой"
            size="sm"
        >
            <Stack gap="md">
                <TextInput
                    label="Название слоя"
                    placeholder="Введите название слоя"
                    value={newLayerName}
                    onChange={(e) => setNewLayerName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleUpdateLayer()
                        }
                    }}
                    autoFocus
                />
                <Group justify="flex-end" gap="sm">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setEditLayerModalOpened(false)
                            setNewLayerName('')
                            setEditingLayerId(null)
                        }}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={handleUpdateLayer}
                        disabled={!newLayerName.trim()}
                    >
                        Сохранить
                    </Button>
                </Group>
            </Stack>
        </Modal>
        
        {/* Контекстное меню для перемещения объектов */}
        <Menu
            opened={contextMenuOpened}
            onClose={() => setContextMenuOpened(false)}
            position="bottom-start"
            shadow="md"
            width={200}
        >
            <Menu.Target>
                <div 
                    style={{
                        position: 'fixed',
                        left: contextMenuPosition.x,
                        top: contextMenuPosition.y,
                        width: 1,
                        height: 1,
                        pointerEvents: 'none'
                    }}
                />
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Label>Переместить в слой</Menu.Label>
                {layers?.map((layer) => (
                    <Menu.Item
                        key={layer.id}
                        leftSection={<IconLayersLinked size={16} />}
                        onClick={() => handleMoveToLayer(layer.id)}
                    >
                        {layer.name}
                    </Menu.Item>
                ))}
            </Menu.Dropdown>
        </Menu>
        </>
    )
}