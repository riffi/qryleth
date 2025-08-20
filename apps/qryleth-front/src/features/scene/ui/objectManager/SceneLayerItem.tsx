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
  IconPlus,
  IconMountain,
  IconRipple
} from '@tabler/icons-react'
import { SceneObjectItem } from './SceneObjectItem.tsx'
import type { ObjectInfo } from '@/features/scene'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { useSceneObjectManager } from './SceneObjectManagerContext.tsx'
import { GfxLayerType } from '@/entities/layer'


interface LayerItemProps {
  layer: SceneLayer,
  layerObjects: ObjectInfo[],
  isExpanded: boolean,
  expandedItems: Set<string>,
  selectedObject?: { objectUuid: string, instanceId?: string } | null,
  dragOverLayerId: string | null
}

export const SceneLayerItem: React.FC<LayerItemProps> = ({
                                                           layer,
                                                           layerObjects,
                                                           isExpanded,
                                                           expandedItems,
                                                           selectedObject,
                                                           dragOverLayerId
                                                         }) => {
  const {
    toggleLayerExpanded,
    toggleLayerVisibility,
    openEditLayerModal,
    deleteLayer,
    dragOver,
    dragLeave,
    drop,
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

  /**
   * Возвращает JSX-иконку для отображения рядом с названием слоя в зависимости от его типа.
   * - Для обычных «объектных» слоёв используется стандартная иконка слоёв.
   * - Для слоёв типа `landscape` отображается иконка гор (условный рельеф).
   * - Для слоёв типа `water` отображается иконка волн (условная вода).
   */
  const getLayerIcon = (): React.ReactNode => {
    if (layer.type === GfxLayerType.Landscape) {
      return <IconMountain size={14} color={'var(--mantine-color-green-5)'} />
    }
    if (layer.type === GfxLayerType.Water) {
      return <IconRipple size={14} color={'var(--mantine-color-blue-5)'} />
    }
    return <IconLayersLinked size={14} color="var(--mantine-color-blue-4)" />
  }

  /**
   * Признак «структурного» слоя, внутри которого не бывает объектов.
   * Для таких слоёв (landscape/water) скрываем шеврон сворачивания/разворачивания
   * и не показываем счётчик объектов, так как он всегда равен нулю.
   */
  const isStructuralLayer = layer.type === GfxLayerType.Landscape || layer.type === GfxLayerType.Water
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
            onDragOver={isStructuralLayer ? undefined : (e) => dragOver(e, layer.id)}
            onDragLeave={isStructuralLayer ? undefined : dragLeave}
            onDrop={isStructuralLayer ? undefined : (e) => drop(e, layer.id)}
        >
          <Group justify="space-between" align="center" gap="xs">
            <Group gap="xs" style={{flex: 1}}>
              {!isStructuralLayer && (
                <ActionIcon
                    size="xs"
                    variant="transparent"
                    onClick={() => toggleLayerExpanded(layer.id)}
                    style={{
                      width: '16px',
                      height: '16px',
                      minWidth: '16px'
                    }}
                >
                  {isExpanded ? <IconChevronDown size={12}/> : <IconChevronRight size={12}/>}
                </ActionIcon>
              )}
              {getLayerIcon()}
              <Text size="xs" fw={500} style={{userSelect: 'none'}}>
                {layer.name}
              </Text>
              {!isStructuralLayer && (
                <Text size="xs" c="dimmed" style={{fontSize: '10px'}}>
                  ({layerObjects.length})
                </Text>
              )}
            </Group>
            <Group gap="xs">
              <ActionIcon
                  size="xs"
                  variant="transparent"
                  onClick={() => toggleLayerVisibility(layer.id)}
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
                  {!isStructuralLayer && (
                    <Menu.Item
                        leftSection={<IconPlus size={14}/>}
                        onClick={() => addObjectFromLibrary(layer.id)}
                    >
                      Добавить объект из библиотеки
                    </Menu.Item>
                  )}
                  <Menu.Item
                      leftSection={<IconEdit size={14}/>}
                      onClick={() => openEditLayerModal(layer)}
                  >
                    Переименовать
                  </Menu.Item>
                  {layer.type === GfxLayerType.Landscape && (
                      <Menu.Item onClick={() => openEditLayerModal(layer)}>
                        Изменить размер
                      </Menu.Item>
                  )}
                  {layer.id !== 'objects' && (
                      <Menu.Item
                          leftSection={<IconTrash size={14}/>}
                          color="red"
                          onClick={() => deleteLayer(layer.id)}
                      >
                        Удалить слой
                      </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </Box>

        {!isStructuralLayer && (
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
        )}
      </div>
  )
}
