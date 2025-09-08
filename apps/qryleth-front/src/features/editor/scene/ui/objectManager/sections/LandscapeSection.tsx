import React from 'react'
import { IconMountain, IconPlus } from '@tabler/icons-react'
import type { TreeNodeBase } from '@/shared/ui/tree/types'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'

/**
 * Секция «Ландшафт»: один псевдо‑слой → дочерние площадки.
 */
export const useLandscapeNodes = (params: { onAdd: () => void; onEdit: (id: string) => void }): TreeNodeBase[] => {
  const landscape = useSceneStore(s => s.landscapeContent)
  const updateLandscapeItem = useSceneStore(s => s.updateLandscapeItem)
  const removeLandscapeItem = useSceneStore(s => s.removeLandscapeItem)

  const root: TreeNodeBase = {
    id: 'landscape-content',
    name: 'Ландшафт',
    icon: <IconMountain size={14} color={'var(--mantine-color-green-5)'} />,
    isExpandable: true,
    actions: [
      { id: 'add', label: 'Добавить площадку', icon: <IconPlus size={14} />, onClick: () => params.onAdd() },
    ],
    children: (landscape?.items || []).map(item => ({
      id: item.id,
      name: item.name || 'Без имени',
      visible: item.visible !== false,
      onToggleVisibility: () => updateLandscapeItem(item.id, { visible: !(item.visible !== false) } as any),
      actions: [
        { id: 'edit', label: 'Редактировать', onClick: () => params.onEdit(item.id) },
        { id: 'delete', label: 'Удалить', color: 'red', onClick: () => removeLandscapeItem(item.id) },
      ]
    }))
  }
  return [root]
}
