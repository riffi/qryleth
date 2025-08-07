import React from 'react'
import { Group, Text, Box, ActionIcon, Menu, Collapse, Stack } from '@mantine/core'
import { IconCube, IconEye, IconEyeOff, IconEdit, IconBookmark, IconTrash, IconChevronDown, IconChevronRight, IconDownload, IconCopy } from '@tabler/icons-react'
import { SceneObjectInstanceItem } from './SceneObjectInstanceItem.tsx'
import type { ObjectInstance } from '../../../types/common'
import { useSceneObjectManager } from './SceneObjectManagerContext.tsx'

export interface ObjectInfo {
    name: string
    count: number
    visible: boolean
    objectUuid: string
    /** UUID объекта в библиотеке, если он был добавлен из неё */
    libraryUuid?: string
    instances?: ObjectInstance[]
    layerId?: string
}

interface ObjectItemProps {
    obj: ObjectInfo
    isExpanded: boolean
    isSelected: boolean
    selectedObject?: { objectUuid: string; instanceId?: string } | null
}

/**
 * Компонент отображения отдельного объекта сцены
 * с возможностью управления и контекстным меню
 */
export const SceneObjectItem: React.FC<ObjectItemProps> = ({
    obj,
    isExpanded,
    isSelected,
    selectedObject,
}) => {
    const {
        toggleObjectExpanded,
        highlightObject,
        clearHighlight,
        selectObject,
        toggleObjectVisibility,
        removeObject,
        saveObjectToLibrary,
        editObject,
        exportObject,
        copyObject,
        toggleInstanceVisibility,
        removeInstance,
        dragStart,
        contextMenu,
    } = useSceneObjectManager()
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
                onMouseEnter={() => {
                    // При наведении подсвечиваем первый экземпляр объекта
                    const firstInstanceId = obj.instances?.[0]?.id
                    highlightObject(obj.objectUuid, firstInstanceId)
                }}
                onMouseLeave={clearHighlight}
                onClick={() => {
                    // При клике выбираем первый экземпляр объекта
                    const firstInstanceId = obj.instances?.[0]?.id
                    selectObject(obj.objectUuid, firstInstanceId)
                }}
                onDragStart={(e) => dragStart(e, obj.objectUuid)}
                onContextMenu={(e) => contextMenu(e, obj.objectUuid)}
            >
                <Group justify="space-between" align="center" gap="xs">
                    <Group gap="xs" style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                        <ActionIcon
                            size="xs"
                            variant="transparent"
                            onClick={(e) => {
                                e.stopPropagation()
                                toggleObjectExpanded(obj.objectUuid)
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
                        <IconCube size={12} color="var(--mantine-color-blue-4)" style={{ flexShrink: 0 }} />
                        <Text
                            size="xs"
                            fw={500}
                            lineClamp={1}
                            style={{
                                userSelect: 'none',
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {obj.name}
                        </Text>
                        {/* Если объект был добавлен из библиотеки, показываем иконку */}
                        {obj.libraryUuid && (
                            <IconBookmark size={12} color="var(--mantine-color-green-5)" />
                        )}
                        <Text size="xs" c="dimmed" style={{ fontSize: '10px', flexShrink: 0 }}>
                            ({obj.count})
                        </Text>
                    </Group>

                    <Group gap="xs">
                        <ActionIcon
                            size="xs"
                            variant="transparent"
                            onClick={(e) => {
                                e.stopPropagation()
                                toggleObjectVisibility(obj.objectUuid)
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
                                        const firstInstanceId = obj.instances?.[0]?.id
                                        editObject(obj.objectUuid, firstInstanceId)
                                    }}
                                >
                                    Редактировать
                                </Menu.Item>
                                {/* Пункт сохранения доступен только для объектов без libraryUuid */}
                                {!obj.libraryUuid && (
                                    <Menu.Item
                                        leftSection={<IconBookmark size={14} />}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            saveObjectToLibrary(obj.objectUuid)
                                        }}
                                    >
                                        Сохранить в библиотеку
                                    </Menu.Item>
                                )}
                                <Menu.Item
                                    leftSection={<IconDownload size={14} />}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        exportObject(obj.objectUuid)
                                    }}
                                >
                                    Выгрузить JSON
                                </Menu.Item>
                                <Menu.Item
                                    leftSection={<IconCopy size={14} />}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        copyObject(obj.objectUuid)
                                    }}
                                >
                                    Копировать JSON
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                    leftSection={<IconTrash size={14} />}
                                    color="red"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        removeObject(obj.objectUuid)
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
                                <SceneObjectInstanceItem
                                    key={instance.id}
                                    object={obj}
                                    index={obj.instances?.indexOf(instance)}
                                    instance={instance}
                                    isSelected={selectedObject?.objectUuid === obj.objectUuid && selectedObject?.instanceId === instance.id}
                                    onHighlight={() => highlightObject(obj.objectUuid, instance.id)}
                                    onClearHighlight={clearHighlight}
                                    onSelect={() => selectObject(obj.objectUuid, instance.id)}
                                    onToggleVisibility={() => toggleInstanceVisibility(obj.objectUuid, instance.id)}
                                    onEdit={() => editObject(obj.objectUuid, instance.id)}
                                    onRemove={() => removeInstance(obj.objectUuid, instance.id)}
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
