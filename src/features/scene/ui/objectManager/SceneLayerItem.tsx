import React from 'react'
import {Group, Text, Box, ActionIcon, Menu, Collapse, Stack} from '@mantine/core'
import {
  IconLayersLinked,
  IconEye,
  IconEyeOff,
  IconEdit,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
  IconPlus
} from '@tabler/icons-react'
import { SceneObjectItem } from './SceneObjectItem.tsx'
import type { ObjectInfo } from '@/features/scene'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { useSceneObjectManager } from './SceneObjectManagerContext.tsx'


interface LayerItemProps {
  layer: SceneLayer,
  layerObjects: ObjectInfo[],
  isExpanded: boolean,
  expandedItems: Set<string>,
  selectedObject?: { objectUuid: string, instanceId?: string } | null,
  dragOverLayerId: string | null,
  onToggleExpanded: (layerId: string) => void,
  onToggleVisibility: (layerId: string) => void,
  onEdit: (layer: SceneLayer) => void,
  onDelete: (layerId: string) => void,
  onEditSize?: (layer: SceneLayer) => void,
  onDragOver: (e: React.DragEvent, layerId: string) => void,
  onDragLeave: (e: React.DragEvent) => void,
  onDrop: (e: React.DragEvent, layerId: string) => void
}

export const SceneLayerItem: React.FC<LayerItemProps> = ({
                                                           layer,
                                                           layerObjects,
                                                           isExpanded,
                                                           expandedItems,
                                                           selectedObject,
                                                           dragOverLayerId,
                                                           onToggleExpanded,
                                                           onToggleVisibility,
                                                           onEdit,
                                                           onDelete,
                                                           onEditSize,
                                                           onDragOver,
                                                           onDragLeave,
                                                           onDrop
                                                         }) => {
  const {
    toggleObjectExpanded,
    highlightObject,
    clearHighlight,
    selectObject,
    toggleObjectVisibility,
    removeObject,
    saveObjectToLibrary,
    editObject,
    toggleInstanceVisibility,
    removeInstance,
    dragStart,
    contextMenu,
    addObjectFromLibrary,
    exportObject,
    copyObject
  } = useSceneObjectManager()
  return (
      <div>
        <Box
            style={{
              backgroundColor: dragOverLayerId === layer.id
                  ? 'var(--mantine-color-blue-8)'
                  : 'transparent',
              marginBottom: '0px',
              borderRadius: '4px',
              padding: '8px 4px',
              border: dragOverLayerId === layer.id
                  ? '1px dashed var(--mantine-color-blue-4)'
                  : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.1s ease'
            }}
            onDragOver={(e) => onDragOver(e, layer.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, layer.id)}
        >
          <Group justify="space-between" align="center" gap="xs">
            <Group gap="xs" style={{flex: 1}}>
              <ActionIcon
                  size="xs"
                  variant="transparent"
                  onClick={() => onToggleExpanded(layer.id)}
                  style={{
                    width: '16px',
                    height: '16px',
                    minWidth: '16px'
                  }}
              >
                {isExpanded ? <IconChevronDown size={12}/> : <IconChevronRight size={12}/>}
              </ActionIcon>
              <IconLayersLinked size={14} color="var(--mantine-color-blue-4)"/>
              <Text size="xs" fw={500} style={{userSelect: 'none'}}>
                {layer.name}
              </Text>
              <Text size="xs" c="dimmed" style={{fontSize: '10px'}}>
                ({layerObjects.length})
              </Text>
            </Group>
            <Group gap="xs">
              <ActionIcon
                  size="xs"
                  variant="transparent"
                  onClick={() => onToggleVisibility(layer.id)}
                  style={{
                    width: '16px',
                    height: '16px',
                    minWidth: '16px'
                  }}
              >
                {layer.visible ? <IconEye size={12}/> : <IconEyeOff size={12}/>}
              </ActionIcon>
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <ActionIcon
                      size="xs"
                      variant="transparent"
                      style={{
                        width: '16px',
                        height: '16px',
                        minWidth: '16px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                  >
                    <Text size="xs" fw={700}>⋮</Text>
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                      leftSection={<IconPlus size={14}/>}
                      onClick={() => addObjectFromLibrary(layer.id)}
                  >
                    Добавить объект из библиотеки
                  </Menu.Item>
                  <Menu.Item
                      leftSection={<IconEdit size={14}/>}
                      onClick={() => onEdit(layer)}
                  >
                    Переименовать
                  </Menu.Item>
                  {layer.type === 'landscape' && onEditSize && (
                      <Menu.Item onClick={() => onEditSize(layer)}>
                        Изменить размер
                      </Menu.Item>
                  )}
                  {layer.id !== 'objects' && (
                      <Menu.Item
                          leftSection={<IconTrash size={14}/>}
                          color="red"
                          onClick={() => onDelete(layer.id)}
                      >
                        Удалить слой
                      </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </Box>

        <Collapse in={isExpanded}>
          <Stack gap="0px" pl="lg">
            {layerObjects.length === 0 ? (
                <Text size="xs" c="dimmed" ta="center" py="sm">
                  Пустой слой
                </Text>
            ) : (
                layerObjects.map((obj) => (
                    <SceneObjectItem
                        key={`${obj.name}-${obj.objectUuid}`}
                        obj={obj}
                        isExpanded={expandedItems.has(obj.objectUuid)}
                        isSelected={selectedObject?.objectUuid === obj.objectUuid}
                        selectedObject={selectedObject}
                    />
                ))
            )}
          </Stack>
        </Collapse>
      </div>
  )
}
