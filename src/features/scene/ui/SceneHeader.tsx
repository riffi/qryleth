import React from 'react'
import { Group, Text, Badge, ActionIcon, Tooltip, Divider } from '@mantine/core'
import { IconFileText, IconDeviceFloppy } from '@tabler/icons-react'
import type { SceneReference } from '../../../types/common'

interface SceneHeaderProps {
    currentScene?: SceneReference
    onSaveSceneToLibrary?: () => void
}

type SceneStatus = 'draft' | 'modified' | 'saved'

const getStatusColor = (status: SceneStatus) => {
    switch (status) {
        case 'draft': return 'orange'
        case 'modified': return 'yellow'
        case 'saved': return 'green'
        default: return 'gray'
    }
}

const getStatusText = (status: SceneStatus) => {
    switch (status) {
        case 'draft': return 'Черновик'
        case 'modified': return 'Есть изменения'
        case 'saved': return 'Сохранена'
        default: return 'Неизвестно'
    }
}

export const SceneHeader: React.FC<SceneHeaderProps> = ({
    currentScene,
    onSaveSceneToLibrary
}) => {
    if (!currentScene) return null

    return (
        <>
            <Group justify="space-between" align="center">
                <Group gap="xs" style={{ flex: 1 }}>
                    <IconFileText size={14} color="var(--mantine-color-blue-6)" />
                    <Text size="xs" fw={500} lineClamp={1} style={{ flex: 1 }}>
                        {currentScene.name}
                    </Text>
                </Group>
                <Group gap="xs">
                    <Badge variant="light" color={getStatusColor(currentScene.status)} size="xs">
                        {getStatusText(currentScene.status)}
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
    )
}