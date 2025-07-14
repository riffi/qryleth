import React from 'react'
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
    Tooltip
} from '@mantine/core'
import { IconCube, IconEye, IconEyeOff, IconTrash } from '@tabler/icons-react'

export interface ObjectInfo {
    name: string
    count: number
    visible: boolean
    objectIndex: number
}

interface ObjectManagerProps {
    objects: ObjectInfo[]
    onToggleVisibility?: (objectIndex: number) => void
    onRemoveObject?: (objectIndex: number) => void
}

export const ObjectManager: React.FC<ObjectManagerProps> = ({
                                                                objects,
                                                                onToggleVisibility,
                                                                onRemoveObject
                                                            }) => {
    const totalObjects = objects.reduce((sum, obj) => sum + obj.count, 0)

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
                            objects.map((obj, index) => (
                                <Paper
                                    key={`${obj.name}-${obj.objectIndex}`}
                                    p="sm"
                                    withBorder
                                    style={{
                                        opacity: obj.visible ? 1 : 0.6,
                                        transition: 'opacity 0.2s ease'
                                    }}
                                >
                                    <Group justify="space-between" align="center">
                                        <Group gap="sm" style={{ flex: 1 }}>
                                            <IconCube size={16} color="var(--mantine-color-blue-6)" />
                                            <Box style={{ flex: 1 }}>
                                                <Text size="sm" fw={500} lineClamp={1}>
                                                    {obj.name}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    Копий: {obj.count}
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
                            ))
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