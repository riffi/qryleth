import React, { useState } from 'react'
import { ActionIcon, Collapse, Group, NumberInput, Stack, Switch, Text, Tooltip, Divider } from '@mantine/core'
import { IconChevronDown, IconChevronRight, IconTrees } from '@tabler/icons-react'
import { useSceneStore } from '../../model/sceneStore'

/**
 * Панель управления LOD деревьев в SceneEditor.
 *
 * Назначение:
 * - Переключение включения/выключения LOD (все деревья всегда в near при выключенном);
 * - Управление экранами порогов LOD в пикселях (nearInPx/nearOutPx/farInPx/farOutPx);
 * - Настройка размеров чанков для агрегаторов инстансов листвы и стволов.
 */
export const TreeLodControls: React.FC = () => {
  const lod = useSceneStore(s => s.lodConfig)
  const setLodEnabled = useSceneStore(s => s.setLodEnabled)
  const setLodChunkSizes = useSceneStore(s => s.setLodChunkSizes)
  const setTreeLodThresholds = useSceneStore(s => s.setTreeLodThresholds)
  const [expanded, setExpanded] = useState(false)

  // Локальные поля ввода: применяем в стор только по blur/Enter
  const [leafChunkSizeEdit, setLeafChunkSizeEdit] = useState<number | ''>(lod.leafChunkSize)
  const [trunkChunkSizeEdit, setTrunkChunkSizeEdit] = useState<number | ''>(lod.trunkChunkSize)
  const [nearInPxEdit, setNearInPxEdit] = useState<number | ''>(lod.nearInPx)
  const [nearOutPxEdit, setNearOutPxEdit] = useState<number | ''>(lod.nearOutPx)
  const [farInPxEdit, setFarInPxEdit] = useState<number | ''>(lod.farInPx)
  const [farOutPxEdit, setFarOutPxEdit] = useState<number | ''>(lod.farOutPx)

  // Синхронизация, если значения пришли извне (например, при загрузке сцены)
  React.useEffect(() => { setLeafChunkSizeEdit(lod.leafChunkSize) }, [lod.leafChunkSize])
  React.useEffect(() => { setTrunkChunkSizeEdit(lod.trunkChunkSize) }, [lod.trunkChunkSize])
  React.useEffect(() => { setNearInPxEdit(lod.nearInPx) }, [lod.nearInPx])
  React.useEffect(() => { setNearOutPxEdit(lod.nearOutPx) }, [lod.nearOutPx])
  React.useEffect(() => { setFarInPxEdit(lod.farInPx) }, [lod.farInPx])
  React.useEffect(() => { setFarOutPxEdit(lod.farOutPx) }, [lod.farOutPx])

  /**
   * Переключает глобальный флаг LOD.
   * При выключении все деревья рендерятся в ближнем LOD, переходы и билборды отключаются.
   */
  const handleToggleEnabled = (v: boolean) => {
    setLodEnabled(!!v)
  }

  // Коммиты значений в стор — только по blur/Enter
  const commitLeafChunkSize = () => {
    const v = Number(leafChunkSizeEdit)
    const next = Number.isFinite(v) ? Math.max(4, v) : lod.leafChunkSize
    if (next !== lod.leafChunkSize) setLodChunkSizes({ leafChunkSize: next })
  }
  const commitTrunkChunkSize = () => {
    const v = Number(trunkChunkSizeEdit)
    const next = Number.isFinite(v) ? Math.max(4, v) : lod.trunkChunkSize
    if (next !== lod.trunkChunkSize) setLodChunkSizes({ trunkChunkSize: next })
  }
  const commitNearInPx = () => {
    const v = Number(nearInPxEdit)
    const next = Number.isFinite(v) ? Math.max(1, v) : lod.nearInPx
    if (next !== lod.nearInPx) setTreeLodThresholds({ nearInPx: next })
  }
  const commitNearOutPx = () => {
    const v = Number(nearOutPxEdit)
    const next = Number.isFinite(v) ? Math.max(1, v) : lod.nearOutPx
    if (next !== lod.nearOutPx) setTreeLodThresholds({ nearOutPx: next })
  }
  const commitFarInPx = () => {
    const v = Number(farInPxEdit)
    const next = Number.isFinite(v) ? Math.max(1, v) : lod.farInPx
    if (next !== lod.farInPx) setTreeLodThresholds({ farInPx: next })
  }
  const commitFarOutPx = () => {
    const v = Number(farOutPxEdit)
    const next = Number.isFinite(v) ? Math.max(1, v) : lod.farOutPx
    if (next !== lod.farOutPx) setTreeLodThresholds({ farOutPx: next })
  }

  return (
    <>
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setExpanded(v => !v)}>
            {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </ActionIcon>
          <IconTrees size={16} color="var(--mantine-color-green-6)" />
          <Text size="xs" fw={500} c="dimmed">LOD деревьев</Text>
        </Group>
        <Tooltip label={lod.enabled ? 'Отключить LOD' : 'Включить LOD'} withArrow>
          <Switch size="xs" checked={!!lod.enabled} onChange={(e) => handleToggleEnabled(e.currentTarget.checked)} />
        </Tooltip>
      </Group>

      <Collapse in={expanded}>
        <Stack gap="xs" ml="md" mt="xs">
          <Text size="xs" fw={500}>Размеры чанков</Text>
          <Group gap="xs">
            <NumberInput
              size="xs"
              label="Листья, м"
              value={leafChunkSizeEdit}
              onChange={v => setLeafChunkSizeEdit(v as any)}
              onBlur={commitLeafChunkSize}
              onKeyDown={(e) => { if (e.key === 'Enter') { (e.currentTarget as any).blur() } }}
              min={4}
              max={1000}
              step={4}
              style={{ width: 140 }}
            />
            <NumberInput
              size="xs"
              label="Стволы, м"
              value={trunkChunkSizeEdit}
              onChange={v => setTrunkChunkSizeEdit(v as any)}
              onBlur={commitTrunkChunkSize}
              onKeyDown={(e) => { if (e.key === 'Enter') { (e.currentTarget as any).blur() } }}
              min={4}
              max={512}
              step={4}
              style={{ width: 140 }}
            />
          </Group>

          <Divider my={4} />

          <Text size="xs" fw={500}>Пороги LOD (px по высоте кроны)</Text>
          <Group gap="xs">
            <NumberInput
              size="xs"
              label="nearInPx"
              value={nearInPxEdit}
              onChange={v => setNearInPxEdit(v as any)}
              onBlur={commitNearInPx}
              onKeyDown={(e) => { if (e.key === 'Enter') { (e.currentTarget as any).blur() } }}
              min={1}
              max={4000}
              step={5}
              style={{ width: 130 }}
            />
            <NumberInput
              size="xs"
              label="nearOutPx"
              value={nearOutPxEdit}
              onChange={v => setNearOutPxEdit(v as any)}
              onBlur={commitNearOutPx}
              onKeyDown={(e) => { if (e.key === 'Enter') { (e.currentTarget as any).blur() } }}
              min={1}
              max={4000}
              step={5}
              style={{ width: 130 }}
            />
            <NumberInput
              size="xs"
              label="farInPx"
              value={farInPxEdit}
              onChange={v => setFarInPxEdit(v as any)}
              onBlur={commitFarInPx}
              onKeyDown={(e) => { if (e.key === 'Enter') { (e.currentTarget as any).blur() } }}
              min={1}
              max={4000}
              step={5}
              style={{ width: 130 }}
            />
            <NumberInput
              size="xs"
              label="farOutPx"
              value={farOutPxEdit}
              onChange={v => setFarOutPxEdit(v as any)}
              onBlur={commitFarOutPx}
              onKeyDown={(e) => { if (e.key === 'Enter') { (e.currentTarget as any).blur() } }}
              min={1}
              max={4000}
              step={5}
              style={{ width: 130 }}
            />
          </Group>
          <Text size="xs" c="dimmed">
            Рекомендация: nearInPx &gt; nearOutPx ≥ farInPx &gt; farOutPx, окна ~30–40px.
          </Text>
        </Stack>
      </Collapse>

      <Divider />
    </>
  )
}

export default TreeLodControls
