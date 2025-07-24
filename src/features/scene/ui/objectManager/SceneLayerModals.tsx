import React, {useCallback, useEffect, useState} from 'react'
import { Modal, Stack, TextInput, Button, Group, Menu, Select, NumberInput, ColorInput, ActionIcon } from '@mantine/core'
import { IconLayersLinked, IconSettings } from '@tabler/icons-react'
import type { SceneLayer } from '../../../types/scene'
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/scene/constants.ts'

/**
 * Модальные окна для создания и редактирования слоёв сцены.
 * Позволяют выбрать тип слоя, его размеры и цвет поверхности.
 */

interface LayerModalsProps {
    // Create Layer Modal
    createLayerModalOpened: boolean
    setCreateLayerModalOpened: (opened: boolean) => void
    newLayerName: string
    setNewLayerName: (name: string) => void
    newLayerType: 'object' | 'landscape' | 'sea'
    setNewLayerType: (t: 'object' | 'landscape' | 'sea') => void
    newLayerWidth: number
    setNewLayerWidth: (v: number) => void
    newLayerHeight: number
    setNewLayerHeight: (v: number) => void
    newLayerShape: 'plane' | 'perlin'
    setNewLayerShape: (shape: 'plane' | 'perlin') => void
    newLayerColor: string
    setNewLayerColor: (color: string) => void
    onCreateLayer: () => void

    // Edit Layer Modal
    editLayerModalOpened: boolean
    setEditLayerModalOpened: (opened: boolean) => void
    editingLayerType: 'object' | 'landscape' | 'sea'
    setEditingLayerType: (t: 'object' | 'landscape' | 'sea') => void
    editingLayerWidth: number
    setEditingLayerWidth: (v: number) => void
    editingLayerHeight: number
    setEditingLayerHeight: (v: number) => void
    editingLayerShape: 'plane' | 'perlin'
    setEditingLayerShape: (shape: 'plane' | 'perlin') => void
    editingLayerColor: string
    setEditingLayerColor: (color: string) => void
    onUpdateLayer: () => void

    // Context Menu
    contextMenuOpened: boolean
    setContextMenuOpened: (opened: boolean) => void
    contextMenuPosition: { x: number, y: number }
    layers?: SceneLayer[]
    onMoveToLayer: (layerId: string) => void
}

const presets = [
  {id: 1, title: 'Маленький', width: 10, height: 10 },
  {id: 2, title: 'Средний', width: 100, height: 100 },
  {id: 3, title: 'Большой', width: 1000, height: 1000 },
]

export const SceneLayerModals: React.FC<LayerModalsProps> = ({
    createLayerModalOpened,
    setCreateLayerModalOpened,
    newLayerName,
    setNewLayerName,
    newLayerType,
    setNewLayerType,
    newLayerWidth,
    setNewLayerWidth,
    newLayerHeight,
    setNewLayerHeight,
    newLayerShape,
    setNewLayerShape,
    newLayerColor,
    setNewLayerColor,
    onCreateLayer,
    editLayerModalOpened,
    setEditLayerModalOpened,
    editingLayerType,
    setEditingLayerType,
    editingLayerWidth,
    setEditingLayerWidth,
    editingLayerHeight,
    setEditingLayerHeight,
    editingLayerShape,
    setEditingLayerShape,
    editingLayerColor,
    setEditingLayerColor,
    onUpdateLayer,
    contextMenuOpened,
    setContextMenuOpened,
    contextMenuPosition,
    layers,
    onMoveToLayer
}) => {
    /**
     * Флаг отображения ручных настроек размера ландшафта.
     * При false показываются только пресеты размеров.
     */
    const [showSizeConfig, setShowSizeConfig] = useState(false)



    const [currentPreset, setCurrentPreset] = useState<number>(0)

  const applyPreset = useCallback((presetId: number) => {
    const preset = presets.find((p) => p.id === presetId)

    if (!preset) return
    setCurrentPreset(presetId)

    setNewLayerWidth(preset.width)
    setNewLayerHeight(preset.height)
  }, [setNewLayerHeight, setNewLayerWidth])

  useEffect(() => {
    applyPreset(2)
  }, [applyPreset]);

    /**
     * Применить выбранный пресет размера для нового слоя.
     * @param presetId
     */
    return (
        <>
            {/* Create Layer Modal */}
            <Modal
                opened={createLayerModalOpened}
                onClose={() => {
                    setCreateLayerModalOpened(false)
                    setNewLayerName('')
                    setNewLayerType('object')
                    setNewLayerWidth(10)
                    setNewLayerHeight(10)
                    setNewLayerShape('plane')
                    setNewLayerColor('#379f34')
                }}
                title="Создать новый слой"
                size="sm"
            >
                <Stack gap="md">
                <Select
                    label="Тип слоя"
                    data={[
                        { value: 'object', label: 'Object Layer' },
                        { value: 'landscape', label: 'Landscape' },
                        { value: 'sea', label: 'Море' }
                    ]}
                    value={newLayerType}
                    onChange={(v) => {
                        const newType = v as 'object' | 'landscape' | 'sea'
                        setNewLayerType(newType)
                        // Set default name for landscape layers
                        if (newType === 'landscape') {
                            setNewLayerName('landscape')
                        } else if (newType === 'sea') {
                            setNewLayerName('море')
                        }
                    }}
                />
                {newLayerType === 'object' && (
                    <TextInput
                        label="Название слоя"
                        placeholder="Введите название слоя"
                        value={newLayerName}
                        onChange={(e) => setNewLayerName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onCreateLayer()
                            }
                        }}
                        autoFocus
                    />
                )}
                {newLayerType === 'landscape' && (
                    <>
                        <Select
                            label="Форма поверхности"
                            data={[
                                { value: 'plane', label: 'Плоская поверхность' },
                                { value: 'perlin', label: 'Perlin Noise (холмистая)' }
                            ]}
                            value={newLayerShape}
                            onChange={(v) => setNewLayerShape(v as 'plane' | 'perlin')}
                        />
                        <ColorInput
                            label="Цвет поверхности"
                            value={newLayerColor}
                            onChange={setNewLayerColor}
                            withEyeDropper={false}
                        />
                        <Group gap="xs" align="center">
                            {presets.map((preset) => (
                                <Button size="xs" onClick={() => applyPreset(preset.id)} variant={currentPreset === preset.id ? "outlined" : "default"}>
                                  {preset.title}
                                </Button>
                            ))}
                            <ActionIcon
                                size="sm"
                                variant={showSizeConfig ? 'filled' : 'default'}
                                onClick={() => setShowSizeConfig(prev => !prev)}
                            >
                                <IconSettings size={16} />
                            </ActionIcon>
                        </Group>
                        {showSizeConfig && (
                            <Group gap="sm">
                                <NumberInput
                                    label="Ширина, м"
                                    value={newLayerWidth}
                                    onChange={(val) => setNewLayerWidth(val || 1)}
                                    min={1}
                                />
                                <NumberInput
                                    label="Длина, м"
                                    value={newLayerHeight}
                                    onChange={(val) => setNewLayerHeight(val || 1)}
                                    min={1}
                                />
                            </Group>
                        )}
                    </>
                )}
                {newLayerType === 'sea' && (
                    <>
                        <Select
                            label="Форма поверхности"
                            data={[
                                { value: 'plane', label: 'Плоская поверхность' },
                                { value: 'perlin', label: 'Perlin Noise (холмистая)' }
                            ]}
                            value={newLayerShape}
                            onChange={(v) => setNewLayerShape(v as 'plane' | 'perlin')}
                        />
                        <ColorInput
                            label="Цвет поверхности"
                            value={newLayerColor}
                            onChange={setNewLayerColor}
                            withEyeDropper={false}
                        />
                        <Group gap="sm">
                            <NumberInput
                                label="Ширина, м"
                                value={newLayerWidth}
                                onChange={(val) => setNewLayerWidth(val || 1)}
                                min={1}
                            />
                            <NumberInput
                                label="Длина, м"
                                value={newLayerHeight}
                                onChange={(val) => setNewLayerHeight(val || 1)}
                                min={1}
                            />
                        </Group>
                    </>
                )}
                <Group justify="flex-end" gap="sm">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCreateLayerModalOpened(false)
                                setNewLayerName('')
                                setNewLayerType('object')
                                setNewLayerWidth(10)
                                setNewLayerHeight(10)
                                setNewLayerShape('plane')
                                setNewLayerColor(DEFAULT_LANDSCAPE_COLOR)
                            }}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={onCreateLayer}
                            disabled={newLayerType === 'object' && !newLayerName.trim()}
                        >
                            Создать
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Edit Layer Modal */}
            <Modal
                opened={editLayerModalOpened}
                onClose={() => {
                    setEditLayerModalOpened(false)
                    setNewLayerName('')
                    setEditingLayerType('object')
                    setEditingLayerWidth(10)
                    setEditingLayerHeight(10)
                    setEditingLayerShape('plane')
                    setEditingLayerColor(DEFAULT_LANDSCAPE_COLOR)
                }}
                title="Редактировать слой"
                size="sm"
            >
                <Stack gap="md">
                    <TextInput
                        label="Название слоя"
                        placeholder="Введите название слоя"
                        value={newLayerName}
                        onChange={(e) => setNewLayerName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onUpdateLayer()
                            }
                        }}
                    autoFocus
                />
                <Select
                    label="Тип слоя"
                    data={[
                        { value: 'object', label: 'Object Layer' },
                        { value: 'landscape', label: 'Landscape' },
                        { value: 'sea', label: 'Море' }
                    ]}
                    value={editingLayerType}
                    onChange={(v) => setEditingLayerType(v as 'object' | 'landscape' | 'sea')}
                />
                {(editingLayerType === 'landscape' || editingLayerType === 'sea') && (
                    <>
                        <Select
                            label="Форма поверхности"
                            data={[
                                { value: 'plane', label: 'Плоская поверхность' },
                                { value: 'perlin', label: 'Perlin Noise (холмистая)' }
                            ]}
                            value={editingLayerShape}
                            onChange={(v) => setEditingLayerShape(v as 'plane' | 'perlin')}
                        />
                        <ColorInput
                            label="Цвет поверхности"
                            value={editingLayerColor}
                            onChange={setEditingLayerColor}
                            withEyeDropper={false}
                        />
                        <Group gap="sm">
                            <NumberInput
                                label="Ширина, м"
                                value={editingLayerWidth}
                                onChange={(val) => setEditingLayerWidth(val || 1)}
                                min={1}
                            />
                            <NumberInput
                                label="Длина, м"
                                value={editingLayerHeight}
                                onChange={(val) => setEditingLayerHeight(val || 1)}
                                min={1}
                            />
                        </Group>
                    </>
                )}
                <Group justify="flex-end" gap="sm">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditLayerModalOpened(false)
                                setNewLayerName('')
                                setEditingLayerType('object')
                                setEditingLayerWidth(10)
                                setEditingLayerHeight(10)
                                setEditingLayerShape('plane')
                                setEditingLayerColor(DEFAULT_LANDSCAPE_COLOR)
                            }}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={onUpdateLayer}
                            disabled={!newLayerName.trim()}
                        >
                            Сохранить
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
                            onClick={() => onMoveToLayer(layer.id)}
                        >
                            {layer.name}
                        </Menu.Item>
                    ))}
                </Menu.Dropdown>
            </Menu>
        </>
    )
}
