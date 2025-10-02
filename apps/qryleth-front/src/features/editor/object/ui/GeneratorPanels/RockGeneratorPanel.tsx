import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Group, NumberInput, Select, Stack, Switch, Text, ColorInput } from '@mantine/core'
import { useObjectStore } from '../../model/objectStore'
import { createDefaultRockMaterials, generateRock } from '../../lib/generators/rock/generateRock'
import type { RockGeneratorParams, RockRecipeId } from '../../lib/generators/rock/types'
import { rockTextureRegistry, initializeRockTextures } from '@/shared/lib/textures'

/**
 * Панель процедурной генерации камней для Object Editor.
 * Пользователь задаёт размеры, разрешение, рецепт и базовые макро‑деформации,
 * затем нажимает «Сгенерировать». Результат — единый mesh без текстур
 * с однотонным материалом «Камень» (совместим с палитрой через tint при необходимости).
 */
export const RockGeneratorPanel: React.FC = () => {
  const [params, setParams] = useState<RockGeneratorParams>({
    seed: 12345,
    size: [1.2, 0.9, 1.0],
    resolution: 28,
    recipe: 'boulder',
    macro: {
      baseBlend: 0.45,
      smoothK: 0.12,
      taper: 0.0,
      twist: 0.0,
      bend: 0.0,
      piecesCount: 1,
      piecesSpread: 0.0,
      piecesScaleJitter: 0.0,
      piecesSmoothK: 0.12,
      piecesOp: 'union',
    }
  })
  const [rockColor, setRockColor] = useState('#9f9f9f')
  const [clearBefore, setClearBefore] = useState(true)

  const {
    addMaterial,
    setPrimitives,
    materials,
    primitives,
    setObjectType,
    setRockData,
  } = useObjectStore()

  // Инициализация из стора, если редактируется объект‑камень
  const objectTypeStore = useObjectStore(s => s.objectType)
  const rockDataStore = useObjectStore(s => (s as any).rockData)
  useEffect(() => {
    if (objectTypeStore !== 'rock' || !rockDataStore?.params) return
    setParams(prev => ({ ...prev, ...(rockDataStore.params as any) }))
    const mat = materials.find(m => m.uuid === rockDataStore.rockMaterialUuid) || materials.find(m => m.name.toLowerCase() === 'камень')
    if (mat?.properties?.color) setRockColor(String(mat.properties.color))
  }, [objectTypeStore, rockDataStore, materials])

  /**
   * Генерация камня и добавление его в текущий объект.
   * 1) Создаём/обновляем материал «Камень».
   * 2) Генерируем единый меш и присваиваем UUID материала.
   * 3) Заменяем объект или добавляем к нему примитив — в зависимости от флага «Очистить перед генерацией».
   */
  const handleGenerate = () => {
    // Пытаемся найти уже существующий материал по имени
    const existing = materials.find(m => m.name.toLowerCase() === 'камень')
    let rockUuid = existing?.uuid
    if (!rockUuid) {
      const base = createDefaultRockMaterials({ color: rockColor })[0]
      rockUuid = addMaterial(base)
    } else {
      // Обновляем цвет существующего материала
      useObjectStore.getState().updateMaterial(rockUuid, {
        properties: { ...(existing?.properties || {}), color: rockColor }
      } as any)
    }
    // Генерируем примитивы
    const newPrims = generateRock({ ...params, rockMaterialUuid: rockUuid! })
    const list = clearBefore ? newPrims : [...primitives, ...newPrims]
    setPrimitives(list as any)
    // Устанавливаем тип объекта и параметры генератора камня
    setObjectType('rock')
    setRockData({ params: { ...params }, rockMaterialUuid: rockUuid! } as any)
  }

  const recipeOptions = [
    { value: 'boulder', label: 'Валун' },
    { value: 'slate', label: 'Сланец' },
    { value: 'porous', label: 'Пористый' },
  ]

  // Текстурные наборы камня из реестра
  if (rockTextureRegistry.size === 0) { try { initializeRockTextures() } catch {} }
  const rockSets = useMemo(() => rockTextureRegistry.list().map(s => ({ value: s.id, label: s.name })), [])
  const selectedRockSet = params.rockTextureSetId || (rockSets[0]?.value)
  useEffect(() => {
    if (!params.rockTextureSetId && rockSets[0]?.value) {
      setParams(p => ({ ...p, rockTextureSetId: rockSets[0]!.value, rockUvRepeatU: p.rockUvRepeatU ?? 1, rockUvRepeatV: p.rockUvRepeatV ?? 1 }))
    }
  }, [rockSets.length])

  return (
    <Stack gap="sm" p="sm">
      <Text fw={600}>Генератор камня</Text>
      <Group grow>
        <NumberInput label="Seed" value={params.seed} onChange={(v) => setParams(p => ({ ...p, seed: Math.floor(Number(v) || 0) }))} step={1}/>
        <Select label="Рецепт" data={recipeOptions} value={params.recipe} onChange={(v) => setParams(p => ({ ...p, recipe: (v as RockRecipeId) || 'boulder' }))} />
      </Group>
      <Group grow>
        <NumberInput label="Ширина X" value={params.size[0]} onChange={(v) => setParams(p => ({ ...p, size: [Math.max(0.1, Number(v) || 0.1), p.size[1], p.size[2]] }))} min={0.1} step={0.05}/>
        <NumberInput label="Высота Y" value={params.size[1]} onChange={(v) => setParams(p => ({ ...p, size: [p.size[0], Math.max(0.1, Number(v) || 0.1), p.size[2]] }))} min={0.1} step={0.05}/>
        <NumberInput label="Глубина Z" value={params.size[2]} onChange={(v) => setParams(p => ({ ...p, size: [p.size[0], p.size[1], Math.max(0.1, Number(v) || 0.1)] }))} min={0.1} step={0.05}/>
      </Group>
      <Group grow>
        <NumberInput label="Сегментов (marching cubes)" value={params.resolution} onChange={(v) => setParams(p => ({ ...p, resolution: Math.max(12, Math.min(128, Math.floor(Number(v) || 12))) }))} min={12} max={128} step={1}/>
        <ColorInput label="Цвет" value={rockColor} onChange={setRockColor} format="hex" disallowInput/>
      </Group>
      <Group grow>
        <Select label="Набор текстур" value={selectedRockSet} data={rockSets} onChange={(v) => setParams(p => ({ ...p, rockTextureSetId: v || undefined }))} />
        <NumberInput label="UV repeat U" value={params.rockUvRepeatU ?? 1} onChange={(v) => setParams(p => ({ ...p, rockUvRepeatU: Math.max(0.05, Number(v) || 1) }))} min={0.05} step={0.05}/>
        <NumberInput label="UV repeat V" value={params.rockUvRepeatV ?? 1} onChange={(v) => setParams(p => ({ ...p, rockUvRepeatV: Math.max(0.05, Number(v) || 1) }))} min={0.05} step={0.05}/>
      </Group>
      <Group grow>
        <Switch
          label="Трипланарное текстурирование"
          checked={!!params.rockTriplanar}
          onChange={(e) => setParams(p => ({ ...p, rockTriplanar: (e && e.currentTarget ? e.currentTarget.checked : !p.rockTriplanar) }))}
        />
        <NumberInput label="Масштаб трипланара" value={params.rockTexScale ?? 3} onChange={(v) => setParams(p => ({ ...p, rockTexScale: Math.max(0.1, Number(v) || 3) }))} min={0.1} step={0.1} disabled={!params.rockTriplanar}/>
      </Group>
      <Group grow>
        <NumberInput label="Смесь сфера/бокс" value={params.macro?.baseBlend ?? 0.45} onChange={(v) => setParams(p => ({ ...p, macro: { ...(p.macro||{}), baseBlend: Math.max(0, Math.min(1, Number(v) || 0)) } }))} min={0} max={1} step={0.01}/>
        <NumberInput label="Сглаживание K" value={params.macro?.smoothK ?? 0.12} onChange={(v) => setParams(p => ({ ...p, macro: { ...(p.macro||{}), smoothK: Math.max(0, Number(v) || 0) } }))} min={0} step={0.01}/>
      </Group>
      <Group grow>
        <NumberInput label="Taper" value={params.macro?.taper ?? 0} onChange={(v) => setParams(p => ({ ...p, macro: { ...(p.macro||{}), taper: Number(v) || 0 } }))} step={0.01}/>
        <NumberInput label="Twist" value={params.macro?.twist ?? 0} onChange={(v) => setParams(p => ({ ...p, macro: { ...(p.macro||{}), twist: Number(v) || 0 } }))} step={0.01}/>
        <NumberInput label="Bend" value={params.macro?.bend ?? 0} onChange={(v) => setParams(p => ({ ...p, macro: { ...(p.macro||{}), bend: Number(v) || 0 } }))} step={0.01}/>
      </Group>
      <Group grow>
        <NumberInput label="Кусочков" value={params.macro?.piecesCount ?? 1} onChange={(v) => setParams(p => ({ ...p, macro: { ...(p.macro||{}), piecesCount: Math.max(1, Math.floor(Number(v) || 1)) } }))} min={1} step={1}/>
        <NumberInput label="Разброс" value={params.macro?.piecesSpread ?? 0} onChange={(v) => setParams(p => ({ ...p, macro: { ...(p.macro||{}), piecesSpread: Math.max(0, Number(v) || 0) } }))} min={0} step={0.01}/>
        <NumberInput label="Джиттер масштаба" value={params.macro?.piecesScaleJitter ?? 0} onChange={(v) => setParams(p => ({ ...p, macro: { ...(p.macro||{}), piecesScaleJitter: Math.max(0, Number(v) || 0) } }))} min={0} step={0.01}/>
      </Group>
      <Group justify="space-between">
        <Switch label="Очистить перед генерацией" checked={clearBefore} onChange={(e) => setClearBefore(e.currentTarget.checked)} />
        <Button onClick={handleGenerate}>Сгенерировать</Button>
      </Group>
      <Box>
        <Text size="sm" c="dimmed">Создаёт единый mesh (sdf + marching cubes); материал односторонний.</Text>
      </Box>
    </Stack>
  )
}

export default RockGeneratorPanel
