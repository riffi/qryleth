import React from 'react'
import { Modal, Stack, TextInput, Button, Group, Menu, Select, NumberInput } from '@mantine/core'
import { IconLayersLinked } from '@tabler/icons-react'
import type { SceneLayer } from '../../../types/scene'

interface LayerModalsProps {
    // Create Layer Modal
    createLayerModalOpened: boolean
    setCreateLayerModalOpened: (opened: boolean) => void
    newLayerName: string
    setNewLayerName: (name: string) => void
    newLayerType: 'object' | 'landscape'
    setNewLayerType: (t: 'object' | 'landscape') => void
    newLayerWidth: number
    setNewLayerWidth: (v: number) => void
    newLayerHeight: number
    setNewLayerHeight: (v: number) => void
    newLayerShape: 'plane' | 'perlin'
    setNewLayerShape: (shape: 'plane' | 'perlin') => void
    onCreateLayer: () => void
    
    // Edit Layer Modal
    editLayerModalOpened: boolean
    setEditLayerModalOpened: (opened: boolean) => void
    editingLayerType: 'object' | 'landscape'
    setEditingLayerType: (t: 'object' | 'landscape') => void
    editingLayerWidth: number
    setEditingLayerWidth: (v: number) => void
    editingLayerHeight: number
    setEditingLayerHeight: (v: number) => void
    editingLayerShape: 'plane' | 'perlin'
    setEditingLayerShape: (shape: 'plane' | 'perlin') => void
    onUpdateLayer: () => void
    
    // Context Menu
    contextMenuOpened: boolean
    setContextMenuOpened: (opened: boolean) => void
    contextMenuPosition: { x: number, y: number }
    layers?: SceneLayer[]
    onMoveToLayer: (layerId: string) => void
}

export const LayerModals: React.FC<LayerModalsProps> = ({
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
    onUpdateLayer,
    contextMenuOpened,
    setContextMenuOpened,
    contextMenuPosition,
    layers,
    onMoveToLayer
}) => {
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
                }}
                title="Создать новый слой"
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
                                onCreateLayer()
                            }
                        }}
                    autoFocus
                />
                <Select
                    label="Тип слоя"
                    data={[
                        { value: 'object', label: 'Object Layer' },
                        { value: 'landscape', label: 'Landscape' }
                    ]}
                    value={newLayerType}
                    onChange={(v) => setNewLayerType(v as 'object' | 'landscape')}
                />
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
                            }}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={onCreateLayer}
                            disabled={!newLayerName.trim()}
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
                        { value: 'landscape', label: 'Landscape' }
                    ]}
                    value={editingLayerType}
                    onChange={(v) => setEditingLayerType(v as 'object' | 'landscape')}
                />
                {editingLayerType === 'landscape' && (
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
