import React from 'react'
import { Group, Text, Box, ActionIcon, Menu } from '@mantine/core'
import { IconEye, IconEyeOff, IconEdit, IconTrash } from '@tabler/icons-react'
import type {SceneObjectInstance} from "@/entities/scene/types.ts";


interface ObjectInstanceItemProps {
    instance: SceneObjectInstance
    isSelected: boolean
    onHighlight: () => void
    onClearHighlight: () => void
    onSelect: () => void
    onToggleVisibility: () => void
    onEdit: () => void
    onRemove: () => void
}

export const SceneObjectInstanceItem: React.FC<ObjectInstanceItemProps> = ({
    instance,
    isSelected,
    onHighlight,
    onClearHighlight,
    onSelect,
    onToggleVisibility,
    onEdit,
    onRemove
}) => {
    return (
        <Box
            style={{
                opacity: instance.visible ? 1 : 0.6,
                backgroundColor: isSelected
                    ? 'var(--mantine-color-blue-9)'
                    : 'transparent',
                borderRadius: '4px',
                border: isSelected
                    ? '1px solid var(--mantine-color-blue-6)'
                    : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                marginBottom: '1px',
                padding: "8px 4px"
            }}
            onMouseEnter={onHighlight}
            onMouseLeave={onClearHighlight}
            onClick={onSelect}
        >
            <Group justify="space-between" align="center" gap="xs">
                <Group gap="xs" style={{ flex: 1 }}>
                    <Box w={6} h={6} style={{ backgroundColor: 'var(--mantine-color-blue-5)', borderRadius: '50%' }} />
                    <Text size="xs" fw={500} style={{ userSelect: 'none' }}>
                        {instance.id}
                    </Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                        ({instance.position[0].toFixed(1)}, {instance.position[1].toFixed(1)}, {instance.position[2].toFixed(1)})
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
                        {instance.visible ? (
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
                            <Menu.Divider />
                            <Menu.Item
                                leftSection={<IconTrash size={14} />}
                                color="red"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRemove()
                                }}
                            >
                                Удалить экземпляр
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Group>
        </Box>
    )
}
