import React, { useState } from 'react'
import {
    useSceneStore
} from '../store/sceneStore'
import {
    useSceneObjectsOptimized,
    useSceneLayersOptimized,
    useSceneMetadata,
    useSelectionState,
    useSceneActions
} from '../store/optimizedSelectors'
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
    onEditObject?: (objectUuid: string, instanceId?: string) => void
}

export const ObjectManager: React.FC<ObjectManagerProps> = ({
    onSaveSceneToLibrary,
    onEditObject
}) => {
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
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
    const [contextMenuObjectUuid, setContextMenuObjectUuid] = useState<string | null>(null)

    // R3F Zustand store data
    const sceneObjects = useSceneObjectsOptimized()
    const objectInstances = useSceneStore(state => state.objectInstances)
    const storeLayers = useSceneLayersOptimized()
    const { lighting: storeLighting } = useSceneMetadata()
    const { selectedObject: storeSelectedObject } = useSelectionState()
    const storeCurrentScene = useSceneStore(state => state.currentScene)
    const {
        removeObject,
        removeObjectInstance,
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
        return sceneObjects.map((sceneObject) => {
            const objectInstancesList = objectInstances.filter(p => p.objectUuid === sceneObject.uuid)
            return {
                name: sceneObject.name,
                count: objectInstancesList.length,
                visible: sceneObject.visible !== false,
                objectUuid: sceneObject.uuid,
                layerId: sceneObject.layerId || 'objects',
                instances: objectInstancesList.map((instance) => ({
                    id: instance.uuid,
                    position: instance.transform?.position || [0,0,0],
                    rotation: instance.transform?.rotation || [0,0,0],
                    scale: instance.transform?.scale || [1,1,1],
                    visible: instance.visible !== false
                }))
            }
        })
    }, [sceneObjects, objectInstances])

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

    const toggleObjectExpanded = (objectUuid: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev)
            if (newSet.has(objectUuid)) {
                newSet.delete(objectUuid)
            } else {
                newSet.add(objectUuid)
            }
            return newSet
        })
    }

    const handleCreateLayer = () => {
        const layerName = newLayerType === 'landscape' ? 'landscape' : newLayerName.trim()
        if (newLayerType === 'object' && !layerName) return

        storeCreateLayer({
            name: layerName,
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
    const handleToggleVisibility = (objectUuid: string) => {
        storeToggleObjectVisibility(objectUuid)
    }

    const handleRemoveObject = (objectUuid: string) => {
        removeObject(objectUuid)
        clearSelection()
    }

    const handleToggleInstanceVisibility = (objectUuid: string, instanceId: string) => {
        storeToggleInstanceVisibility(objectUuid, instanceId)
    }

    const handleRemoveInstance = (objectUuid: string, instanceId: string) => {
        // instanceId теперь это просто objectInstanceUuid
        const instanceIndex = objectInstances.findIndex(p => p.uuid === instanceId)
        if (instanceIndex !== -1) {
            removeObjectInstance(instanceIndex)
            clearSelection()
        }
    }

    const handleHighlightObject = (objectUuid: string, instanceId?: string) => {
        setHoveredObject(objectUuid, instanceId)
    }

    const handleClearHighlight = () => {
        clearHover()
    }

    const handleSelectObject = (objectUuid: string, instanceId?: string) => {
        storeSelectObject(objectUuid, instanceId)
    }

    const handleSaveObjectToLibrary = (objectUuid: string) => {
        console.log('Save object to library not implemented', { objectUuid })
    }

    const handleEditObject = (objectUuid: string, instanceId?: string) => {
        if (onEditObject) return onEditObject(objectUuid, instanceId)
        storeSelectObject(objectUuid, instanceId)
        console.log('Object edit not implemented', { objectUuid, instanceId })
    }

    const handleLightingChange = (newLighting: LightingSettings) => {
        updateLighting(newLighting)
    }

    const handleSaveSceneToLibraryInternal = () => {
        if (onSaveSceneToLibrary) return onSaveSceneToLibrary()
        exportScene(`scene-${Date.now()}.json`)
    }

    // Drag & Drop handlers
    const handleDragStart = (e: React.DragEvent, objectUuid: string) => {
        e.dataTransfer.setData('text/plain', objectUuid)
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
        const objectUuid = e.dataTransfer.getData('text/plain')

        if (objectUuid) {
            storeMoveObjectToLayer(objectUuid, layerId)
        }

        setDragOverLayerId(null)
    }

    // Context Menu handlers
    const handleContextMenu = (e: React.MouseEvent, objectUuid: string) => {
        e.preventDefault()
        setContextMenuPosition({ x: e.clientX, y: e.clientY })
        setContextMenuObjectUuid(objectUuid)
        setContextMenuOpened(true)
    }

    const handleMoveToLayer = (layerId: string) => {
        if (contextMenuObjectUuid !== null) {
            storeMoveObjectToLayer(contextMenuObjectUuid, layerId)
        }
        setContextMenuOpened(false)
        setContextMenuObjectUuid(null)
    }

    const getObjectsByLayer = (layerId: string) => {
        return objects.filter((obj) => {
            return obj.layerId === layerId || (!obj.layerId && layerId === 'objects')
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
                                    const isExpanded = expandedItems.has(obj.objectUuid)
                                    const isSelected = selectedObject?.objectUuid === obj.objectUuid
                                    return (
                                        <ObjectItem
                                            key={`${obj.name}-${obj.objectUuid}`}
                                            obj={obj}
                                            isExpanded={isExpanded}
                                            isSelected={isSelected}
                                            selectedObject={selectedObject}
                                            onToggleExpanded={() => toggleObjectExpanded(obj.objectUuid)}
                                            onHighlight={handleHighlightObject}
                                            onClearHighlight={handleClearHighlight}
                                            onSelect={handleSelectObject}
                                            onToggleVisibility={() => handleToggleVisibility(obj.objectUuid)}
                                            onRemove={() => handleRemoveObject(obj.objectUuid)}
                                            onSaveToLibrary={() => handleSaveObjectToLibrary(obj.objectUuid)}
                                            onEdit={handleEditObject}
                                            onToggleInstanceVisibility={handleToggleInstanceVisibility}
                                            onRemoveInstance={handleRemoveInstance}
                                            onDragStart={(e) => handleDragStart(e, obj.objectUuid)}
                                            onContextMenu={(e) => handleContextMenu(e, obj.objectUuid)}
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
