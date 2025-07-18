import React, { useState } from 'react'
import {
    useSceneStore
} from '../../../stores/sceneStore'
import {
    useSceneObjectsOptimized,
    useSceneLayersOptimized,
    useSceneMetadata,
    useSelectionState,
    useSceneActions
} from '../../../stores/optimizedSelectors'
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
import type { SceneReference } from '../../../types/common'
import type { LightingSettings, SceneLayer } from '../../../types/scene'
import { SceneHeader } from './SceneHeader'
import { LightingControls } from './LightingControls'
import { LayerItem } from './LayerItem'
import { LayerModals } from './LayerModals'
import { ObjectItem } from './ObjectItem'
import type { ObjectInfo } from './ObjectItem'

interface ObjectManagerProps {
    // Optional overrides for store actions
    onSaveSceneToLibrary?: () => void
    onEditObject?: (objectIndex: number, instanceId?: string) => void
}

export const ObjectManager: React.FC<ObjectManagerProps> = ({
    onSaveSceneToLibrary,
    onEditObject
}) => {
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
    const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['objects']))
    const [createLayerModalOpened, setCreateLayerModalOpened] = useState(false)
    const [editLayerModalOpened, setEditLayerModalOpened] = useState(false)
    const [newLayerName, setNewLayerName] = useState('')
    const [newLayerType, setNewLayerType] = useState<'object' | 'landscape'>('object')
    const [newLayerWidth, setNewLayerWidth] = useState(10)
    const [newLayerHeight, setNewLayerHeight] = useState(10)
    const [newLayerShape, setNewLayerShape] = useState<'plane' | 'perlin'>('plane')
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
    const [editingLayerType, setEditingLayerType] = useState<'object' | 'landscape'>('object')
    const [editingLayerWidth, setEditingLayerWidth] = useState(10)
    const [editingLayerHeight, setEditingLayerHeight] = useState(10)
    const [editingLayerShape, setEditingLayerShape] = useState<'plane' | 'perlin'>('plane')
    const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null)
    const [contextMenuOpened, setContextMenuOpened] = useState(false)
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
    const [contextMenuObjectIndex, setContextMenuObjectIndex] = useState<number | null>(null)

    // R3F Zustand store data
    const sceneObjects = useSceneObjectsOptimized()
    const placements = useSceneStore(state => state.placements)
    const storeLayers = useSceneLayersOptimized()
    const { lighting: storeLighting } = useSceneMetadata()
    const { selectedObject: storeSelectedObject } = useSelectionState()
    const storeCurrentScene = useSceneStore(state => state.currentScene)
    const {
        removeObject,
        removePlacement,
        selectObject: storeSelectObject,
        clearSelection,
        setHoveredObject,
        clearHover,
        updateLighting,
        createLayer: storeCreateLayer,
        updateLayer: storeUpdateLayer,
        deleteLayer: storeDeleteLayer,
        toggleLayerVisibility: storeToggleLayerVisibility,
        toggleObjectVisibility: storeToggleObjectVisibility,
        toggleInstanceVisibility: storeToggleInstanceVisibility,
        moveObjectToLayer: storeMoveObjectToLayer,
        exportScene,
    } = useSceneActions()

    const objects = React.useMemo<ObjectInfo[]>(() => {
        return sceneObjects.map((sceneObject, objectIndex) => {
            const objectPlacements = placements.filter(p => p.objectIndex === objectIndex)
            return {
                name: sceneObject.name,
                count: objectPlacements.length,
                visible: sceneObject.visible !== false,
                objectIndex,
                layerId: sceneObject.layerId || 'objects',
                instances: objectPlacements.map((placement, placementIndex) => ({
                    id: `${objectIndex}-${placementIndex}`,
                    position: placement.position || [0,0,0],
                    rotation: placement.rotation || [0,0,0],
                    scale: placement.scale || [1,1,1],
                    visible: placement.visible !== false
                }))
            }
        })
    }, [sceneObjects, placements])

    const layers = storeLayers
    const lighting = storeLighting
    const selectedObject = storeSelectedObject
    const currentScene = storeCurrentScene

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
        if (!newLayerName.trim()) return
        storeCreateLayer({
            name: newLayerName.trim(),
            type: newLayerType,
            visible: true,
            position: layers.length,
            ...(newLayerType === 'landscape' && {
                width: newLayerWidth,
                height: newLayerHeight,
                shape: newLayerShape
            })
        })
        setNewLayerName('')
        setNewLayerType('object')
        setNewLayerWidth(10)
        setNewLayerHeight(10)
        setNewLayerShape('plane')
        setCreateLayerModalOpened(false)
    }

    const handleUpdateLayer = () => {
        if (!newLayerName.trim() || !editingLayerId) return
        const updates: Partial<SceneLayer> = {
            name: newLayerName.trim(),
            width: editingLayerType === 'landscape' ? editingLayerWidth : undefined,
            height: editingLayerType === 'landscape' ? editingLayerHeight : undefined,
            shape: editingLayerType === 'landscape' ? editingLayerShape : undefined
        }
        storeUpdateLayer(editingLayerId, updates)
        setNewLayerName('')
        setEditingLayerId(null)
        setEditLayerModalOpened(false)
    }

    const openEditLayerModal = (layer: SceneLayer) => {
        setEditingLayerId(layer.id)
        setNewLayerName(layer.name)
        setEditingLayerType(layer.type || 'object')
        setEditingLayerWidth(layer.width || 10)
        setEditingLayerHeight(layer.height || 10)
        setEditingLayerShape(layer.shape || 'plane')
        setEditLayerModalOpened(true)
    }

    // Handlers using Zustand store
    const handleToggleVisibility = (objectIndex: number) => {
        storeToggleObjectVisibility(objectIndex)
    }

    const handleRemoveObject = (objectIndex: number) => {
        removeObject(objectIndex)
        clearSelection()
    }

    const handleToggleInstanceVisibility = (objectIndex: number, instanceId: string) => {
        storeToggleInstanceVisibility(objectIndex, instanceId)
    }

    const handleRemoveInstance = (objectIndex: number, instanceId: string) => {
        const placementIndex = parseInt(instanceId.split('-')[1])
        if (!isNaN(placementIndex)) {
            removePlacement(placementIndex)
            clearSelection()
        }
    }

    const handleHighlightObject = (objectIndex: number, instanceId?: string) => {
        setHoveredObject(objectIndex, instanceId)
    }

    const handleClearHighlight = () => {
        clearHover()
    }

    const handleSelectObject = (objectIndex: number, instanceId?: string) => {
        storeSelectObject(objectIndex, instanceId)
    }

    const handleSaveObjectToLibrary = (objectIndex: number) => {
        console.log('Save object to library not implemented', { objectIndex })
    }

    const handleEditObject = (objectIndex: number, instanceId?: string) => {
        if (onEditObject) return onEditObject(objectIndex, instanceId)
        storeSelectObject(objectIndex, instanceId)
        console.log('Object edit not implemented', { objectIndex, instanceId })
    }

    const handleLightingChange = (newLighting: LightingSettings) => {
        updateLighting(newLighting)
    }

    const handleSaveSceneToLibraryInternal = () => {
        if (onSaveSceneToLibrary) return onSaveSceneToLibrary()
        exportScene(`scene-${Date.now()}.json`)
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

        if (objectIndex !== null) {
            storeMoveObjectToLayer(objectIndex, layerId)
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
        if (contextMenuObjectIndex !== null) {
            storeMoveObjectToLayer(contextMenuObjectIndex, layerId)
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
                        onSaveSceneToLibrary={handleSaveSceneToLibraryInternal}
                    />

                    <LightingControls
                        lighting={lighting}
                        onLightingChange={handleLightingChange}
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
                            {layers && layers.length > 0 ? (
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
                                            onToggleVisibility={storeToggleLayerVisibility}
                                            onEdit={openEditLayerModal}
                                            onEditSize={openEditLayerModal}
                                            onDelete={storeDeleteLayer}
                                            onToggleObjectExpanded={toggleObjectExpanded}
                                            onHighlightObject={handleHighlightObject}
                                            onClearHighlight={handleClearHighlight}
                                            onSelectObject={handleSelectObject}
                                            onToggleObjectVisibility={handleToggleVisibility}
                                            onRemoveObject={handleRemoveObject}
                                            onSaveObjectToLibrary={handleSaveObjectToLibrary}
                                            onEditObject={handleEditObject}
                                            onToggleInstanceVisibility={handleToggleInstanceVisibility}
                                            onRemoveInstance={handleRemoveInstance}
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
                                            onHighlight={() => handleHighlightObject(obj.objectIndex)}
                                            onClearHighlight={() => handleClearHighlight()}
                                            onSelect={() => handleSelectObject(obj.objectIndex)}
                                            onToggleVisibility={() => handleToggleVisibility(obj.objectIndex)}
                                            onRemove={() => handleRemoveObject(obj.objectIndex)}
                                            onSaveToLibrary={() => handleSaveObjectToLibrary(obj.objectIndex)}
                                            onEdit={() => handleEditObject(obj.objectIndex)}
                                            onToggleInstanceVisibility={handleToggleInstanceVisibility}
                                            onRemoveInstance={handleRemoveInstance}
                                            onDragStart={(e) => handleDragStart(e, obj.objectIndex)}
                                            onContextMenu={(e) => handleContextMenu(e, obj.objectIndex)}
                                        />
                                    )
                                })
                            )}

                            {objects.length === 0 && (
                                <Text size="sm" c="dimmed" ta="center" py="xl">
                                    Нет объектов на сцене
                                </Text>
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
                newLayerType={newLayerType}
                setNewLayerType={setNewLayerType}
                newLayerWidth={newLayerWidth}
                setNewLayerWidth={setNewLayerWidth}
                newLayerHeight={newLayerHeight}
                setNewLayerHeight={setNewLayerHeight}
                newLayerShape={newLayerShape}
                setNewLayerShape={setNewLayerShape}
                onCreateLayer={handleCreateLayer}
                editLayerModalOpened={editLayerModalOpened}
                setEditLayerModalOpened={setEditLayerModalOpened}
                editingLayerType={editingLayerType}
                setEditingLayerType={setEditingLayerType}
                editingLayerWidth={editingLayerWidth}
                setEditingLayerWidth={setEditingLayerWidth}
                editingLayerHeight={editingLayerHeight}
                setEditingLayerHeight={setEditingLayerHeight}
                editingLayerShape={editingLayerShape}
                setEditingLayerShape={setEditingLayerShape}
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
