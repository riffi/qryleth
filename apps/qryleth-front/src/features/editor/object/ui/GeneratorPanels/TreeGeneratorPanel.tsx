import React, { useMemo, useState } from 'react'
import { Box, Button, Group, NumberInput, Stack, Switch, Text, ColorInput, Divider, SegmentedControl, Slider } from '@mantine/core'
import { useObjectStore } from '../../model/objectStore'
import { createDefaultTreeMaterials, generateTree } from '../../lib/generators/tree/generateTree'
import type { TreeGeneratorParams } from '../../lib/generators/tree/types'

/**
 * Панель процедурной генерации деревьев для Object Editor.
 * Пользователь настраивает параметры, после нажатия «Сгенерировать» в объект
 * добавляются примитивы ствола/ветвей/листвы и автоматически создаются
 * два материала: «Кора» и «Листья».
 */
export const TreeGeneratorPanel: React.FC = () => {
  // Параметры генерации с начальными значениями
  const [params, setParams] = useState<TreeGeneratorParams>({
    seed: 12345,
    trunkHeight: 5,
    trunkRadius: 0.25,
    trunkSegments: 6,
    trunkTaperFactor: 0.4,
    trunkBranchLevels: 0,
    trunkBranchesPerLevel: 2,
    trunkBranchAngleDeg: 20,
    trunkBranchChildHeightFactor: 0.7,
    branchLevels: 2,
    branchesPerSegment: 2,
    branchLength: 1.4,
    branchRadius: 0.08,
    branchAngleDeg: 35,
    randomness: 0.3,
    leavesPerBranch: 3,
    leafSize: 0.16,
    leafShape: 'billboard',
    angleSpread: 1,
    embedFactor: 1
  })

  // Параметры материалов
  const [barkColor, setBarkColor] = useState('#8B5A2B')
  const [leafColor, setLeafColor] = useState('#2E8B57')
  const [clearBefore, setClearBefore] = useState(true)

  const {
    addMaterial,
    setMaterials,
    setPrimitives,
    primitives,
    materials,
  } = useObjectStore()

  /**
   * Генерация дерева и добавление его в текущий объект.
   * 1) Создаём материалы «Кора» и «Листья» (или используем существующие с такими именами, если найдены).
   * 2) Генерируем набор примитивов и присваиваем им UUID материалов объекта.
   * 3) Заменяем объект или добавляем к нему примитивы — в зависимости от флага «Очистить перед генерацией».
   */
  const handleGenerate = () => {
    // Пытаемся найти уже существующие материалы по имени, чтобы не плодить дубликаты
    const existingBark = materials.find(m => m.name.toLowerCase() === 'кора')
    const existingLeaf = materials.find(m => m.name.toLowerCase() === 'листья')

    let barkUuid = existingBark?.uuid
    let leafUuid = existingLeaf?.uuid

    if (!barkUuid || !leafUuid) {
      const base = createDefaultTreeMaterials({ barkColor, leafColor })
      // Если один из материалов отсутствует — создаём оба для консистентности
      const newBarkUuid = addMaterial(base[0])
      const newLeafUuid = addMaterial(base[1])
      barkUuid = barkUuid || newBarkUuid
      leafUuid = leafUuid || newLeafUuid
    }

    const generated = generateTree({ ...params, barkMaterialUuid: barkUuid!, leafMaterialUuid: leafUuid! })
    if (clearBefore) {
      setPrimitives(generated)
    } else {
      setPrimitives([...primitives, ...generated])
    }
  }

  // Готовые контролы сгруппированы по секциям
  return (
    <Box p="sm" style={{ height: '100%', overflow: 'auto' }}>
      <Stack gap="sm">
        <Group justify="space-between"><Text fw={600}>Генератор дерева</Text><Switch label="Очистить перед генерацией" checked={clearBefore} onChange={(e) => setClearBefore(e.currentTarget.checked)} /></Group>

        <Divider label="Случайность" />
        <Group grow>
          <NumberInput label="Seed" value={params.seed} onChange={(v) => setParams(p => ({ ...p, seed: Number(v) || 0 }))} step={1} clampBehavior="strict"/>
          <NumberInput label="Случайность" value={params.randomness} onChange={(v) => setParams(p => ({ ...p, randomness: Math.max(0, Math.min(1, Number(v) || 0)) }))} step={0.05} min={0} max={1}/>
        </Group>

        <Divider label="Ствол" />
        <Group grow>
          <NumberInput label="Высота" value={params.trunkHeight} onChange={(v) => setParams(p => ({ ...p, trunkHeight: Math.max(0.5, Number(v) || 0) }))} min={0.5} step={0.1}/>
          <NumberInput label="Радиус" value={params.trunkRadius} onChange={(v) => setParams(p => ({ ...p, trunkRadius: Math.max(0.02, Number(v) || 0) }))} min={0.02} step={0.02}/>
          <NumberInput label="Сегменты" value={params.trunkSegments} onChange={(v) => setParams(p => ({ ...p, trunkSegments: Math.max(1, Math.round(Number(v) || 1)) }))} min={1} step={1}/>
        </Group>
        <Box>
          <Text size="sm" mb={4}>Сужение ствола к верху</Text>
          <Slider
            value={params.trunkTaperFactor ?? 0.4}
            onChange={(v) => setParams(p => ({ ...p, trunkTaperFactor: Array.isArray(v) ? v[0] : v }))}
            min={0}
            max={0.9}
            step={0.01}
            marks={[{ value: 0, label: '0' }, { value: 0.4, label: '0.4' }, { value: 0.8, label: '0.8' }]}
          />
        </Box>

        <Divider label="Разветвление ствола" />
        <Group grow>
          <NumberInput
            label="Уровни"
            value={params.trunkBranchLevels ?? 0}
            onChange={(v) => setParams(p => ({ ...p, trunkBranchLevels: Math.max(0, Math.round(Number(v) || 0)) }))}
            min={0}
            step={1}
          />
          <NumberInput
            label="Ответвлений/уровень"
            value={params.trunkBranchesPerLevel ?? 2}
            onChange={(v) => setParams(p => ({ ...p, trunkBranchesPerLevel: Math.max(1, Math.round(Number(v) || 1)) }))}
            min={1}
            step={1}
          />
          <NumberInput
            label="Угол (°)"
            value={params.trunkBranchAngleDeg ?? 20}
            onChange={(v) => setParams(p => ({ ...p, trunkBranchAngleDeg: Math.max(0, Math.min(85, Number(v) || 0)) }))}
            min={0}
            max={85}
            step={1}
          />
        </Group>
        <Group grow>
          <Box>
            <Text size="sm" mb={4}>Высота доч. ствола</Text>
            <Slider
              value={params.trunkBranchChildHeightFactor ?? 0.7}
              onChange={(v) => setParams(p => ({ ...p, trunkBranchChildHeightFactor: Array.isArray(v) ? v[0] : v }))}
              min={0.3}
              max={0.95}
              step={0.01}
              marks={[{ value: 0.3, label: '0.3' }, { value: 0.7, label: '0.7' }, { value: 0.9, label: '0.9' }]}
            />
          </Box>
        </Group>

        <Divider label="Ветви" />
        <Group grow>
          <NumberInput label="Уровни" value={params.branchLevels} onChange={(v) => setParams(p => ({ ...p, branchLevels: Math.max(0, Math.round(Number(v) || 0)) }))} min={0} step={1}/>
          <NumberInput label="Ветвей/сегмент" value={params.branchesPerSegment} onChange={(v) => setParams(p => ({ ...p, branchesPerSegment: Math.max(0, Number(v) || 0) }))} min={0} step={1}/>
          <NumberInput label="Длина ветви" value={params.branchLength} onChange={(v) => setParams(p => ({ ...p, branchLength: Math.max(0.2, Number(v) || 0) }))} min={0.2} step={0.1}/>
        </Group>
        <Group grow>
          <NumberInput label="Радиус ветви" value={params.branchRadius} onChange={(v) => setParams(p => ({ ...p, branchRadius: Math.max(0.01, Number(v) || 0) }))} min={0.01} step={0.01}/>
          <NumberInput label="Угол (°)" value={params.branchAngleDeg} onChange={(v) => setParams(p => ({ ...p, branchAngleDeg: Math.max(0, Math.min(85, Number(v) || 0)) }))} min={0} max={85} step={1}/>
        </Group>
        <Box>
          <Text size="sm" mb={4}>Разброс наклона ветви</Text>
          <Slider
            value={params.angleSpread ?? 1}
            onChange={(v) => setParams(p => ({ ...p, angleSpread: Array.isArray(v) ? v[0] : v }))}
            min={0}
            max={1}
            step={0.05}
            marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }]}
          />
        </Box>

        <Divider label="Листья" />
        <Group grow>
          <NumberInput label="Листьев/ветка" value={params.leavesPerBranch} onChange={(v) => setParams(p => ({ ...p, leavesPerBranch: Math.max(0, Math.round(Number(v) || 0)) }))} min={0} step={1}/>
          <NumberInput label="Размер листа" value={params.leafSize} onChange={(v) => setParams(p => ({ ...p, leafSize: Math.max(0.01, Number(v) || 0) }))} min={0.01} step={0.01}/>
        </Group>
        <SegmentedControl
          value={params.leafShape || 'billboard'}
          onChange={(v) => setParams(p => ({ ...p, leafShape: (v as 'billboard'|'sphere') }))}
          data={[
            { label: 'Билборды', value: 'billboard' },
            { label: 'Сферы', value: 'sphere' },
          ]}
        />

        <Divider label="Материалы" />
        <Group grow>
          <ColorInput label="Цвет коры" value={barkColor} onChange={setBarkColor} format="hex" withEyeDropper/>
          <ColorInput label="Цвет листвы" value={leafColor} onChange={setLeafColor} format="hex" withEyeDropper/>
        </Group>

        <Group justify="flex-end" mt="sm">
          <Button onClick={handleGenerate}>Сгенерировать</Button>
        </Group>
      </Stack>
    </Box>
  )
}

export default TreeGeneratorPanel
