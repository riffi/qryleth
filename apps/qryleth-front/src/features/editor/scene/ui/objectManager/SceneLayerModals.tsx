import React, { useCallback, useEffect, useState } from 'react'
import {
    Modal,
    Stack,
    TextInput,
    Button,
    Group,
    Menu,
    Select,
    NumberInput,
    ColorInput,
    ActionIcon,
    FileInput,
    Image,
    Text,
    Slider,
    Alert
} from '@mantine/core'
import { IconLayersLinked, IconSettings, IconUpload, IconPhoto, IconX } from '@tabler/icons-react'
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/editor/scene/constants.ts'
import { useSceneObjectManager } from './SceneObjectManagerContext.tsx'
import { createEmptySceneLayer } from './layerFormUtils.ts'
import { useSceneActions } from '../../model/optimizedSelectors.ts'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import {
    uploadTerrainAsset,
    validatePngFile,
    createTerrainAssetPreviewUrl,
    revokeTerrainAssetPreviewUrl,
    getAllTerrainAssetsSummary,
    getTerrainAssetInfo
} from '@/features/editor/scene/lib/terrain/HeightmapUtils'
import { SceneAPI } from '@/features/editor/scene/lib/sceneAPI'
import type { GfxTerrainConfig, GfxHeightmapParams } from '@/entities/terrain'
import { TerrainAssetPickerModal } from './TerrainAssetPickerModal'

/**
 * Модальные окна для создания и редактирования слоёв сцены.
 * Позволяют выбрать тип слоя, его размеры и цвет поверхности.
 */


// Пресеты размеров слоя: ширина (X) и глубина (Z). Ранее второй параметр назывался height.
const presets = [
  {id: 1, title: 'Маленький', width: 10, depth: 10 },
  {id: 2, title: 'Средний', width: 100, depth: 100 },
  {id: 3, title: 'Большой', width: 1000, depth: 1000 },
]

export const SceneLayerModals: React.FC = () => {
    const {
        layerModalOpened,
        setLayerModalOpened,
        layerModalMode,
        layerFormData,
        setLayerFormData,
        handleCreateLayer,
        handleUpdateLayer,
        contextMenuOpened,
        setContextMenuOpened,
        contextMenuPosition,
        layers,
        handleMoveToLayer
    } = useSceneObjectManager()

    const { createLayer: storeCreateLayer, updateLayer: storeUpdateLayer } = useSceneActions()
    /**
     * Флаг отображения ручных настроек размера ландшафта.
     * При false показываются только пресеты размеров.
     */
    const [showSizeConfig, setShowSizeConfig] = useState(false)

    // Состояние для heightmap
    const [terrainSource, setTerrainSource] = useState<'perlin' | 'heightmap'>('perlin')
    const [heightmapFile, setHeightmapFile] = useState<File | null>(null)
    const [heightmapPreviewUrl, setHeightmapPreviewUrl] = useState<string | null>(null)
    // Выбранный ассет из коллекции (альтернатива загрузке файла)
    const [selectedAsset, setSelectedAsset] = useState<{ assetId: string; width: number; height: number; fileName: string } | null>(null)
    const [selectedAssetPreviewUrl, setSelectedAssetPreviewUrl] = useState<string | null>(null)
    const [assetPickerOpened, setAssetPickerOpened] = useState(false)
    const [heightmapParams, setHeightmapParams] = useState<Partial<GfxHeightmapParams>>({
        min: 0,
        max: 10,
        wrap: 'clamp'
    })
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    const [currentPreset, setCurrentPreset] = useState<number>(0)

    // Координаты центра ландшафтного слоя (мировые X/Z)
    // По умолчанию [0, 0]; позволяют создавать несколько террейнов, разнесённых по сцене.
    const [centerX, setCenterX] = useState<number>(0)
    const [centerZ, setCenterZ] = useState<number>(0)

    /**
     * Применить выбранный пресет размера к форме слоя.
     * Функция обновляет только размеры, сохраняя остальные поля без изменений.
     * Используется для быстрой установки типовых значений.
     */
    const applyPreset = useCallback((presetId: number) => {
        const preset = presets.find(p => p.id === presetId)
        if (!preset) return
        setCurrentPreset(presetId)
        setLayerFormData(prev => ({
            ...prev,
            width: preset.width,
            // Используем новое поле глубины. Для совместимости в форме допускаем оба.
            depth: (preset as any).depth ?? (preset as any).height
        }))
    }, [setLayerFormData])

    /**
     * Обработчик загрузки PNG файла для heightmap.
     * Валидирует файл, создаёт локальное превью и сохраняет размеры изображения в параметры.
     * При сбросе файла очищает связанное состояние и превью.
     */
    const handleHeightmapUpload = useCallback(async (file: File | null) => {
        if (!file) {
            setHeightmapFile(null)
            if (heightmapPreviewUrl) {
                revokeTerrainAssetPreviewUrl(heightmapPreviewUrl)
                setHeightmapPreviewUrl(null)
            }
            // Если файл снят — также сбрасываем выбранный ассет
            setSelectedAsset(null)
            if (selectedAssetPreviewUrl) {
                revokeTerrainAssetPreviewUrl(selectedAssetPreviewUrl)
                setSelectedAssetPreviewUrl(null)
            }
            setUploadError(null)
            return
        }

        setUploadError(null)
        setIsUploading(true)

        try {
            // Валидация файла
            const validation = await validatePngFile(file)
            if (!validation.isValid) {
                setUploadError(validation.error || 'Ошибка валидации')
                return
            }

            setHeightmapFile(file)

            // Создаем превью
            const previewUrl = URL.createObjectURL(file)
            setHeightmapPreviewUrl(previewUrl)

            // При выборе файла сбрасываем ранее выбранный ассет
            if (selectedAssetPreviewUrl) {
                revokeTerrainAssetPreviewUrl(selectedAssetPreviewUrl)
                setSelectedAssetPreviewUrl(null)
            }
            setSelectedAsset(null)

            // Обновляем параметры heightmap
            if (validation.dimensions) {
                setHeightmapParams(prev => ({
                    ...prev,
                    imgWidth: validation.dimensions!.width,
                    imgHeight: validation.dimensions!.height
                }))
            }

        } catch (error) {
            console.error('Error processing heightmap file:', error)
            setUploadError('Ошибка обработки файла')
        } finally {
            setIsUploading(false)
        }
    }, [heightmapPreviewUrl])

    /**
     * Очистка состояния при закрытии модального окна.
     * Сбрасывает форму слоя, локальные состояния heightmap и превью.
     */
    const resetModalState = useCallback(() => {
        setLayerModalOpened(false)
        setLayerFormData(createEmptySceneLayer())
        setShowSizeConfig(false)
        setCurrentPreset(0)
        setTerrainSource('perlin')
        setHeightmapFile(null)
        if (heightmapPreviewUrl) {
            revokeTerrainAssetPreviewUrl(heightmapPreviewUrl)
            setHeightmapPreviewUrl(null)
        }
        if (selectedAssetPreviewUrl) {
            revokeTerrainAssetPreviewUrl(selectedAssetPreviewUrl)
            setSelectedAssetPreviewUrl(null)
        }
        setSelectedAsset(null)
        setHeightmapParams({
            min: 0,
            max: 10,
            wrap: 'clamp'
        })
        setUploadError(null)
        setIsUploading(false)
        setAssetPickerOpened(false)
    }, [heightmapPreviewUrl, selectedAssetPreviewUrl, setLayerModalOpened, setLayerFormData])

    useEffect(() => {
        if (layerModalOpened && layerModalMode === 'create') {
            applyPreset(2)
        }
    }, [layerModalOpened, layerModalMode, applyPreset])

    /**
     * Инициализация формы при редактировании существующего слоя.
     * Если слой — рельеф с источником heightmap, подставляем источник,
     * параметры нормализации и формируем превью по текущему assetId.
     */
    useEffect(() => {
        const initForEdit = async () => {
            if (!layerModalOpened || layerModalMode !== 'edit') return
            const currentId = (layerFormData as any).id as string | undefined
            if (!currentId) return
            const layer = layers?.find(l => l.id === currentId)
            if (!layer) return
            if (layer.type !== GfxLayerType.Landscape || layer.shape !== GfxLayerShape.Terrain) return
            const terrain = layer.terrain
            if (!terrain) return
            // Поднимем центр существующего террейна в форму
            setCenterX(terrain.center?.[0] ?? 0)
            setCenterZ(terrain.center?.[1] ?? 0)
            if (terrain.source.kind === 'heightmap') {
                setTerrainSource('heightmap')
                const params = terrain.source.params
                // Параметры нормализации и wrap
                setHeightmapParams({
                    min: params.min,
                    max: params.max,
                    wrap: params.wrap ?? 'clamp',
                    imgWidth: params.imgWidth,
                    imgHeight: params.imgHeight,
                })
                // Превью/инфо из Dexie по assetId
                try {
                    const info = await getTerrainAssetInfo(params.assetId)
                    const previewUrl = await createTerrainAssetPreviewUrl(params.assetId)
                    setSelectedAsset(info ? {
                        assetId: params.assetId,
                        fileName: info.fileName,
                        width: info.width,
                        height: info.height
                    } : {
                        assetId: params.assetId,
                        fileName: 'heightmap.png',
                        width: params.imgWidth,
                        height: params.imgHeight
                    })
                    setSelectedAssetPreviewUrl(previewUrl)
                } catch (e) {
                    console.warn('Не удалось создать превью текущего heightmap ассета:', e)
                    setSelectedAsset({
                        assetId: params.assetId,
                        fileName: 'heightmap.png',
                        width: params.imgWidth,
                        height: params.imgHeight
                    })
                }
            } else {
                setTerrainSource('perlin')
            }
        }
        void initForEdit()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layerModalOpened, layerModalMode, (layerFormData as any).id, layers])

    /**
     * Обработчик создания слоя с поддержкой heightmap
     */
    /**
     * Создание слоя с учётом источника террейна.
     * Если выбран heightmap, поддерживаются два варианта: новый файл (загрузка и создание ассета)
     * или уже существующий ассет из коллекции (без повторной загрузки).
     */
    /**
     * Создание ландшафтного слоя с учётом источника террейна и центра.
     *
     * ВАЖНО: добавлены зависимости centerX/centerZ, чтобы при изменении центра в UI
     * колбэк не использовал устаревшие значения из замыкания и корректно создавал слой
     * вокруг новой точки центра.
     */
    const handleCreateLayerWithTerrain = useCallback(async () => {
        if (layerModalMode !== 'create') {
            handleCreateLayer()
            return
        }

        // Если это не ландшафтный слой или не террейн — оставляем стандартную логику создания
        if (layerFormData.type !== GfxLayerType.Landscape || layerFormData.shape !== GfxLayerShape.Terrain) {
            handleCreateLayer()
            return
        }

        // Логика для landscape-террейна
        if (terrainSource === 'heightmap' && (heightmapFile || selectedAsset)) {
            try {
                setIsUploading(true)
                setUploadError(null)

                let assetId: string
                let imgWidth: number
                let imgHeight: number

                if (heightmapFile) {
                    // Загружаем файл в Dexie
                    const uploadResult = await uploadTerrainAsset(heightmapFile)
                    assetId = uploadResult.assetId
                    imgWidth = uploadResult.width
                    imgHeight = uploadResult.height
                } else if (selectedAsset) {
                    assetId = selectedAsset.assetId
                    imgWidth = selectedAsset.width
                    imgHeight = selectedAsset.height
                } else {
                    throw new Error('Не выбран файл или ассет карты высот')
                }

                // Создаем GfxTerrainConfig для heightmap
                const terrainConfig: GfxTerrainConfig = {
                    worldWidth: layerFormData.width || 100,
                    // Глубина слоя (ось Z)
                    worldDepth: ((layerFormData as any).depth ?? (layerFormData as any).height) || 100,
                    // Центр террейна — строим вокруг указанной точки
                    center: [centerX || 0, centerZ || 0],
                    edgeFade: 0,
                    source: {
                        kind: 'heightmap',
                        params: {
                            assetId,
                            imgWidth,
                            imgHeight,
                            min: heightmapParams.min || 0,
                            max: heightmapParams.max || 10,
                            wrap: heightmapParams.wrap || 'clamp'
                        }
                    }
                }

                const DEBUG = (import.meta as any)?.env?.MODE !== 'production'
                if (DEBUG) console.log('🗻 Creating heightmap layer with terrain config:', terrainConfig)

                // Создаем слой с terrain конфигурацией
                const layerData = {
                    name: 'landscape',
                    type: GfxLayerType.Landscape,
                    visible: true,
                    position: layers?.length || 0,
                    color: layerFormData.color,
                    width: layerFormData.width,
                    // Новое поле глубины слоя
                    depth: (layerFormData as any).depth ?? (layerFormData as any).height,
                    shape: GfxLayerShape.Terrain,
                    terrain: terrainConfig
                }

                if (DEBUG) console.log('🗻 Layer data being created:', layerData)

                // Используем централизованный API для создания слоя с выравниванием
                const result = await SceneAPI.createLayerWithAdjustment(layerData, terrainConfig, {
                    maxAttempts: 15,
                    showNotifications: true
                })

                if (result.success) {
                    if (DEBUG) console.log('🗻 Successfully created heightmap layer with adjustment:', result)
                    // Закрываем модальное окно
                    resetModalState()
                } else {
                    throw new Error(result.error || 'Failed to create layer')
                }

            } catch (error) {
                console.error('Error creating heightmap layer:', error)
                setUploadError('Ошибка создания слоя')
            } finally {
                setIsUploading(false)
            }
        } else {
            // Вариант Perlin: создаём конфигурацию террейна сами, чтобы учесть центр
            const w = layerFormData.width || 1
            const d = ((layerFormData as any).depth ?? (layerFormData as any).height) || 1
            const gridW = w > 200 ? 200 : w
            const gridH = d > 200 ? 200 : d

            const terrainConfig: import('@/entities/terrain').GfxTerrainConfig = {
                worldWidth: w,
                worldDepth: d,
                center: [centerX || 0, centerZ || 0],
                edgeFade: 0.15,
                source: {
                    kind: 'perlin',
                    params: {
                        seed: 1234,
                        octaveCount: 4,
                        amplitude: 0.1,
                        persistence: 0.5,
                        width: gridW,
                        height: gridH,
                    }
                }
            }

            const layerData = {
                name: layerFormData.name?.trim() || 'landscape',
                type: GfxLayerType.Landscape,
                visible: true,
                position: layers?.length || 0,
                color: layerFormData.color,
                width: w,
                depth: d,
                shape: GfxLayerShape.Terrain,
                terrain: terrainConfig
            }

            const result = await SceneAPI.createLayerWithAdjustment(layerData as any, terrainConfig, {
                maxAttempts: 15,
                showNotifications: true
            })

            if (result.success) {
                resetModalState()
            } else {
                setUploadError(result.error || 'Ошибка создания слоя')
            }
        }
    }, [layerModalMode, layerFormData, terrainSource, heightmapFile, selectedAsset, heightmapParams, layers, handleCreateLayer, resetModalState, storeCreateLayer, centerX, centerZ])

    /**
     * Обновление существующего слоя с учётом настроек heightmap.
     * Если выбран источник heightmap, обновляет параметры min/max/wrap и при необходимости
     * заменяет ассет (assetId) на загруженный/выбранный из коллекции.
     */
    /**
     * Обновление существующего ландшафтного слоя (terrain), включая центр.
     *
     * ВАЖНО: добавлены зависимости centerX/centerZ, чтобы не брать старые значения
     * из замыкания и корректно применять новые координаты центра при сохранении.
     */
    const handleUpdateLayerWithTerrain = useCallback(async () => {
        if (layerModalMode !== 'edit') {
            handleUpdateLayer()
            return
        }

        if (layerFormData.type !== GfxLayerType.Landscape || layerFormData.shape !== GfxLayerShape.Terrain) {
            handleUpdateLayer()
            return
        }

        // Текущий ID редактируемого слоя нужен во всех ветках
        const currentId = (layerFormData as any).id as string | undefined
        if (!currentId) {
            handleUpdateLayer()
            return
        }

        // Если источник не heightmap (Perlin) — обновляем центр и размеры террейна вручную
        if (terrainSource !== 'heightmap') {
            const currentLayer = layers?.find(l => l.id === currentId)
            const currentTerrain = currentLayer?.terrain

            const newTerrain: GfxTerrainConfig = {
                worldWidth: layerFormData.width || currentTerrain?.worldWidth || 100,
                worldDepth: ((layerFormData as any).depth ?? (layerFormData as any).height) || (currentTerrain as any)?.worldDepth || 100,
                center: [centerX ?? (currentTerrain?.center?.[0] ?? 0), centerZ ?? (currentTerrain?.center?.[1] ?? 0)],
                edgeFade: currentTerrain?.edgeFade ?? 0.15,
                seaLevel: currentTerrain?.seaLevel,
                source: currentTerrain?.source && currentTerrain.source.kind === 'perlin' ? currentTerrain.source : {
                    kind: 'perlin',
                    params: {
                        seed: 1234,
                        octaveCount: 4,
                        amplitude: 0.1,
                        persistence: 0.5,
                        width: Math.min(200, layerFormData.width || 100),
                        height: Math.min(200, ((layerFormData as any).depth ?? (layerFormData as any).height) || 100)
                    }
                },
                ops: currentTerrain?.ops,
                adaptiveTessellation: currentTerrain?.adaptiveTessellation
            }

            storeUpdateLayer(currentId, {
                name: layerFormData.name?.trim() || currentLayer?.name || 'landscape',
                color: layerFormData.color || DEFAULT_LANDSCAPE_COLOR,
                width: layerFormData.width,
                depth: (layerFormData as any).depth ?? (layerFormData as any).height,
                shape: GfxLayerShape.Terrain,
                terrain: newTerrain
            })

            resetModalState()
            return
        }

        // currentId определён выше

        try {
            // Определяем итоговый assetId и размеры
            let assetId: string | undefined
            let imgWidth: number | undefined
            let imgHeight: number | undefined

            if (heightmapFile) {
                const upload = await uploadTerrainAsset(heightmapFile)
                assetId = upload.assetId
                imgWidth = upload.width
                imgHeight = upload.height
            } else if (selectedAsset) {
                assetId = selectedAsset.assetId
                imgWidth = selectedAsset.width
                imgHeight = selectedAsset.height
            }

            // Получаем текущий слой, чтобы подхватить прежнюю конфигурацию при отсутствии новых ассетов
            const currentLayer = layers?.find(l => l.id === currentId)
            const currentTerrain = currentLayer?.terrain
            if (!assetId || !imgWidth || !imgHeight) {
                if (currentTerrain?.source.kind === 'heightmap') {
                    assetId = currentTerrain.source.params.assetId
                    imgWidth = currentTerrain.source.params.imgWidth
                    imgHeight = currentTerrain.source.params.imgHeight
                }
            }

            // Если и сейчас не определили ассет — делаем обычный апдейт без модификации terrain
            if (!assetId || !imgWidth || !imgHeight) {
                handleUpdateLayer()
                return
            }

            const newTerrain: GfxTerrainConfig = {
                worldWidth: layerFormData.width || currentTerrain?.worldWidth || 100,
                worldDepth: ((layerFormData as any).depth ?? (layerFormData as any).height) || (currentTerrain as any)?.worldDepth || 100,
                center: [centerX ?? (currentTerrain?.center?.[0] ?? 0), centerZ ?? (currentTerrain?.center?.[1] ?? 0)],
                edgeFade: currentTerrain?.edgeFade ?? 0,
                seaLevel: currentTerrain?.seaLevel,
                source: {
                    kind: 'heightmap',
                    params: {
                        assetId,
                        imgWidth,
                        imgHeight,
                        min: heightmapParams.min ?? 0,
                        max: heightmapParams.max ?? 10,
                        wrap: heightmapParams.wrap ?? 'clamp'
                    }
                },
                ops: currentTerrain?.ops,
                adaptiveTessellation: currentTerrain?.adaptiveTessellation
            }

            // Обновляем слой через zustand-стор
            storeUpdateLayer(currentId, {
                name: layerFormData.name?.trim() || currentLayer?.name || 'landscape',
                color: layerFormData.color || DEFAULT_LANDSCAPE_COLOR,
                width: layerFormData.width,
                depth: (layerFormData as any).depth ?? (layerFormData as any).height,
                shape: GfxLayerShape.Terrain,
                terrain: newTerrain
            })

            resetModalState()
        } catch (e) {
            console.error('Ошибка обновления heightmap-слоя:', e)
            handleUpdateLayer()
        }
    }, [layerModalMode, layerFormData, terrainSource, heightmapFile, selectedAsset, heightmapParams, layers, handleUpdateLayer, resetModalState, storeUpdateLayer, centerX, centerZ])

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            if (heightmapPreviewUrl) {
                revokeTerrainAssetPreviewUrl(heightmapPreviewUrl)
            }
        }
    }, [heightmapPreviewUrl])

    return (
        <>
            {/* Unified Layer Modal */}
            <Modal
                opened={layerModalOpened}
                onClose={resetModalState}
                title={layerModalMode === 'create' ? 'Создать новый слой' : 'Редактировать слой'}
                size="xl"
            >
                <Stack gap="md">
                    {layerModalMode === 'create' && (
                        <Select
                            label="Тип слоя"
                            data={[
                                { value: GfxLayerType.Object, label: 'Object Layer' },
                                { value: GfxLayerType.Landscape, label: 'Landscape' },
                                { value: GfxLayerType.Water, label: 'Вода' }
                            ]}
                            value={layerFormData.type}
                            onChange={(v) => {
                                if (!v) return
                                const newType = v as GfxLayerType
                                setLayerFormData({ ...layerFormData, type: newType })
                                if (newType === GfxLayerType.Landscape) {
                                    setLayerFormData(prev => ({ ...prev, name: 'landscape' }))
                                } else if (newType === GfxLayerType.Water) {
                                    setLayerFormData(prev => ({ ...prev, name: 'вода' }))
                                }
                            }}
                        />
                    )}

                    {(layerFormData.type === GfxLayerType.Object || layerModalMode === 'edit') && (
                        <TextInput
                            label="Название слоя"
                            placeholder="Введите название слоя"
                            value={layerFormData.name}
                            onChange={(e) => setLayerFormData({ ...layerFormData, name: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    layerModalMode === 'create' ? handleCreateLayerWithTerrain() : handleUpdateLayerWithTerrain()
                                }
                            }}
                            autoFocus
                        />
                    )}

                    {layerFormData.type === GfxLayerType.Landscape && (
                        <>
                            <Select
                                label="Форма поверхности"
                                data={[
                                    { value: GfxLayerShape.Plane, label: 'Плоская поверхность' },
                                    { value: GfxLayerShape.Terrain, label: 'Рельефная поверхность (террейн)' }
                                ]}
                                value={layerFormData.shape}
                                onChange={(v) => setLayerFormData({ ...layerFormData, shape: v as GfxLayerShape })}
                            />

                            {layerFormData.shape === GfxLayerShape.Terrain && (
                                <>
                                    <Select
                                        label="Источник данных террейна"
                                        data={[
                                            { value: 'perlin', label: 'Perlin Noise (генерация)' },
                                            { value: 'heightmap', label: 'Heightmap (загрузка PNG)' }
                                        ]}
                                        value={terrainSource}
                                        onChange={(v) => {
                                            if (v) {
                                                setTerrainSource(v as 'perlin' | 'heightmap')
                                                setUploadError(null)
                                            }
                                        }}
                                    />

                                    {terrainSource === 'heightmap' && (
                                        <Stack gap="sm">
                                            <Group align="end" gap="sm">
                                                <FileInput
                                                    label="Загрузить PNG heightmap"
                                                    placeholder="Выберите PNG файл..."
                                                    accept="image/png"
                                                    value={heightmapFile}
                                                    onChange={handleHeightmapUpload}
                                                    leftSection={<IconUpload size={16} />}
                                                    disabled={isUploading || !!selectedAsset}
                                                    style={{ flex: 1 }}
                                                />
                                                <Button
                                                    variant="light"
                                                    leftSection={<IconPhoto size={16} />}
                                                    onClick={() => setAssetPickerOpened(true)}
                                                    disabled={isUploading}
                                                >
                                                    Выбрать из коллекции
                                                </Button>
                                            </Group>

                                            {uploadError && (
                                                <Alert color="red" variant="light">
                                                    {uploadError}
                                                </Alert>
                                            )}

                                            {selectedAsset && (
                                                <Stack gap="xs">
                                                    <Group justify="space-between" align="center">
                                                        <Text size="sm" fw={500}>Выбранный ассет:</Text>
                                                        <Button variant="subtle" size="xs" leftSection={<IconX size={14} />} onClick={() => {
                                                            setSelectedAsset(null)
                                                            if (selectedAssetPreviewUrl) {
                                                                revokeTerrainAssetPreviewUrl(selectedAssetPreviewUrl)
                                                                setSelectedAssetPreviewUrl(null)
                                                            }
                                                        }}>Сбросить выбор</Button>
                                                    </Group>
                                                    <Image
                                                        src={selectedAssetPreviewUrl || ''}
                                                        alt={selectedAsset.fileName}
                                                        width={200}
                                                        height={150}
                                                        fit="contain"
                                                        style={{ border: '1px solid #e0e0e0', borderRadius: 4 }}
                                                    />
                                                    <Text size="sm" c="dimmed">{selectedAsset.fileName} — {selectedAsset.width}×{selectedAsset.height}px</Text>
                                                </Stack>
                                            )}

                                            {!selectedAsset && heightmapPreviewUrl && (
                                                <Stack gap="xs">
                                                    <Text size="sm" fw={500}>Превью heightmap:</Text>
                                                    <Image
                                                        src={heightmapPreviewUrl}
                                                        alt="Heightmap preview"
                                                        width={200}
                                                        height={150}
                                                        fit="contain"
                                                        style={{ border: '1px solid #e0e0e0', borderRadius: 4 }}
                                                    />
                                                </Stack>
                                            )}

                                            {/* Контролы нормализации высоты и режима UV-wrap показываем всегда, независимо от источника */}
                                            <Stack gap="xs">
                                                <Group gap="lg">
                                                    <Stack gap="xs" style={{ flex: 1 }}>
                                                        <Text size="sm">Минимальная высота: {heightmapParams.min}</Text>
                                                        <Slider
                                                            value={heightmapParams.min || 0}
                                                            onChange={(val) => setHeightmapParams(prev => ({ ...prev, min: val }))}
                                                            min={-50}
                                                            max={50}
                                                            step={0.1}
                                                            size="sm"
                                                        />
                                                    </Stack>
                                                    <Stack gap="xs" style={{ flex: 1 }}>
                                                        <Text size="sm">Максимальная высота: {heightmapParams.max}</Text>
                                                        <Slider
                                                            value={heightmapParams.max || 10}
                                                            onChange={(val) => setHeightmapParams(prev => ({ ...prev, max: val }))}
                                                            min={-50}
                                                            max={100}
                                                            step={0.1}
                                                            size="sm"
                                                        />
                                                    </Stack>
                                                </Group>

                                                <Select
                                                    label="Режим обработки краев"
                                                    data={[
                                                        { value: 'clamp', label: 'Ограничение (clamp)' },
                                                        { value: 'repeat', label: 'Повтор (repeat)' }
                                                    ]}
                                                    value={heightmapParams.wrap || 'clamp'}
                                                    onChange={(v) => setHeightmapParams(prev => ({ ...prev, wrap: v as 'clamp' | 'repeat' }))}
                                                />
                                            </Stack>
                                        </Stack>
                                    )}
                                    {/* Положение центра террейна (мировые координаты X/Z) */}
                                    <Group gap="sm" mt="xs">
                                        <NumberInput
                                            label="Центр X, м"
                                            value={centerX}
                                            onChange={(val) => setCenterX(val || 0)}
                                        />
                                        <NumberInput
                                            label="Центр Z, м"
                                            value={centerZ}
                                            onChange={(val) => setCenterZ(val || 0)}
                                        />
                                    </Group>
                                </>
                            )}
                            <ColorInput
                                label="Цвет поверхности"
                                value={layerFormData.color}
                                onChange={(color) => setLayerFormData({ ...layerFormData, color })}
                                withEyeDropper={false}
                            />
                            <>
                                <Group gap="xs" align="center">
                                    {presets.map((preset) => (
                                        <Button
                                            key={preset.id}
                                            size="xs"
                                            onClick={() => applyPreset(preset.id)}
                                            variant={currentPreset === preset.id ? 'outlined' : 'default'}
                                        >
                                            {preset.title}
                                        </Button>
                                    ))}
                                    <ActionIcon
                                        size="sm"
                                        variant={showSizeConfig ? 'filled' : 'default'}
                                        onClick={() => setShowSizeConfig((prev) => !prev)}
                                    >
                                        <IconSettings size={16} />
                                    </ActionIcon>
                                </Group>
                                {showSizeConfig && (
                                    <Group gap="sm">
                                        <NumberInput
                                            label="Ширина, м"
                                            value={layerFormData.width}
                                            onChange={(val) => setLayerFormData({ ...layerFormData, width: val || 1 })}
                                            min={1}
                                        />
                                        <NumberInput
                                            label="Глубина, м"
                                            value={(layerFormData as any).depth ?? (layerFormData as any).height}
                                            onChange={(val) => setLayerFormData({ ...layerFormData, depth: val || 1 })}
                                            min={1}
                                        />
                                    </Group>
                                )}
                            </>
                        </>
                    )}
                    {layerFormData.type === GfxLayerType.Water && (
                        <Stack gap="sm">
                            <Group gap="sm">
                                <NumberInput
                                    label="Ширина, м"
                                    value={layerFormData.width}
                                    onChange={(val) => setLayerFormData({ ...layerFormData, width: val || 1 })}
                                    min={1}
                                />
                                <NumberInput
                                    label="Глубина, м"
                                    value={(layerFormData as any).depth ?? (layerFormData as any).height}
                                    onChange={(val) => setLayerFormData({ ...layerFormData, depth: val || 1 })}
                                    min={1}
                                />
                            </Group>

                            {/* Выбор типа визуализации воды */}
                            <Select
                                label="Тип воды"
                                data={[
                                    { value: 'simple', label: 'Простая' },
                                    { value: 'realistic', label: 'Реалистичная' }
                                ]}
                                value={((layerFormData as any).water?.type) || 'realistic'}
                                onChange={(v) => {
                                    if (!v) return
                                    setLayerFormData(prev => ({
                                        ...prev,
                                        water: {
                                            type: v as 'simple' | 'realistic',
                                            // сохраняем существующую яркость (важна для simple)
                                            brightness: ((prev as any).water?.brightness ?? 1.6)
                                        }
                                    } as any))
                                }}
                            />

                            {/* Яркость показываем только для простого варианта */}
                            {(((layerFormData as any).water?.type) || 'realistic') === 'simple' && (
                                <Group align="flex-end" gap="sm">
                                    <NumberInput
                                        label="Яркость воды"
                                        value={((layerFormData as any).water?.brightness) ?? 1.6}
                                        onChange={(val) => setLayerFormData({
                                            ...layerFormData,
                                            water: { type: (((layerFormData as any).water?.type) || 'realistic'), brightness: (val || 1.6) }
                                        } as any)}
                                        min={0.5}
                                        max={3}
                                        step={0.1}
                                    />
                                </Group>
                            )}
                        </Stack>
                    )}

                    <Group justify="flex-end" gap="sm">
                        <Button variant="outline" onClick={resetModalState}>
                            Отмена
                        </Button>
                        <Button
                            onClick={layerModalMode === 'create' ? handleCreateLayerWithTerrain : handleUpdateLayerWithTerrain}
                            disabled={(layerFormData.type === GfxLayerType.Object && !layerFormData.name.trim()) ||
                                     (terrainSource === 'heightmap' && !heightmapFile && !selectedAsset && layerFormData.shape === GfxLayerShape.Terrain && layerModalMode === 'create') ||
                                     isUploading}
                            loading={isUploading}
                        >
                            {layerModalMode === 'create' ? 'Создать' : 'Сохранить'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Context Menu for moving objects */}
            <Menu
                opened={contextMenuOpened}
                onClose={() => setContextMenuOpened(false)}
                position="bottom-start"
                shadow="md"
                width={200}
            >
                <Menu.Target>
                    <div
                        style={{
                            position: 'fixed',
                            left: contextMenuPosition.x,
                            top: contextMenuPosition.y,
                            width: 1,
                            height: 1,
                            pointerEvents: 'none'
                        }}
                    />
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Label>Переместить в слой</Menu.Label>
                    {layers?.map((layer) => (
                        <Menu.Item
                            key={layer.id}
                            leftSection={<IconLayersLinked size={16} />}
                            onClick={() => handleMoveToLayer(layer.id)}
                        >
                            {layer.name}
                        </Menu.Item>
                    ))}
                </Menu.Dropdown>
            </Menu>
            {/* Модал выбора heightmap ассета из коллекции */}
            <TerrainAssetPickerModal
                opened={assetPickerOpened}
                onClose={() => setAssetPickerOpened(false)}
                onSelect={async ({ assetId, width, height, fileName }) => {
                    // Сбрасываем файл и его превью, если были
                    if (heightmapPreviewUrl) {
                        revokeTerrainAssetPreviewUrl(heightmapPreviewUrl)
                        setHeightmapPreviewUrl(null)
                    }
                    setHeightmapFile(null)

                    // Сохраняем выбранный ассет и подгружаем превью
                    setSelectedAsset({ assetId, width, height, fileName })
                    try {
                        const url = await createTerrainAssetPreviewUrl(assetId)
                        setSelectedAssetPreviewUrl(url)
                    } catch (e) {
                        console.error('Не удалось создать превью выбранного ассета', e)
                    }

                    // Обновляем параметры изображения для terrain
                    setHeightmapParams(prev => ({ ...prev, imgWidth: width, imgHeight: height }))
                    setAssetPickerOpened(false)
                }}
            />
        </>
    )
}
