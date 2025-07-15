import React from 'react'
import { Modal, Stack, TextInput, Button, Group, Menu } from '@mantine/core'
import { IconLayersLinked } from '@tabler/icons-react'
import type { SceneLayer } from '../types/scene'

interface LayerModalsProps {
    // Create Layer Modal
    createLayerModalOpened: boolean
    setCreateLayerModalOpened: (opened: boolean) => void
    newLayerName: string
    setNewLayerName: (name: string) => void
    onCreateLayer: () => void
    
    // Edit Layer Modal
    editLayerModalOpened: boolean
    setEditLayerModalOpened: (opened: boolean) => void
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
    onCreateLayer,
    editLayerModalOpened,
    setEditLayerModalOpened,
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
                    <Group justify="flex-end" gap="sm">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCreateLayerModalOpened(false)
                                setNewLayerName('')
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
                    <Group justify="flex-end" gap="sm">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditLayerModalOpened(false)
                                setNewLayerName('')
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