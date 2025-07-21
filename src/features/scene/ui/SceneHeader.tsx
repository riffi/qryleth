import React from 'react'
import { Group, Text, Badge, ActionIcon, Tooltip, Divider } from '@mantine/core'
import { IconFileText, IconDeviceFloppy } from '@tabler/icons-react'
import type { SceneMetaData } from '@/features/scene/model/store-types'

interface SceneHeaderProps {
    sceneMetaData?: SceneMetaData
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
    sceneMetaData,
    onSaveSceneToLibrary
}) => {
    if (!sceneMetaData) return null

    return (
        <>
            <Group justify="space-between" align="center">
                <Group gap="xs" style={{ flex: 1 }}>
                    <IconFileText size={14} color="var(--mantine-color-blue-6)" />
                    <Text size="xs" fw={500} lineClamp={1} style={{ flex: 1 }}>
                        {sceneMetaData.name}
                    </Text>
                </Group>
                <Group gap="xs">
                    <Badge variant="light" color={getStatusColor(sceneMetaData.status)} size="xs">
                        {getStatusText(sceneMetaData.status)}
                    </Badge>
                    {(sceneMetaData.status === 'draft' || sceneMetaData.status === 'modified') && (
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
