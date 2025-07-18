import React from 'react'
import { Group, Text, Box, ActionIcon, Menu, Collapse, Stack } from '@mantine/core'
import { IconCube, IconEye, IconEyeOff, IconEdit, IconBookmark, IconTrash, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { ObjectInstanceItem } from './ObjectInstanceItem'
import type { ObjectInstance } from '../../../types/common'

export interface ObjectInfo {
    name: string
    count: number
    visible: boolean
    objectIndex: number
    instances?: ObjectInstance[]
    layerId?: string
}

interface ObjectItemProps {
    obj: ObjectInfo
    isExpanded: boolean
    isSelected: boolean
    selectedObject?: {objectIndex: number, instanceId?: string} | null
    onToggleExpanded: () => void
    onHighlight: () => void
    onClearHighlight: () => void
    onSelect: () => void
    onToggleVisibility: () => void
    onRemove: () => void
    onSaveToLibrary: () => void
    onEdit: () => void
    onToggleInstanceVisibility?: (objectIndex: number, instanceId: string) => void
    onRemoveInstance?: (objectIndex: number, instanceId: string) => void
    onDragStart: (e: React.DragEvent) => void
    onContextMenu: (e: React.MouseEvent) => void
}

export const ObjectItem: React.FC<ObjectItemProps> = ({
    obj,
    isExpanded,
    isSelected,
    selectedObject,
    onToggleExpanded,
    onHighlight,
    onClearHighlight,
    onSelect,
    onToggleVisibility,
    onRemove,
    onSaveToLibrary,
    onEdit,
    onToggleInstanceVisibility,
    onRemoveInstance,
    onDragStart,
    onContextMenu
}) => {
    return (
        <Box>
            <Box
                draggable
                style={{
                    opacity: obj.visible ? 1 : 0.6,
                    transition: 'all 0.1s ease',
                    cursor: 'grab',
                    backgroundColor: isSelected
                        ? 'var(--mantine-color-blue-9)'
                        : 'transparent',
                    borderRadius: '4px',
                    border: isSelected
                        ? '1px solid var(--mantine-color-blue-6)'
                        : '1px solid transparent',
                    marginBottom: '1px',
                    padding: "8px 4px"

                }}
                onMouseEnter={onHighlight}
                onMouseLeave={onClearHighlight}
                onClick={onSelect}
                onDragStart={onDragStart}
                onContextMenu={onContextMenu}
            >
                <Group justify="space-between" align="center" gap="xs">
                    <Group gap="xs" style={{ flex: 1 }}>
                        <ActionIcon
                            size="xs"
                            variant="transparent"
                            onClick={(e) => {
                                e.stopPropagation()
                                onToggleExpanded()
                            }}
                            style={{
                                width: '16px',
                                height: '16px',
                                minWidth: '16px'
                            }}
                        >
                            {isExpanded ? (
                                <IconChevronDown size={12} />
                            ) : (
                                <IconChevronRight size={12} />
                            )}
                        </ActionIcon>
                        <IconCube size={12} color="var(--mantine-color-blue-4)" />
                        <Text size="xs" fw={500} lineClamp={1} style={{ userSelect: 'none' }}>
                            {obj.name}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                            ({obj.count})
                        </Text>
                    </Group>

                    <Group gap="xs">
                        <ActionIcon
                            size="xs"
                            variant="transparent"
                            onClick={(e) => {
                                e.stopPropagation()
                                onToggleVisibility()
                            }}
                            style={{
                                width: '16px',
                                height: '16px',
                                minWidth: '16px'
                            }}
                        >
                            {obj.visible ? (
                                <IconEye size={12} />
                            ) : (
                                <IconEyeOff size={12} />
                            )}
                        </ActionIcon>
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <ActionIcon
                                    size="xs"
                                    variant="transparent"
                                    style={{
                                        width: '16px',
                                        height: '16px',
                                        minWidth: '16px'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Text size="xs" fw={700}>⋮</Text>
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item
                                    leftSection={<IconEdit size={14} />}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onEdit()
                                    }}
                                >
                                    Редактировать
                                </Menu.Item>
                                <Menu.Item
                                    leftSection={<IconBookmark size={14} />}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onSaveToLibrary()
                                    }}
                                >
                                    Сохранить в библиотеку
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                    leftSection={<IconTrash size={14} />}
                                    color="red"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onRemove()
                                    }}
                                >
                                    Удалить объект
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </Box>

            <Collapse in={isExpanded}>
                <Box ml="lg" mt="2px">
                    <Stack gap="2px">
                        {obj.instances && obj.instances.length > 0 ? (
                            obj.instances.map((instance: ObjectInstance) => (
                                <ObjectInstanceItem
                                    key={instance.id}
                                    instance={instance}
                                    isSelected={selectedObject?.objectIndex === obj.objectIndex && selectedObject?.instanceId === instance.id}
                                    onHighlight={() => {}}
                                    onClearHighlight={() => {}}
                                    onSelect={() => {}}
                                    onToggleVisibility={() => onToggleInstanceVisibility?.(obj.objectIndex, instance.id)}
                                    onEdit={() => {}}
                                    onRemove={() => onRemoveInstance?.(obj.objectIndex, instance.id)}
                                />
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
