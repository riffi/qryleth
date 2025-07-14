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
    Collapse
} from '@mantine/core'
import { IconCube, IconEye, IconEyeOff, IconTrash, IconChevronDown, IconChevronRight } from '@tabler/icons-react'

export interface ObjectInstance {
    id: string
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
    visible: boolean
}

export interface ObjectInfo {
    name: string
    count: number
    visible: boolean
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
}

export const ObjectManager: React.FC<ObjectManagerProps> = ({
                                                                objects,
                                                                onToggleVisibility,
                                                                onRemoveObject,
                                                                onToggleInstanceVisibility,
                                                                onRemoveInstance,
                                                                onHighlightObject,
                                                                onClearHighlight
                                                            }) => {
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
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

    return (
        <Paper shadow="sm" radius="md" p="md" style={{ width: 300, height: '100%' }}>
            <Stack gap="md" style={{ height: '100%' }}>
                <Group justify="space-between" align="center">
                    <Title order={4} c="blue.6">
                        Менеджер объектов
                    </Title>
                    <Badge variant="light" color="blue">
                        {totalObjects}
                    </Badge>
                </Group>

                <Divider />

                <ScrollArea style={{ flex: 1 }}>
                    <Stack gap="xs">
                        {objects.length === 0 ? (
                            <Text size="sm" c="dimmed" ta="center" py="xl">
                                Нет объектов на сцене
                            </Text>
                        ) : (
                            objects.map((obj) => {
                                const isExpanded = expandedItems.has(obj.objectIndex)
                                return (
                                    <Box key={`${obj.name}-${obj.objectIndex}`}>
                                        <Paper
                                            p="sm"
                                            withBorder
                                            style={{
                                                opacity: obj.visible ? 1 : 0.6,
                                                transition: 'opacity 0.2s ease',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={() => onHighlightObject?.(obj.objectIndex)}
                                            onMouseLeave={() => onClearHighlight?.()}
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
                                                                    backgroundColor: 'var(--mantine-color-gray-0)',
                                                                    borderColor: 'var(--mantine-color-gray-3)',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onMouseEnter={() => onHighlightObject?.(obj.objectIndex, instance.id)}
                                                                onMouseLeave={() => onClearHighlight?.()}
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
                    </>
                )}
            </Stack>
        </Paper>
    )
}