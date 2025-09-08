import React from 'react'
import { IconRipple, IconPlus, IconTrash, IconDroplet } from '@tabler/icons-react'
import type { TreeNodeBase } from '@/shared/ui/tree/types'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { useSceneLayersOptimized } from '@/features/editor/scene/model/optimizedSelectors'
import { GfxLayerType } from '@/entities/layer'
// Контекст не используем напрямую — передаём нужные действия через параметры

/**
 * Секция «Водные слои»: слой воды → водоёмы.
 */
export const useWaterNodes = (params: {
  onAddBody: (layerId: string) => void
  onEditBody: (layerId: string, bodyId: string) => void
  toggleLayerVisibility: (layerId: string) => void
  openEditLayerModal: (layer: any) => void
  deleteLayer: (layerId: string) => void
}): TreeNodeBase[] => {
  const layers = useSceneLayersOptimized()
  const waterContent = useSceneStore(s => s.waterContent)
  const updateWaterBody = useSceneStore(s => s.updateWaterBody)
  const removeWaterBody = useSceneStore(s => s.removeWaterBody)

  return (layers || []).filter(l => l.type === GfxLayerType.Water).map(layer => {
    const container = (waterContent || []).find(c => c.layerId === layer.id)
    const children: TreeNodeBase[] = (container?.items || []).map(body => {
      // Используем только проверенные иконки из пакета: IconDroplet / IconRipple
      const icon = body.kind === 'lake'
        ? <IconDroplet size={12} color={'var(--mantine-color-blue-5)'} />
        : <IconRipple size={12} color={'var(--mantine-color-blue-5)'} />
      return {
        id: body.id,
        name: body.name || 'Без имени',
        icon,
        visible: body.visible !== false,
        onToggleVisibility: () => updateWaterBody(layer.id, body.id, { visible: !(body.visible !== false) } as any),
        actions: [
          { id: 'edit', label: 'Редактировать', onClick: () => params.onEditBody(layer.id, body.id) },
          { id: 'delete', label: 'Удалить', color: 'red', onClick: () => removeWaterBody(layer.id, body.id) },
        ]
      }
    })

    return {
      id: layer.id,
      name: layer.name,
      icon: <IconRipple size={14} color={'var(--mantine-color-blue-5)'} />,
      visible: !!layer.visible,
      isExpandable: true,
      onToggleVisibility: () => params.toggleLayerVisibility(layer.id),
      actions: [
        { id: 'add', label: 'Добавить водоём', icon: <IconPlus size={14} />, onClick: () => params.onAddBody(layer.id) },
        { id: 'rename', label: 'Переименовать', onClick: () => params.openEditLayerModal(layer) },
        ...(layer.id !== 'objects' ? [{ id: 'delete-layer', label: 'Удалить слой', color: 'red', icon: <IconTrash size={14} />, onClick: () => params.deleteLayer(layer.id) }] : []) as any,
      ],
      children,
    }
  })
}
