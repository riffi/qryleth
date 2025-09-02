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
    ScrollArea,
    ActionIcon,
    Tooltip,
    Divider
} from '@mantine/core'
import { IconPlus, IconCheck } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { db } from '@/shared/lib/database.ts'
// Заголовок сцены с мета-информацией переносится в хедер страницы.
// Ранее использовался компонент SceneHeader внутри правой панели.
// По новым правилам архитектуры мета-управление должно быть вверху,
// поэтому SceneHeader здесь более не используется.
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
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/editor/scene/constants.ts'
import { SceneAPI } from '@/features/editor/scene/lib/sceneAPI'
import { generateObjectPreview } from '@/features/editor/object/lib'
import type {
    ObjectManagerProps,
    SceneLayerModalMode,
    SceneLayerFormData
} from './types.ts'
import { SceneObjectManagerProvider } from './SceneObjectManagerContext.tsx'
import { createEmptySceneLayer } from './layerFormUtils.ts'
import type {SceneLayer} from "@/entities";
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'

export const SceneObjectManager: React.FC<ObjectManagerProps> = ({
    onSaveSceneToLibrary,
    onEditObject
}) => {
    const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['objects']))
    const [layerModalOpened, setLayerModalOpened] = useState(false)
    const [layerModalMode, setLayerModalMode] = useState<SceneLayerModalMode>('create')
    const [layerFormData, setLayerFormData] = useState<SceneLayerFormData>(createEmptySceneLayer())
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


    /**
     * Создать новый слой сцены на основе введённых параметров.
     * Цвет слоя сохраняется в поле `color` и используется при рендеринге.
     * При создании terrain-слоя автоматически корректирует позиции всех объектов.
     */
    const handleCreateLayer = async () => {
        let layerName = layerFormData.name.trim()

        // Названия по умолчанию для специальных типов слоёв
        if (layerFormData.type === GfxLayerType.Landscape) {
            layerName = 'landscape'
        } else if (layerFormData.type === GfxLayerType.Water) {
            layerName = 'вода'
        }

        if (layerFormData.type === GfxLayerType.Object && !layerName) return

        const layerData = {
            name: layerName,
            type: layerFormData.type,
            visible: true,
            position: layers.length,
            color: layerFormData.color,
            ...((layerFormData.type === GfxLayerType.Landscape || layerFormData.type === GfxLayerType.Water) && {
                width: layerFormData.width,
                // Используем термин depth вместо height
                depth: (layerFormData as any).depth ?? (layerFormData as any).height,
                shape: layerFormData.shape
            }),
            // Для водного слоя пробрасываем пользовательские параметры воды
            ...(layerFormData.type === GfxLayerType.Water ? { water: (layerFormData as any).water } : {})
        }

        try {
            // Используем централизованный API для создания слоя с выравниванием
            const result = await SceneAPI.createLayerWithAdjustment(layerData, undefined, {
                maxAttempts: 10,
                showNotifications: true
            })

            if (result.success) {
                setLayerFormData(createEmptySceneLayer())
                setLayerModalOpened(false)
            } else {
                notifications.show({
                    title: 'Ошибка создания слоя',
                    message: result.error || 'Не удалось создать слой',
                    color: 'red'
                })
            }
        } catch (error) {
            notifications.show({
                title: 'Ошибка создания слоя',
                message: error instanceof Error ? error.message : 'Неизвестная ошибка',
                color: 'red'
            })
        }
    }

    /**
     * Обновить параметры выбранного слоя.
     * Передает новые значения в zustand‑хранилище, включая цвет поверхности.
     */
    const handleUpdateLayer = () => {
        if (!layerFormData.name.trim() || !layerFormData.id) return
        const updates: Partial<SceneLayer> = {
            name: layerFormData.name.trim(),
            width: (layerFormData.type === GfxLayerType.Landscape || layerFormData.type === GfxLayerType.Water) ? layerFormData.width : undefined,
            // Новое поле глубины слоя. Для совместимости поддерживаем чтение из legacy height в форме
            depth: (layerFormData.type === GfxLayerType.Landscape || layerFormData.type === GfxLayerType.Water)
              ? ((layerFormData as any).depth ?? (layerFormData as any).height)
              : undefined,
            shape: (layerFormData.type === GfxLayerType.Landscape || layerFormData.type === GfxLayerType.Water) ? layerFormData.shape : undefined,
            color: layerFormData.color,
            // Пробрасываем настройки воды, если тип слоя — Water
            ...(layerFormData.type === GfxLayerType.Water ? { water: (layerFormData as any).water } : {})
        }
        storeUpdateLayer(layerFormData.id, updates)
        setLayerFormData(createEmptySceneLayer())
        setLayerModalOpened(false)
    }

    /**
     * Открыть модальное окно редактирования слоя и заполнить поля текущими значениями.
     * Цвет слоя также подставляется в поле выбора цвета.
     */
    const openEditLayerModal = (layer: SceneLayer) => {
        setLayerFormData({
            id: layer.id,
            name: layer.name,
            type: layer.type || GfxLayerType.Object,
            width: layer.width || 10,
            // В форме используем поле depth, читаем legacy height при наличии
            depth: (layer as any).depth ?? (layer as any).height ?? 10,
            shape: layer.shape || GfxLayerShape.Plane,
            color: layer.color || DEFAULT_LANDSCAPE_COLOR,
            visible: layer.visible,
            position: layer.position,
            // Поддержка настроек воды при редактировании
            ...(layer.type === GfxLayerType.Water ? { water: { type: ((layer as any).water?.type || 'realistic'), brightness: ((layer as any).water?.brightness ?? 1.6) } } : {})
        })
        setLayerModalMode('edit')
        setLayerModalOpened(true)
    }

    // Handlers using Zustand store
    const handleToggleVisibility = (objectUuid: string) => {
        storeToggleObjectVisibility(objectUuid)
    }

    const handleRemoveObject = (objectUuid: string) => {
        removeObject(objectUuid)
        clearSelection()
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
    /**
     * Сохраняет выбранный объект сцены в библиотеку с полной структурой данных
     * и автогенерацией превью.
     *
     * Под «полной структурой» подразумевается не только список примитивов,
     * но и:
     * - materials: материалы объекта;
     * - boundingBox: ограничивающий бокс объекта;
     * - primitiveGroups: группы примитивов (иерархия/контейнеры);
     * - primitiveGroupAssignments: привязка примитивов к группам.
     * Это устраняет проблему потери материалов и связей групп при сохранении из SceneEditor.
     * Дополнительно генерируется миниатюра (thumbnail) для карточки в библиотеке.
     *
     * @param name Человекочитаемое имя объекта для записи в библиотеку
     * @param description Необязательное описание объекта
     * @returns UUID записи объекта в библиотеке или undefined при ошибке
     */
    const handleSaveObject = async (name: string, description?: string): Promise<string | undefined> => {
        if (!savingObjectUuid) return
        const object = useSceneStore.getState().objects.find(o => o.uuid === savingObjectUuid)
        if (!object) return

        // Формируем полные данные объекта для сохранения в библиотеку
        const { uuid, primitives, materials, boundingBox, primitiveGroups, primitiveGroupAssignments } = object
        const objectData = {
            uuid,
            name: object.name,
            primitives,
            materials,
            boundingBox,
            primitiveGroups,
            primitiveGroupAssignments,
        }

        try {
            // Пытаемся сгенерировать превью объекта (PNG data URL)
            // Примечание: используем оффскрин‑рендер из ObjectEditor, чтобы
            // получить единообразный вид превью с учётом материалов и групп.
            let thumbnail: string | undefined
            try {
                const previewDataUrl = await generateObjectPreview(objectData as any, false)
                thumbnail = previewDataUrl || undefined
            } catch (e) {
                // Генерация превью не критична — продолжаем без него
                console.warn('Не удалось сгенерировать превью для объекта при сохранении из SceneEditor:', e)
            }

            const libraryUuid = await db.saveObject(name, objectData as any, description, thumbnail)
            // обновить объект сцены, добавив UUID записи библиотеки
            useSceneStore.getState().updateObject(object.uuid, { libraryUuid })
            notifications.show({
                title: 'Успешно!',
                message: `Объект "${name}" сохранён в библиотеку`,
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
     * Выгружает выбранный объект в JSON файл, включая все материалы
     * и BoundingBox, чтобы сохранить полную структуру объекта.
     * @param objectUuid UUID объекта, который требуется выгрузить
     */
    const handleExportObject = (objectUuid: string) => {
        const object = useSceneStore.getState().objects.find(o => o.uuid === objectUuid)
        if (!object) return

        // Сериализуем полную структуру объекта с материалами и BoundingBox
        const data = JSON.parse(JSON.stringify(object))

        downloadJson(`${object.name}-${object.uuid}.json`, data)
    }

    /**
     * Копирует объект в буфер обмена в формате JSON,
     * добавляя все связанные материалы и BoundingBox.
     * @param objectUuid UUID объекта, который требуется скопировать
     */
    const handleCopyObject = async (objectUuid: string) => {
        const object = useSceneStore.getState().objects.find(o => o.uuid === objectUuid)
        if (!object) return

        // Копируем актуальную структуру объекта со всеми материалами
        const data = JSON.parse(JSON.stringify(object))

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
            layerModalOpened={layerModalOpened}
            setLayerModalOpened={setLayerModalOpened}
            layerModalMode={layerModalMode}
            setLayerModalMode={setLayerModalMode}
            layerFormData={layerFormData}
            setLayerFormData={setLayerFormData}
            handleCreateLayer={handleCreateLayer}
            handleUpdateLayer={handleUpdateLayer}
            contextMenuOpened={contextMenuOpened}
            setContextMenuOpened={setContextMenuOpened}
            contextMenuPosition={contextMenuPosition}
            layers={layers}
            handleMoveToLayer={handleMoveToLayer}
            toggleLayerExpanded={toggleLayerExpanded}
            toggleLayerVisibility={storeToggleLayerVisibility}
            openEditLayerModal={openEditLayerModal}
            deleteLayer={storeDeleteLayer}
            highlightObject={handleHighlightObject}
            clearHighlight={handleClearHighlight}
            selectObject={handleSelectObject}
            toggleObjectVisibility={handleToggleVisibility}
            removeObject={handleRemoveObject}
            saveObjectToLibrary={handleSaveObjectToLibrary}
            editObject={handleEditObject}
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
                                    onClick={() => {
                                        setLayerFormData(createEmptySceneLayer())
                                        setLayerModalMode('create')
                                        setLayerModalOpened(true)
                                    }}
                                >
                                    <IconPlus size={14} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </Group>

                    <ScrollArea
                        style={{ flex: 1 }}
                        onClick={() => setContextMenuOpened(false)}
                    >
                        <Stack gap={0}>
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
                                            selectedObject={selectedObject}
                                            dragOverLayerId={dragOverLayerId}
                                        />
                                    )
                                })
                            ) : (
                                // Fallback для случая без слоев
                                objects.map((obj) => {
                                    const isSelected = selectedObject?.objectUuid === obj.objectUuid
                                    return (
                                        <SceneObjectItem
                                            key={`${obj.name}-${obj.objectUuid}`}
                                            obj={obj}
                                            isSelected={isSelected}
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
                                        Esc отмена выбора
                                    </Text>
                                </>
                            )}
                        </>
                    )}
                </Stack>
            </Paper>

            <SceneLayerModals />

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
