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
    ActionIcon
} from '@mantine/core'
import { IconLayersLinked, IconSettings } from '@tabler/icons-react'
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/scene/constants.ts'
import { useSceneObjectManager } from './SceneObjectManagerContext.tsx'
import { createEmptySceneLayer } from './layerFormUtils.ts'

/**
 * Модальные окна для создания и редактирования слоёв сцены.
 * Позволяют выбрать тип слоя, его размеры и цвет поверхности.
 */


const presets = [
  {id: 1, title: 'Маленький', width: 10, height: 10 },
  {id: 2, title: 'Средний', width: 100, height: 100 },
  {id: 3, title: 'Большой', width: 1000, height: 1000 },
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
    /**
     * Флаг отображения ручных настроек размера ландшафта.
     * При false показываются только пресеты размеров.
     */
    const [showSizeConfig, setShowSizeConfig] = useState(false)



    const [currentPreset, setCurrentPreset] = useState<number>(0)

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
            height: preset.height
        }))
    }, [setLayerFormData])

    useEffect(() => {
        if (layerModalOpened && layerModalMode === 'create') {
            applyPreset(2)
        }
    }, [layerModalOpened, layerModalMode, applyPreset])

    return (
        <>
            {/* Unified Layer Modal */}
            <Modal
                opened={layerModalOpened}
                onClose={() => {
                    setLayerModalOpened(false)
                    setLayerFormData(createEmptySceneLayer())
                    setShowSizeConfig(false)
                    setCurrentPreset(0)
                }}
                title={layerModalMode === 'create' ? 'Создать новый слой' : 'Редактировать слой'}
                size="sm"
            >
                <Stack gap="md">
                    {layerModalMode === 'create' && (
                        <Select
                            label="Тип слоя"
                            data={[
                                { value: 'object', label: 'Object Layer' },
                                { value: 'landscape', label: 'Landscape' },
                                { value: 'water', label: 'Вода' }
                            ]}
                            value={layerFormData.type}
                            onChange={(v) => {
                                const newType = v as 'object' | 'landscape' | 'water'
                                setLayerFormData({ ...layerFormData, type: newType })
                                if (newType === 'landscape') {
                                    setLayerFormData(prev => ({ ...prev, name: 'landscape' }))
                                } else if (newType === 'water') {
                                    setLayerFormData(prev => ({ ...prev, name: 'вода' }))
                                }
                            }}
                        />
                    )}

                    {(layerFormData.type === 'object' || layerModalMode === 'edit') && (
                        <TextInput
                            label="Название слоя"
                            placeholder="Введите название слоя"
                            value={layerFormData.name}
                            onChange={(e) => setLayerFormData({ ...layerFormData, name: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    layerModalMode === 'create' ? handleCreateLayer() : handleUpdateLayer()
                                }
                            }}
                            autoFocus
                        />
                    )}

                    {(layerFormData.type === 'landscape' || layerFormData.type === 'water') && (
                        <>
                            <Select
                                label="Форма поверхности"
                                data={[
                                    { value: 'plane', label: 'Плоская поверхность' },
                                    { value: 'perlin', label: 'Perlin Noise (холмистая)' }
                                ]}
                                value={layerFormData.shape}
                                onChange={(v) => setLayerFormData({ ...layerFormData, shape: v as 'plane' | 'perlin' })}
                            />
                            <ColorInput
                                label="Цвет поверхности"
                                value={layerFormData.color}
                                onChange={(color) => setLayerFormData({ ...layerFormData, color })}
                                withEyeDropper={false}
                            />
                            {layerFormData.type === 'landscape' && (
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
                                                label="Длина, м"
                                                value={layerFormData.height}
                                                onChange={(val) => setLayerFormData({ ...layerFormData, height: val || 1 })}
                                                min={1}
                                            />
                                        </Group>
                                    )}
                                </>
                            )}
                            {layerFormData.type === 'water' && (
                                <Group gap="sm">
                                    <NumberInput
                                        label="Ширина, м"
                                        value={layerFormData.width}
                                        onChange={(val) => setLayerFormData({ ...layerFormData, width: val || 1 })}
                                        min={1}
                                    />
                                    <NumberInput
                                        label="Длина, м"
                                        value={layerFormData.height}
                                        onChange={(val) => setLayerFormData({ ...layerFormData, height: val || 1 })}
                                        min={1}
                                    />
                                </Group>
                            )}
                        </>
                    )}

                    <Group justify="flex-end" gap="sm">
                        <Button variant="outline" onClick={() => {
                            setLayerModalOpened(false)
                            setLayerFormData(createEmptySceneLayer())
                            setShowSizeConfig(false)
                            setCurrentPreset(0)
                        }}>
                            Отмена
                        </Button>
                        <Button
                            onClick={layerModalMode === 'create' ? handleCreateLayer : handleUpdateLayer}
                            disabled={layerFormData.type === 'object' && !layerFormData.name.trim()}
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
        </>
    )
}
