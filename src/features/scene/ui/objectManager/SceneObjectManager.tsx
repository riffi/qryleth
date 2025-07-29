import React, { useState } from 'react'
import {
    useSceneStore
} from '../../model/sceneStore.ts'
import {
    useSceneObjectsOptimized,
    useSceneLayersOptimized,
    useSceneMetadata,
    useSelectionState,
    useSceneActions
} from '../../model/optimizedSelectors.ts'
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
import { IconPlus, IconCheck } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { db } from '@/shared/lib/database.ts'
import type { SceneLayer } from '../../../types/scene'
import { SceneHeader } from './SceneHeader.tsx'
import { LightingControls } from './LightingControls.tsx'
import { SceneLayerItem } from './SceneLayerItem.tsx'
import { SceneLayerModals } from './SceneLayerModals.tsx'
import { SceneObjectItem } from './SceneObjectItem.tsx'
import type { ObjectInfo } from './SceneObjectItem.tsx'
import { SaveObjectDialog } from '@/shared/ui'
import { AddObjectFromLibraryModal } from './AddObjectFromLibraryModal.tsx'
import { useErrorHandler } from '@/shared/hooks'
import type { LightingSettings } from '@/entities/lighting'
import type {ObjectRecord} from "@/shared/api";
import { downloadJson } from '@/shared/lib/downloadJson.ts'
import { copyJsonToClipboard } from '@/shared/lib/copyJsonToClipboard.ts'
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/scene/constants.ts'
import { SceneAPI } from '@/features/scene/lib/sceneAPI'
import type { ObjectManagerProps } from './types.ts'
import { SceneObjectManagerProvider } from './SceneObjectManagerContext.tsx'

export const SceneObjectManager: React.FC<ObjectManagerProps> = ({
    onSaveSceneToLibrary,
    onEditObject
}) => {
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
    const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['objects']))
    const [createLayerModalOpened, setCreateLayerModalOpened] = useState(false)
    const [editLayerModalOpened, setEditLayerModalOpened] = useState(false)
    const [newLayerName, setNewLayerName] = useState('')
    const [newLayerType, setNewLayerType] = useState<'object' | 'landscape' | 'water'>('object')
    const [newLayerWidth, setNewLayerWidth] = useState(10)
    const [newLayerHeight, setNewLayerHeight] = useState(10)
    const [newLayerShape, setNewLayerShape] = useState<'plane' | 'perlin'>('plane')
    const [newLayerColor, setNewLayerColor] = useState<string>(DEFAULT_LANDSCAPE_COLOR)
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
    const [editingLayerType, setEditingLayerType] = useState<'object' | 'landscape' | 'water'>('object')
    const [editingLayerWidth, setEditingLayerWidth] = useState(10)
    const [editingLayerHeight, setEditingLayerHeight] = useState(10)
    const [editingLayerShape, setEditingLayerShape] = useState<'plane' | 'perlin'>('plane')
    const [editingLayerColor, setEditingLayerColor] = useState<string>(DEFAULT_LANDSCAPE_COLOR)
    const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null)
    const [contextMenuOpened, setContextMenuOpened] = useState(false)
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
    const [contextMenuObjectUuid, setContextMenuObjectUuid] = useState<string | null>(null)
    const [saveObjectModalOpened, setSaveObjectModalOpened] = useState(false)
    const [savingObjectUuid, setSavingObjectUuid] = useState<string | null>(null)
    const [addObjectModalOpened, setAddObjectModalOpened] = useState(false)
    const [targetLayerId, setTargetLayerId] = useState<string | null>(null)
    const handleError = useErrorHandler()

    // R3F Zustand store data
    const sceneObjects = useSceneObjectsOptimized()
    const objectInstances = useSceneStore(state => state.objectInstances)
    const storeLayers = useSceneLayersOptimized()
    const { lighting: storeLighting } = useSceneMetadata()
    const { selectedObject: storeSelectedObject } = useSelectionState()
    const sceneMetaData = useSceneStore(state => state.sceneMetaData)
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
                libraryUuid: sceneObject.libraryUuid,
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

    /**
     * Создать новый слой сцены на основе введённых параметров.
     * Цвет слоя сохраняется в поле `color` и используется при рендеринге.
     * При создании перлин-слоя автоматически корректирует позиции всех объектов.
     */
    const handleCreateLayer = () => {
        let layerName = newLayerName.trim()

        // Set default names for special layer types
        if (newLayerType === 'landscape') {
            layerName = 'landscape'
        } else if (newLayerType === 'water') {
            layerName = 'вода'
        }

        if (newLayerType === 'object' && !layerName) return

        const layerData = {
            name: layerName,
            type: newLayerType,
            visible: true,
            position: layers.length,
            color: newLayerColor,
            ...((newLayerType === 'landscape' || newLayerType === 'water') && {
                width: newLayerWidth,
                height: newLayerHeight,
                shape: newLayerShape
            })
        }

        storeCreateLayer(layerData)

        // If creating a perlin landscape layer, adjust all object instances
        if (newLayerType === 'landscape' && newLayerShape === 'perlin') {
            // Get the created layer ID (it's generated in store)
            const createdLayers = useSceneStore.getState().layers
            const createdLayer = createdLayers[createdLayers.length - 1]

            if (createdLayer) {
                // Retry adjustment until noiseData is available
                const attemptAdjustment = (attempt = 1, maxAttempts = 10) => {
                    const currentLayer = useSceneStore.getState().layers.find(l => l.id === createdLayer.id)

                    if (currentLayer?.noiseData) {
                        const result = SceneAPI.adjustInstancesForPerlinTerrain(createdLayer.id)
                        if (result.success && result.adjustedCount && result.adjustedCount > 0) {
                            notifications.show({
                                title: 'Объекты скорректированы',
                                message: `Позиции ${result.adjustedCount} объектов скорректированы под рельеф Perlin Noise`,
                                color: 'green'
                            })
                        }
                    } else if (attempt < maxAttempts) {
                        // Wait longer between attempts
                        setTimeout(() => attemptAdjustment(attempt + 1, maxAttempts), 200 * attempt)
                    } else {
                        console.warn('Failed to adjust objects: noiseData not available after', maxAttempts, 'attempts')
                    }
                }

                // Start first attempt after short delay
                setTimeout(() => attemptAdjustment(), 100)
            }
        }

        setNewLayerName('')
        setNewLayerType('object')
        setNewLayerWidth(10)
        setNewLayerHeight(10)
        setNewLayerShape('plane')
        setNewLayerColor(DEFAULT_LANDSCAPE_COLOR)
        setCreateLayerModalOpened(false)
    }

    /**
     * Обновить параметры выбранного слоя.
     * Передает новые значения в zustand‑хранилище, включая цвет поверхности.
     */
    const handleUpdateLayer = () => {
        if (!newLayerName.trim() || !editingLayerId) return
        const updates: Partial<SceneLayer> = {
            name: newLayerName.trim(),
            width: (editingLayerType === 'landscape' || editingLayerType === 'water') ? editingLayerWidth : undefined,
            height: (editingLayerType === 'landscape' || editingLayerType === 'water') ? editingLayerHeight : undefined,
            shape: (editingLayerType === 'landscape' || editingLayerType === 'water') ? editingLayerShape : undefined,
            color: editingLayerColor
        }
        storeUpdateLayer(editingLayerId, updates)
        setNewLayerName('')
        setEditingLayerId(null)
        setEditLayerModalOpened(false)
    }

    /**
     * Открыть модальное окно редактирования слоя и заполнить поля текущими значениями.
     * Цвет слоя также подставляется в поле выбора цвета.
     */
    const openEditLayerModal = (layer: SceneLayer) => {
        setEditingLayerId(layer.id)
        setNewLayerName(layer.name)
        setEditingLayerType(layer.type || 'object')
        setEditingLayerWidth(layer.width || 10)
        setEditingLayerHeight(layer.height || 10)
        setEditingLayerShape(layer.shape || 'plane')
        setEditingLayerColor(layer.color || DEFAULT_LANDSCAPE_COLOR)
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
        setSavingObjectUuid(objectUuid)
        setSaveObjectModalOpened(true)
    }

    /**
     * Сохраняет выбранный объект в библиотеку
     * и присваивает его UUID из библиотеки сценному объекту
     */
    const handleSaveObject = async (name: string, description?: string): Promise<string | undefined> => {
        if (!savingObjectUuid) return
        const object = useSceneStore.getState().objects.find(o => o.uuid === savingObjectUuid)
        if (!object) return

        const { uuid, primitives } = object
        const objectData = { uuid, name: object.name, primitives }

        try {
            const libraryUuid = await db.saveObject(name, objectData, description, undefined)
            // обновить объект сцены, добавив UUID записи библиотеки
            useSceneStore.getState().updateObject(object.uuid, { libraryUuid })
            notifications.show({
                title: 'Успешно!',
                message: `Объект "${name}" сохранен в библиотеку`,
                color: 'green',
                icon: <IconCheck size="1rem" />,
            })
            setSaveObjectModalOpened(false)
            setSavingObjectUuid(null)
            return libraryUuid
        } catch (error: unknown) {
            if (
                error &&
                typeof error === 'object' &&
                'name' in error &&
                (error as { name?: string }).name === 'DuplicateNameError'
            ) {
                handleError(error, 'Объект с таким именем уже существует')
            } else if (
                error &&
                typeof error === 'object' &&
                'name' in error &&
                (error as { name?: string }).name === 'ValidationError'
            ) {
                handleError(error, 'Название объекта не может быть пустым')
            } else {
                handleError(error, 'Не удалось сохранить объект')
            }
        }
    }

    /**
     * Выгрузить выбранный объект в JSON файл
     * @param objectUuid UUID объекта, который требуется выгрузить
     */
    const handleExportObject = (objectUuid: string) => {
        const object = useSceneStore.getState().objects.find(o => o.uuid === objectUuid)
        if (!object) return
        const data = { uuid: object.uuid, name: object.name, primitives: object.primitives }
        downloadJson(`${object.name}-${object.uuid}.json`, data)
    }

    /**
     * Копировать объект в буфер обмена в формате JSON
     * @param objectUuid UUID объекта, который требуется скопировать
     */
    const handleCopyObject = async (objectUuid: string) => {
        const object = useSceneStore.getState().objects.find(o => o.uuid === objectUuid)
        if (!object) return
        const data = { uuid: object.uuid, name: object.name, primitives: object.primitives }
        await copyJsonToClipboard(data)
    }

    const handleEditObject = (objectUuid: string, instanceId?: string) => {
        if (onEditObject) return onEditObject(objectUuid, instanceId)
        storeSelectObject(objectUuid, instanceId)
        console.log('Object edit not implemented', { objectUuid, instanceId })
    }

    const handleAddObjectFromLibrary = (layerId: string) => {
        setTargetLayerId(layerId)
        setAddObjectModalOpened(true)
    }

    /**
     * Добавить выбранный объект библиотеки в сцену и сохранить его UUID
     * в поле libraryUuid для последующей идентификации
     */
    const handleAddObjectToScene = async (object: ObjectRecord) => {
        if (!targetLayerId) return

        try {
            const result = await SceneAPI.addObjectFromLibrary(
                object.uuid,
                targetLayerId
            )

            if (!result.success) {
                notifications.show({
                    title: 'Ошибка',
                    message: result.error || 'Не удалось добавить объект из библиотеки',
                    color: 'red'
                })
                return
            }

            notifications.show({
                title: 'Успешно!',
                message: `Объект "${object.name}" добавлен в сцену`,
                color: 'green',
                icon: <IconCheck size="1rem" />,
            })

            setAddObjectModalOpened(false)
            setTargetLayerId(null)

        } catch (error) {
            console.error('Error adding object from library:', error)
            notifications.show({
                title: 'Ошибка',
                message: 'Не удалось добавить объект из библиотеки',
                color: 'red'
            })
        }
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
        <SceneObjectManagerProvider
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
            newLayerColor={newLayerColor}
            setNewLayerColor={setNewLayerColor}
            handleCreateLayer={handleCreateLayer}
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
            editingLayerColor={editingLayerColor}
            setEditingLayerColor={setEditingLayerColor}
            handleUpdateLayer={handleUpdateLayer}
            contextMenuOpened={contextMenuOpened}
            setContextMenuOpened={setContextMenuOpened}
            contextMenuPosition={contextMenuPosition}
            layers={layers}
            handleMoveToLayer={handleMoveToLayer}
            toggleObjectExpanded={toggleObjectExpanded}
            highlightObject={handleHighlightObject}
            clearHighlight={handleClearHighlight}
            selectObject={handleSelectObject}
            toggleObjectVisibility={handleToggleVisibility}
            removeObject={handleRemoveObject}
            saveObjectToLibrary={handleSaveObjectToLibrary}
            editObject={handleEditObject}
            toggleInstanceVisibility={handleToggleInstanceVisibility}
            removeInstance={handleRemoveInstance}
            dragStart={handleDragStart}
            contextMenu={handleContextMenu}
            dragOver={handleDragOver}
            dragLeave={handleDragLeave}
            drop={handleDrop}
            addObjectFromLibrary={handleAddObjectFromLibrary}
            exportObject={handleExportObject}
            copyObject={handleCopyObject}
        >
        <>
            <Paper shadow="sm" radius="md" p="sm" style={{ height: '100%' }}>
                <Stack gap="sm" style={{ height: '100%' }}>
                    <Title order={4} c="gray.6" size="md">
                        Сцена
                    </Title>

                    <SceneHeader
                        sceneMetaData={sceneMetaData}
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
                                    color="blue"
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
                                        <SceneLayerItem
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
                                        />
                                    )
                                })
                            ) : (
                                // Fallback для случая без слоев
                                objects.map((obj) => {
                                    const isExpanded = expandedItems.has(obj.objectUuid)
                                    const isSelected = selectedObject?.objectUuid === obj.objectUuid
                                    return (
                                        <SceneObjectItem
                                            key={`${obj.name}-${obj.objectUuid}`}
                                            obj={obj}
                                            isExpanded={isExpanded}
                                            isSelected={isSelected}
                                            selectedObject={selectedObject}
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



            <SaveObjectDialog
                opened={saveObjectModalOpened}
                onClose={() => {
                    setSaveObjectModalOpened(false)
                    setSavingObjectUuid(null)
                }}
                onSave={handleSaveObject}
                objectName={
                    savingObjectUuid ? sceneObjects.find(o => o.uuid === savingObjectUuid)?.name : undefined
                }
            />

            <AddObjectFromLibraryModal
                opened={addObjectModalOpened}
                onClose={() => {
                    setAddObjectModalOpened(false)
                    setTargetLayerId(null)
                }}
                onAddObject={handleAddObjectToScene}
                targetLayerId={targetLayerId}
                sceneObjects={sceneObjects}
            />
        </>
        </SceneObjectManagerProvider>
    )
}

// Экспортируем интерфейс для использования в других компонентах
export { type ObjectInfo }
