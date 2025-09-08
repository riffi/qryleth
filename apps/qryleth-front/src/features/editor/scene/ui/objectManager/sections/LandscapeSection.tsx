import React from 'react'
import { IconMountain, IconSquare } from '@tabler/icons-react'
import type { TreeNodeBase } from '@/shared/ui/tree/types'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'

/**
 * Секция «Ландшафт»: один псевдо‑слой → дочерние площадки.
 */
export const useLandscapeNodes = (params: { onEdit: (id: string) => void }): TreeNodeBase[] => {
  const landscape = useSceneStore(s => s.landscapeContent)
  const updateLandscapeItem = useSceneStore(s => s.updateLandscapeItem)
  const removeLandscapeItem = useSceneStore(s => s.removeLandscapeItem)

  return (landscape?.items || []).map(item => ({
    id: item.id,
    name: item.name || 'Без имени',
    icon: item.shape === 'terrain'
      ? <IconMountain size={12} color={'var(--mantine-color-green-5)'} />
      : <IconSquare size={12} color={'var(--mantine-color-green-5)'} />,
    visible: item.visible !== false,
    // Важно: вычисляем новое значение видимости по актуальному состоянию стора,
    // а не по замкнутому значению из текущего рендера, чтобы избежать рассинхронизации.
    onToggleVisibility: () => {
      const current = useSceneStore.getState().landscapeContent?.items.find(i => i.id === item.id)
      const nextVisible = !(current?.visible !== false)
      updateLandscapeItem(item.id, { visible: nextVisible } as any)
    },
    actions: [
      { id: 'edit', label: 'Редактировать', onClick: () => params.onEdit(item.id) },
      { id: 'delete', label: 'Удалить', color: 'red', onClick: () => removeLandscapeItem(item.id) },
    ]
  }))
}
