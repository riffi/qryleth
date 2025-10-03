import React from 'react'
import { ActionIcon, Group, Switch, Text, Tooltip, Divider } from '@mantine/core'
import { IconChevronDown, IconChevronRight, IconLeaf } from '@tabler/icons-react'
import { useSceneStore } from '../../model/sceneStore'

/**
 * Панель управления LOD травы в SceneEditor.
 *
 * Назначение:
 * - Переключение включения/выключения LOD для травы (двухуровневый Near/Far);
 * - При выключении все пучки травы рендерятся как «near» (полные геометрии),
 *   упрощённые LOD-плоскости (billboard LOD2) отключаются.
 *
 * По аналогии с панелью LOD деревьев, содержит только заголовок и переключатель.
 */
export const GrassLodControls: React.FC = () => {
  const grassLod = useSceneStore(s => s.grassLodConfig)
  const setGrassLodEnabled = useSceneStore(s => s.setGrassLodEnabled)
  const [expanded, setExpanded] = React.useState(false)

  /**
   * Переключает глобальный флаг LOD травы.
   *
   * Детали работы:
   * - При enabled=false хук разделения usePartitionGrassByLod переводит все
   *   инстансы травы в near-ветку, а far-ветка становится пустой;
   * - В результате на сцене остаётся только «полная» геометрия травы (ChunkedInstancedGrass),
   *   а сегмент LOD2 (ChunkedGrassLod2) не создаёт ни одного чанка.
   */
  const handleToggleEnabled = (v: boolean) => {
    setGrassLodEnabled(!!v)
  }

  return (
    <>
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setExpanded(v => !v)}>
            {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </ActionIcon>
          <IconLeaf size={16} color="var(--mantine-color-lime-6)" />
          <Text size="xs" fw={500} c="dimmed">LOD травы</Text>
        </Group>
        <Tooltip label={grassLod.enabled ? 'Отключить LOD' : 'Включить LOD'} withArrow>
          <Switch size="xs" checked={!!grassLod.enabled} onChange={(e) => handleToggleEnabled(e.currentTarget.checked)} />
        </Tooltip>
      </Group>
      <Divider />
    </>
  )
}

export default GrassLodControls
