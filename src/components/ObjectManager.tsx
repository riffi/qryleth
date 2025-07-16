import React, { useState } from 'react'
import {
    Paper,
    Stack,
    Title,
    Text,
    Group,
    Badge,
    ScrollArea,
    ActionIcon,
    Tooltip,
    Divider
} from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import type { SceneReference } from '../types/common'
import type { LightingSettings, SceneLayer } from '../types/scene'
import { SceneHeader } from './SceneHeader'
import { LightingControls } from './LightingControls'
import { LayerItem } from './LayerItem'
import { LayerModals } from './LayerModals'
import { ObjectItem } from './ObjectItem'
import type { ObjectInfo } from './ObjectItem'

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
    layers?: SceneLayer[]
    onCreateLayer?: (name: string) => void
    onUpdateLayer?: (layerId: string, updates: Partial<SceneLayer>) => void
    onDeleteLayer?: (layerId: string) => void
    onToggleLayerVisibility?: (layerId: string) => void
    onMoveObjectToLayer?: (objectIndex: number, layerId: string) => void
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
    onLightingChange,
    layers,
    onCreateLayer,
    onUpdateLayer,
    onDeleteLayer,
    onToggleLayerVisibility,
    onMoveObjectToLayer
}) => {
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
    const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['objects']))
    const [createLayerModalOpened, setCreateLayerModalOpened] = useState(false)
    const [editLayerModalOpened, setEditLayerModalOpened] = useState(false)
    const [newLayerName, setNewLayerName] = useState('')
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
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

    const toggleObjectExpanded = (objectIndex: number) => {
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

    return (
        <>
            <Paper shadow="sm" radius="md" p="sm" style={{ width: 280, height: '100%' }}>
                <Stack gap="sm" style={{ height: '100%' }}>
                    <Title order={4} c="gray.6" size="md">
                        Сцена
                    </Title>

                    <SceneHeader
                        currentScene={currentScene}
                        onSaveSceneToLibrary={onSaveSceneToLibrary}
                    />

                    <LightingControls
                        lighting={lighting}
                        onLightingChange={onLightingChange}
                    />


                    <Group justify="space-between" align="center">
                        <Text size="xs" fw={500} c="dimmed">
                            Слои
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
                                layers.map((layer) => {
                                    const layerObjects = getObjectsByLayer(layer.id)
                                    const isLayerExpanded = expandedLayers.has(layer.id)

                                    return (
                                        <LayerItem
                                            key={layer.id}
                                            layer={layer}
                                            layerObjects={layerObjects}
                                            isExpanded={isLayerExpanded}
                                            expandedItems={expandedItems}
                                            selectedObject={selectedObject}
                                            dragOverLayerId={dragOverLayerId}
                                            onToggleExpanded={toggleLayerExpanded}
                                            onToggleVisibility={onToggleLayerVisibility || (() => {})}
                                            onEdit={openEditLayerModal}
                                            onDelete={onDeleteLayer || (() => {})}
                                            onToggleObjectExpanded={toggleObjectExpanded}
                                            onHighlightObject={onHighlightObject}
                                            onClearHighlight={onClearHighlight}
                                            onSelectObject={onSelectObject}
                                            onToggleObjectVisibility={onToggleVisibility}
                                            onRemoveObject={onRemoveObject}
                                            onSaveObjectToLibrary={onSaveObjectToLibrary}
                                            onEditObject={onEditObject}
                                            onToggleInstanceVisibility={onToggleInstanceVisibility}
                                            onRemoveInstance={onRemoveInstance}
                                            onDragStart={handleDragStart}
                                            onContextMenu={handleContextMenu}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                        />
                                    )
                                })
                            ) : (
                                // Fallback для случая без слоев
                                objects.map((obj) => {
                                    const isExpanded = expandedItems.has(obj.objectIndex)
                                    const isSelected = selectedObject?.objectIndex === obj.objectIndex && !selectedObject?.instanceId
                                    return (
                                        <ObjectItem
                                            key={`${obj.name}-${obj.objectIndex}`}
                                            obj={obj}
                                            isExpanded={isExpanded}
                                            isSelected={isSelected}
                                            selectedObject={selectedObject}
                                            onToggleExpanded={() => toggleObjectExpanded(obj.objectIndex)}
                                            onHighlight={() => onHighlightObject?.(obj.objectIndex)}
                                            onClearHighlight={() => onClearHighlight?.()}
                                            onSelect={() => onSelectObject?.(obj.objectIndex)}
                                            onToggleVisibility={() => onToggleVisibility?.(obj.objectIndex)}
                                            onRemove={() => onRemoveObject?.(obj.objectIndex)}
                                            onSaveToLibrary={() => onSaveObjectToLibrary?.(obj.objectIndex)}
                                            onEdit={() => onEditObject?.(obj.objectIndex)}
                                            onToggleInstanceVisibility={onToggleInstanceVisibility}
                                            onRemoveInstance={onRemoveInstance}
                                            onDragStart={(e) => handleDragStart(e, obj.objectIndex)}
                                            onContextMenu={(e) => handleContextMenu(e, obj.objectIndex)}
                                        />
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

            <LayerModals
                createLayerModalOpened={createLayerModalOpened}
                setCreateLayerModalOpened={setCreateLayerModalOpened}
                newLayerName={newLayerName}
                setNewLayerName={setNewLayerName}
                onCreateLayer={handleCreateLayer}
                editLayerModalOpened={editLayerModalOpened}
                setEditLayerModalOpened={setEditLayerModalOpened}
                onUpdateLayer={handleUpdateLayer}
                contextMenuOpened={contextMenuOpened}
                setContextMenuOpened={setContextMenuOpened}
                contextMenuPosition={contextMenuPosition}
                layers={layers}
                onMoveToLayer={handleMoveToLayer}
            />
        </>
    )
}

// Экспортируем интерфейс для использования в других компонентах
export { type ObjectInfo }
