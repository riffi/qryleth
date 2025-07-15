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
    NumberInput
} from '@mantine/core'
import { IconCube, IconEye, IconEyeOff, IconTrash, IconChevronDown, IconChevronRight, IconBookmark, IconDeviceFloppy, IconEdit, IconFileText, IconBulb, IconColorPicker } from '@tabler/icons-react'
import type {ObjectInstance, SceneReference, Visible} from '../types/common'
import type {LightingSettings} from '../types/scene'

export interface ObjectInfo extends Visible {
    name: string
    count: number
    objectIndex: number
    instances?: ObjectInstance[]
}

interface ObjectManagerProps {
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
}

export const ObjectManager: React.FC<ObjectManagerProps> = ({
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
                                                                onLightingChange
                                                            }) => {
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
    const [lightingExpanded, setLightingExpanded] = useState(false)
    const totalObjects = objects.reduce((sum, obj) => sum + obj.count, 0)
    
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

    const handleLightingChange = (key: keyof LightingSettings, value: any) => {
        if (onLightingChange && lighting) {
            onLightingChange({
                ...lighting,
                [key]: value
            })
        }
    }

    return (
        <Paper shadow="sm" radius="md" p="sm" style={{ width: 280, height: '100%' }}>
            <Stack gap="sm" style={{ height: '100%' }}>
                {/* Main Scene Header */}
                <Title order={4} c="blue.6" size="md">
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
                    <Badge variant="light" color="blue" size="xs">
                        {totalObjects}
                    </Badge>
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
                                        value={lighting.backgroundColor || '#f8f9fa'}
                                        onChange={(value) => handleLightingChange('backgroundColor', value)}
                                        withEyeDropper={false}
                                    />
                                </Box>
                            </Stack>
                        </Collapse>

                        <Divider />
                    </>
                )}

                <ScrollArea style={{ flex: 1 }}>
                    <Stack gap="xs">
                        {objects.length === 0 ? (
                            <Text size="sm" c="dimmed" ta="center" py="xl">
                                Нет объектов на сцене
                            </Text>
                        ) : (
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
                                                backgroundColor: isSelected ? 'var(--mantine-color-orange-1)' : undefined,
                                                borderColor: isSelected ? 'var(--mantine-color-orange-4)' : undefined
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
                                                                        ? 'var(--mantine-color-orange-1)' 
                                                                        : 'var(--mantine-color-gray-0)',
                                                                    borderColor: selectedObject?.objectIndex === obj.objectIndex && selectedObject?.instanceId === instance.id 
                                                                        ? 'var(--mantine-color-orange-4)' 
                                                                        : 'var(--mantine-color-gray-3)',
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
    )
}