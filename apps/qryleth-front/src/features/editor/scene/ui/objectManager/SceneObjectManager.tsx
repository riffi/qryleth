import React, { useCallback, useMemo, useState } from 'react'
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
    Divider,
    Box,
    Menu,
    Collapse
} from '@mantine/core'
import { IconPlus, IconCheck, IconEye, IconEyeOff, IconTrash, IconChevronRight, IconChevronDown } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { db } from '@/shared/lib/database.ts'
// Заголовок сцены с мета-информацией переносится в хедер страницы.
// Ранее использовался компонент SceneHeader внутри правой панели.
// По новым правилам архитектуры мета-управление должно быть вверху,
// поэтому SceneHeader здесь более не используется.
import { LightingControls } from './LightingControls.tsx'
import { SceneLayerItem } from './SceneLayerItem.tsx'
// Legacy модалки слоёв удалены; используем новые окна для тонких слоёв и содержимого
import { LayerBasicModal } from './LayerBasicModal'
import { LandscapeItemModal } from './LandscapeItemModal'
import { WaterBodyModal } from './WaterBodyModal'
import { SceneObjectItem } from './SceneObjectItem.tsx'
import type { ObjectInfo } from './SceneObjectItem.tsx'
import { SaveObjectDialog } from '@/shared/ui'
import { AddObjectFromLibraryModal } from './AddObjectFromLibraryModal.tsx'
import { useErrorHandler } from '@/shared/hooks'
import type { LightingSettings } from '@/entities/lighting'
import type {ObjectRecord} from "@/shared/api";
import { downloadJson } from '@/shared/lib/downloadJson.ts'
import { copyJsonToClipboard } from '@/shared/lib/copyJsonToClipboard.ts'
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
import { GfxLayerType } from '@/entities/layer'
import { TreeRow } from '@/shared/ui/tree/TreeRow.tsx'
import { TreeList } from '@/shared/ui/tree/TreeList'
import { useObjectLayerNodes } from './sections/ObjectLayersSection'
import { useLandscapeNodes } from './sections/LandscapeSection'
import { useWaterNodes } from './sections/WaterSection'
import { useBiomeNodes } from './sections/BiomesSection'
import {SectionHeader} from "@/shared/ui/section/SectionHeader.tsx";

export const SceneObjectManager: React.FC<ObjectManagerProps> = ({
    onSaveSceneToLibrary,
    onEditObject
}) => {
    const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['objects']))
    const [layerModalOpened, setLayerModalOpened] = useState(false)
    const [layerModalMode, setLayerModalMode] = useState<SceneLayerModalMode>('create')
    const [layerFormData, setLayerFormData] = useState<SceneLayerFormData>(createEmptySceneLayer() as any)
    // Новые модалки содержимого
    const [landscapeModalOpened, setLandscapeModalOpened] = useState(false)
    const [landscapeModalMode, setLandscapeModalMode] = useState<'create' | 'edit'>('create')
    const [editingLandscapeId, setEditingLandscapeId] = useState<string | null>(null)
    const [waterModalOpened, setWaterModalOpened] = useState(false)
    const [waterModalMode, setWaterModalMode] = useState<'create' | 'edit'>('create')
    const [waterModalTargetLayerId, setWaterModalTargetLayerId] = useState<string | null>(null)
    const [editingWater, setEditingWater] = useState<{ layerId: string; bodyId: string } | null>(null)
    const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null)
    const [contextMenuOpened, setContextMenuOpened] = useState(false)
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
    const [contextMenuObjectUuid, setContextMenuObjectUuid] = useState<string | null>(null)
    const [saveObjectModalOpened, setSaveObjectModalOpened] = useState(false)
    const [savingObjectUuid, setSavingObjectUuid] = useState<string | null>(null)
    const [addObjectModalOpened, setAddObjectModalOpened] = useState(false)
    const [targetLayerId, setTargetLayerId] = useState<string | null>(null)
    // Видимость элементов теперь хранится в zustand-сторе; локальные флаги удалены
    const handleError = useErrorHandler()

    // R3F Zustand store data
    const sceneObjects = useSceneObjectsOptimized()
    const objectInstances = useSceneStore(state => state.objectInstances)
    const biomes = useSceneStore(state => state.biomes)
    const updateBiome = useSceneStore(state => state.updateBiome)
    const storeLayers = useSceneLayersOptimized()
    const landscapeContent = useSceneStore(state => state.landscapeContent)
    const waterContent = useSceneStore(state => state.waterContent)
    const removeLandscapeItem = useSceneStore(state => state.removeLandscapeItem)
    const updateLandscapeItem = useSceneStore(state => state.updateLandscapeItem)
    const removeWaterBody = useSceneStore(state => state.removeWaterBody)
    const updateWaterBody = useSceneStore(state => state.updateWaterBody)
    const { lighting: storeLighting } = useSceneMetadata()
    const setLandscapeLayer = useSceneStore(state => state.setLandscapeLayer)
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
        setObjectInstances,
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

    // Узлы ландшафта формируем неизменно на каждом рендере,
    // чтобы не нарушать порядок вызова хуков (React rule of hooks)
    const landscapeNodes = useLandscapeNodes({
      onEdit: (id: string) => {
        setLandscapeModalMode('edit')
        setEditingLandscapeId(id)
        setLandscapeModalOpened(true)
      }
    })

    /**
     * Возвращает количество инстансов, принадлежащих каждому биому.
     * Ключ словаря — uuid биома, значение — число инстансов.
     * Используем мемоизацию по списку инстансов.
     */
    const biomeInstanceCounts = React.useMemo<Record<string, number>>(() => {
        const counts: Record<string, number> = {}
        for (const inst of objectInstances) {
            if (inst.biomeUuid) {
                counts[inst.biomeUuid] = (counts[inst.biomeUuid] || 0) + 1
            }
        }
        return counts
    }, [objectInstances])

    /**
     * Переключает состояние «развернуто/свернуто» для заданного слоя.
     * Мемоизировано, чтобы ссылка на обработчик была стабильной между рендерами.
     */
    const toggleLayerExpanded = useCallback((layerId: string) => {
        setExpandedLayers(prev => {
            const newSet = new Set(prev)
            if (newSet.has(layerId)) newSet.delete(layerId)
            else newSet.add(layerId)
            return newSet
        })
    }, [])


    // handleCreateLayer / handleUpdateLayer удалены — создание/редактирование выполняет LayerBasicModal

    /**
     * Открыть модальное окно редактирования слоя и заполнить поля текущими значениями.
     * Цвет слоя также подставляется в поле выбора цвета.
     */
    /**
     * Открывает модалку редактирования слоя и подставляет его значения в форму.
     */
    const openEditLayerModal = useCallback((layer: SceneLayer) => {
      setLayerFormData({
        id: layer.id,
        name: layer.name,
        type: layer.type || GfxLayerType.Object,
        visible: layer.visible,
        position: layer.position,
      } as any)
      setLayerModalMode('edit')
      setLayerModalOpened(true)
    }, [])

    // Handlers using Zustand store
    /**
     * Удаляет объект и очищает выделение. Мемоизирован для стабильной ссылки.
     */
    const handleRemoveObject = useCallback((objectUuid: string) => {
        removeObject(objectUuid)
        clearSelection()
    }, [removeObject, clearSelection])

    /**
     * Открывает модалку сохранения объекта в библиотеку.
     */
    const handleSaveObjectToLibrary = useCallback((objectUuid: string) => {
        setSavingObjectUuid(objectUuid)
        setSaveObjectModalOpened(true)
    }, [])

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
    /**
     * Экспортирует объект в JSON.
     */
    const handleExportObject = useCallback((objectUuid: string) => {
        const object = useSceneStore.getState().objects.find(o => o.uuid === objectUuid)
        if (!object) return

        // Сериализуем полную структуру объекта с материалами и BoundingBox
        const data = JSON.parse(JSON.stringify(object))

        downloadJson(`${object.name}-${object.uuid}.json`, data)
    }, [])

    /**
     * Копирует объект в буфер обмена в формате JSON,
     * добавляя все связанные материалы и BoundingBox.
     * @param objectUuid UUID объекта, который требуется скопировать
     */
    /**
     * Копирует JSON объекта в буфер обмена.
     */
    const handleCopyObject = useCallback(async (objectUuid: string) => {
        const object = useSceneStore.getState().objects.find(o => o.uuid === objectUuid)
        if (!object) return

        // Копируем актуальную структуру объекта со всеми материалами
        const data = JSON.parse(JSON.stringify(object))

        await copyJsonToClipboard(data)
    }, [])

    /**
     * Переход к редактированию объекта (делегируется наружу при наличии коллбэка).
     */
    const handleEditObject = useCallback((objectUuid: string, instanceId?: string) => {
        if (onEditObject) return onEditObject(objectUuid, instanceId)
        storeSelectObject(objectUuid, instanceId)
        console.log('Object edit not implemented', { objectUuid, instanceId })
    }, [onEditObject, storeSelectObject])

    /**
     * Открывает модалку выбора объекта из библиотеки для указанного слоя.
     */
    const handleAddObjectFromLibrary = useCallback((layerId: string) => {
        setTargetLayerId(layerId)
        setAddObjectModalOpened(true)
    }, [])

    /**
     * Добавить выбранный объект библиотеки в сцену и сохранить его UUID
     * в поле libraryUuid для последующей идентификации
     */
    /**
     * Добавляет выбранный объект библиотеки в сцену в целевой слой.
     */
    const handleAddObjectToScene = useCallback(async (object: ObjectRecord) => {
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
    }, [targetLayerId])

    /**
     * Обновляет настройки освещения сцены.
     */
    const handleLightingChange = useCallback((newLighting: LightingSettings) => {
        updateLighting(newLighting)
    }, [updateLighting])

    /**
     * Переключает видимость указанного биома по его UUID.
     * Обновляет поле visible у биома через Zustand store.
     * Если биом не найден — ничего не делает.
     */
    const handleToggleBiomeVisibility = useCallback((biomeUuid: string) => {
        const biome = biomes.find(b => b.uuid === biomeUuid)
        if (!biome) return
        updateBiome(biomeUuid, { visible: biome.visible === false ? true : !biome.visible })
    }, [biomes, updateBiome])

    const handleSaveSceneToLibraryInternal = useCallback(() => {
        if (onSaveSceneToLibrary) return onSaveSceneToLibrary()
        exportScene(`scene-${Date.now()}.json`)
    }, [onSaveSceneToLibrary])

    /**
     * Удаляет биом и все инстансы, привязанные к нему.
     *
     * 1) Фильтрует из хранилища все инстансы с данным `biomeUuid`
     * 2) Удаляет сам биом через SceneAPI (обновляет Zustand)
     * 3) Показывает уведомление об успехе либо ошибке
     */
    const handleDeleteBiome = useCallback((biomeUuid: string) => {
        try {
            const remaining = useSceneStore.getState().objectInstances.filter(i => i.biomeUuid !== biomeUuid)
            setObjectInstances(remaining)
            const res = SceneAPI.removeBiome(biomeUuid)
            if (!res.success) {
                notifications.show({ title: 'Ошибка', message: 'Не удалось удалить биом', color: 'red' })
                return
            }
            notifications.show({ title: 'Готово', message: 'Биом и его инстансы удалены', color: 'green', icon: <IconCheck size="1rem" /> })
        } catch (e) {
            notifications.show({ title: 'Ошибка', message: 'Не удалось удалить биом', color: 'red' })
        }
    }, [setObjectInstances])

    // Drag & Drop handlers
    const handleDragStart = useCallback((e: React.DragEvent, objectUuid: string) => {
        e.dataTransfer.setData('text/plain', objectUuid)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent, layerId: string) => {
        e.preventDefault()
        setDragOverLayerId(layerId)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOverLayerId(null)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent, layerId: string) => {
        e.preventDefault()
        const objectUuid = e.dataTransfer.getData('text/plain')

        if (objectUuid) {
            storeMoveObjectToLayer(objectUuid, layerId)
        }

        setDragOverLayerId(null)
    }, [storeMoveObjectToLayer])

    // Context Menu handlers
    const handleContextMenu = useCallback((e: React.MouseEvent, objectUuid: string) => {
        e.preventDefault()
        setContextMenuPosition({ x: e.clientX, y: e.clientY })
        setContextMenuObjectUuid(objectUuid)
        setContextMenuOpened(true)
    }, [])

    const handleMoveToLayer = useCallback((layerId: string) => {
        if (contextMenuObjectUuid !== null) {
            storeMoveObjectToLayer(contextMenuObjectUuid, layerId)
        }
        setContextMenuOpened(false)
        setContextMenuObjectUuid(null)
    }, [contextMenuObjectUuid, storeMoveObjectToLayer])

    /**
     * Предрасчёт и группировка объектов по слоям.
     * Возвращает стабильные по ссылке массивы для каждого layerId,
     * что уменьшает перерендеры мемоизированных дочерних компонентов.
     */
    const objectsByLayer = useMemo(() => {
        const map = new Map<string, ObjectInfo[]>()
        for (const obj of objects) {
            const lid = obj.layerId || 'objects'
            if (!map.has(lid)) map.set(lid, [])
            map.get(lid)!.push(obj)
        }
        return map
    }, [objects])

    return (
        <SceneObjectManagerProvider
            value={useMemo(() => ({
                layerModalOpened,
                setLayerModalOpened,
                layerModalMode,
                setLayerModalMode,
                layerFormData,
                setLayerFormData,
                contextMenuOpened,
                setContextMenuOpened,
                contextMenuPosition,
                layers,
                handleMoveToLayer,
                toggleLayerExpanded,
                toggleLayerVisibility: storeToggleLayerVisibility,
                openEditLayerModal,
                deleteLayer: storeDeleteLayer,
                // Передаём стабильные экшены прямо из стора
                highlightObject: setHoveredObject,
                clearHighlight: clearHover,
                selectObject: storeSelectObject,
                toggleObjectVisibility: storeToggleObjectVisibility,
                removeObject: handleRemoveObject,
                saveObjectToLibrary: handleSaveObjectToLibrary,
                editObject: onEditObject,
                dragStart: handleDragStart,
                contextMenu: handleContextMenu,
                dragOver: handleDragOver,
                dragLeave: handleDragLeave,
                drop: handleDrop,
                addObjectFromLibrary: handleAddObjectFromLibrary,
                exportObject: handleExportObject,
                copyObject: handleCopyObject,
            }), [
                layerModalOpened,
                setLayerModalOpened,
                layerModalMode,
                setLayerModalMode,
                layerFormData,
                setLayerFormData,
                contextMenuOpened,
                setContextMenuOpened,
                contextMenuPosition,
                layers,
                handleMoveToLayer,
                toggleLayerExpanded,
                storeToggleLayerVisibility,
                openEditLayerModal,
                storeDeleteLayer,
                setHoveredObject,
                clearHover,
                storeSelectObject,
                storeToggleObjectVisibility,
                handleRemoveObject,
                handleSaveObjectToLibrary,
                onEditObject,
                handleDragStart,
                handleContextMenu,
                handleDragOver,
                handleDragLeave,
                handleDrop,
                handleAddObjectFromLibrary,
                handleExportObject,
                handleCopyObject,
            ])}
        >
        <>
            <Paper shadow="sm" radius="md" p="sm" style={{ height: '100%' }}>
                <Stack gap="sm" style={{ height: '100%' }}>
                    <LightingControls
                        lighting={lighting}
                        onLightingChange={handleLightingChange}
                    />


                    <SectionHeader
                      title="Слои объектов"
                      addTooltip="Создать новый слой"
                      onAdd={() => {
                        setLayerFormData(createEmptySceneLayer())
                        setLayerModalMode('create')
                        setLayerModalOpened(true)
                      }}
                    />

                    <ScrollArea style={{ maxHeight: 260 }} onClick={() => setContextMenuOpened(false)}>
                      <Stack gap={0}>
                        <TreeList
                          nodes={useObjectLayerNodes({
                            selectedObject,
                            highlightObject: setHoveredObject,
                            clearHighlight: clearHover,
                            selectObject: storeSelectObject,
                            toggleObjectVisibility: storeToggleObjectVisibility,
                            removeObject: handleRemoveObject,
                            saveObjectToLibrary: handleSaveObjectToLibrary,
                            editObject: onEditObject || storeSelectObject,
                            exportObject: handleExportObject,
                            copyObject: handleCopyObject,
                            dragStart: handleDragStart,
                            contextMenu: handleContextMenu,
                            addObjectFromLibrary: handleAddObjectFromLibrary,
                            toggleLayerVisibility: storeToggleLayerVisibility,
                            openEditLayerModal,
                            deleteLayer: storeDeleteLayer,
                            dragOver: handleDragOver,
                            dragLeave: handleDragLeave as any,
                            drop: handleDrop,
                          })}
                          expandedIds={expandedLayers}
                          onToggleExpand={toggleLayerExpanded}
                        />
                      </Stack>
                    </ScrollArea>

                    {/* Ландшафт */}
                    <Divider my="xs" />
                    <SectionHeader
                      title="Ландшафт"
                      addTooltip="Добавить площадку"
                      onAdd={() => { setLandscapeModalMode('create'); setLandscapeModalOpened(true) }}
                    />
                    <Stack gap="0px">
                      {landscapeNodes.length > 0 ? (
                        <TreeList
                          nodes={landscapeNodes}
                          expandedIds={expandedLayers}
                          onToggleExpand={toggleLayerExpanded}
                        />
                      ) : (
                        <Text size="xs" c="dimmed" ta="center">Нет площадок ландшафта</Text>
                      )}
                    </Stack>

                    <Divider my="xs" />
                    <SectionHeader
                      title="Водные слои"
                      addTooltip="Создать водный слой"
                      onAdd={() => { setLayerFormData({ ...createEmptySceneLayer(), type: GfxLayerType.Water, name: 'вода' }); setLayerModalMode('create'); setLayerModalOpened(true) }}
                    />
                    <Stack gap="0px" style={{width: '100%'}}>
                      <TreeList
                        nodes={useWaterNodes({
                          onAddBody: (layerId: string) => { setWaterModalMode('create'); setWaterModalTargetLayerId(layerId); setWaterModalOpened(true) },
                          onEditBody: (layerId: string, bodyId: string) => { setWaterModalMode('edit'); setEditingWater({ layerId, bodyId }); setWaterModalOpened(true) },
                          toggleLayerVisibility: storeToggleLayerVisibility,
                          openEditLayerModal,
                          deleteLayer: storeDeleteLayer,
                        })}
                        expandedIds={expandedLayers}
                        onToggleExpand={toggleLayerExpanded}
                      />
                    </Stack>


                    <Divider />

                    <Group justify="space-between" align="center">
                        <Text size="xs" fw={500} c="dimmed">
                            Биомы
                        </Text>
                        <Group gap="xs">
                            <Tooltip label="Создать новый биом">
                                <ActionIcon size="sm" variant="light" color="blue" disabled>
                                    <IconPlus size={14} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </Group>

                    <ScrollArea style={{ maxHeight: 200 }}>
                      <Stack gap={0}>
                        <TreeList nodes={useBiomeNodes({ onDelete: handleDeleteBiome })} expandedIds={expandedLayers} onToggleExpand={toggleLayerExpanded} />
                      </Stack>
                    </ScrollArea>
                </Stack>
            </Paper>

            {/* Новые модалки */}
            <LayerBasicModal
              opened={layerModalOpened}
              mode={layerModalMode}
              initial={{ id: layerFormData.id, name: layerFormData.name, type: layerFormData.type as any }}
              fixedType={layerModalMode === 'create' ? (layerFormData.type as any) : undefined}
              onClose={() => setLayerModalOpened(false)}
            />

            <LandscapeItemModal
              opened={landscapeModalOpened}
              mode={landscapeModalMode}
              initial={landscapeModalMode === 'edit' ? (landscapeContent?.items.find(i => i.id === editingLandscapeId) as any) : undefined}
              onClose={() => { setLandscapeModalOpened(false); setEditingLandscapeId(null) }}
            />

            <WaterBodyModal
              opened={waterModalOpened}
              mode={waterModalMode}
              targetLayerId={waterModalMode === 'create' ? waterModalTargetLayerId : (editingWater?.layerId ?? null)}
              initial={waterModalMode === 'edit' && editingWater ? {
                layerId: editingWater.layerId,
                body: (waterContent?.find(c => c.layerId === editingWater.layerId)?.items.find(b => b.id === editingWater.bodyId) as any)
              } : null}
              onClose={() => { setWaterModalOpened(false); setWaterModalTargetLayerId(null); setEditingWater(null) }}
            />

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
