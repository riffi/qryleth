import React from 'react'
import { Group, Text, Box, Collapse, Stack } from '@mantine/core'
import { IconLayersLinked, IconEdit, IconTrash, IconPlus } from '@tabler/icons-react'
import { SceneObjectItem } from './SceneObjectItem.tsx'
import type { ObjectInfo } from './SceneObjectItem.tsx'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { useSceneObjectManager } from './SceneObjectManagerContext.tsx'
import { GfxLayerType } from '@/entities/layer'
import { TreeRow } from '@/shared/ui/tree/TreeRow'


interface LayerItemProps {
  layer: SceneLayer,
  layerObjects: ObjectInfo[],
  isExpanded: boolean,
  selectedObject?: { objectUuid: string, instanceId?: string } | null,
  dragOverLayerId: string | null
}

/**
 * Компонент элемента списка слоёв.
 * Мемоизирован для предотвращения лишних перерисовок при неизменных пропсах.
 */
const SceneLayerItemComponent: React.FC<LayerItemProps> = ({
                                                           layer,
                                                           layerObjects,
                                                           isExpanded,
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
    addObjectFromLibrary
  } = useSceneObjectManager()

  // Для текущего использования компонент применяется только к объектным слоям.
  const isStructuralLayer = false
  return (
      <div>
        <Box
          style={{
            backgroundColor: dragOverLayerId === layer.id
              ? 'var(--mantine-color-blue-8)'
              : 'transparent',
            border: dragOverLayerId === layer.id
              ? '1px dashed var(--mantine-color-blue-4)'
              : '1px solid transparent',
            borderRadius: 4,
          }}
        >
          <TreeRow
            id={layer.id}
            name={layer.name}
            icon={<IconLayersLinked size={14} color="var(--mantine-color-blue-4)" />}
            isExpandable
            isExpanded={isExpanded}
            onToggleExpand={() => toggleLayerExpanded(layer.id)}
            count={layerObjects.length}
            visible={!!layer.visible}
            onToggleVisibility={() => toggleLayerVisibility(layer.id)}
            draggable
            onDragOver={(e) => dragOver(e, layer.id)}
            onDragLeave={dragLeave}
            onDrop={(e) => drop(e, layer.id)}
            actions={[
              { id: 'add-from-lib', label: 'Добавить объект из библиотеки', onClick: () => addObjectFromLibrary(layer.id), icon: <IconPlus size={14} /> },
              { id: 'rename', label: 'Переименовать', onClick: () => openEditLayerModal(layer), icon: <IconEdit size={14} /> },
              ...(layer.id !== 'objects' ? [{ id: 'delete', label: 'Удалить слой', color: 'red', onClick: () => deleteLayer(layer.id), icon: <IconTrash size={14} /> }] : []) as any,
            ]}
          />
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
                          isSelected={selectedObject?.objectUuid === obj.objectUuid}
                      />
                  ))
              )}
            </Stack>
          </Collapse>
        )}
      </div>
  )
}

/**
 * Оборачиваем в React.memo, чтобы перерисовывать элемент
 * только при реальном изменении входных пропсов (по ссылкам/значениям).
 */
export const SceneLayerItem = React.memo(SceneLayerItemComponent)
