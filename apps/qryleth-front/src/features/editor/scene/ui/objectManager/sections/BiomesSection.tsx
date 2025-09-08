import React, { useMemo } from 'react'
import { IconTrees, IconTrash } from '@tabler/icons-react'
import type { TreeNodeBase } from '@/shared/ui/tree/types'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'

/**
 * Секция «Биомы» — плоский список биомов.
 * Принимает onDelete, чтобы внешняя логика могла удалить биом и связанные инстансы.
 */
export const useBiomeNodes = (params: { onDelete: (uuid: string) => void }): TreeNodeBase[] => {
  const biomes = useSceneStore(s => s.biomes)
  const updateBiome = useSceneStore(s => s.updateBiome)
  const objectInstances = useSceneStore(s => s.objectInstances)

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const inst of objectInstances) {
      if (inst.biomeUuid) m.set(inst.biomeUuid, (m.get(inst.biomeUuid) || 0) + 1)
    }
    return m
  }, [objectInstances])

  return (biomes || []).map(b => ({
    id: b.uuid,
    name: b.name || 'Без имени',
    icon: <IconTrees size={14} color={'var(--mantine-color-green-5)'} />,
    count: counts.get(b.uuid) || 0,
    visible: b.visible !== false,
    onToggleVisibility: () => updateBiome(b.uuid, { visible: b.visible === false ? true : !b.visible }),
    actions: [
      { id: 'delete', label: 'Удалить биом', color: 'red', icon: <IconTrash size={14} />, onClick: () => params.onDelete(b.uuid) }
    ]
  }))
}

