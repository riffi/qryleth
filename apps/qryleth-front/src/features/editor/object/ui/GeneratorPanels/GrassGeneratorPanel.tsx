import React, { useEffect, useState } from 'react'
import { Box, Button, ColorInput, Group, NumberInput, Stack, Switch, Text } from '@mantine/core'
import { useObjectStore } from '../../model/objectStore'
import { createDefaultGrassMaterials, generateGrass } from '../../lib/generators/grass/generateGrass'
import type { GrassGeneratorParams } from '../../lib/generators/grass/types'

/**
 * Панель процедурной генерации травы для Object Editor.
 * Пользователь настраивает пучок плоских клинков и нажимает «Сгенерировать».
 * Результат — единый mesh без текстур с однотонным материалом.
 */
export const GrassGeneratorPanel: React.FC = () => {
  // Параметры генерации с начальными значениями
  const [params, setParams] = useState<GrassGeneratorParams>({
    seed: 12345,
    blades: 40,
    bladeHeight: 0.6,
    bladeHeightJitter: 0.35,
    bladeHalfWidth: 0.01,
    bladeTaper: 1,
    bendStrength: 0.5,
    segments: 6,
    clumpRadius: 0.12,
    lod2Offset: 0.02,
  })
  const [grassColor, setGrassColor] = useState('#2E8B57')
  const [clearBefore, setClearBefore] = useState(true)

  const {
    addMaterial,
    setMaterials,
    setPrimitives,
    materials,
    primitives,
    setObjectType,
    setGrassData,
  } = useObjectStore()

  // Инициализация из стора, если редактируется объект-трава
  const objectTypeStore = useObjectStore(s => s.objectType)
  const grassDataStore = useObjectStore(s => s.grassData)
  useEffect(() => {
    if (objectTypeStore !== 'grass' || !grassDataStore?.params) return
    setParams(prev => ({ ...prev, ...(grassDataStore.params as any) }))
    const mat = materials.find(m => m.uuid === grassDataStore.grassMaterialUuid) || materials.find(m => m.name.toLowerCase() === 'трава')
    if (mat?.properties?.color) setGrassColor(String(mat.properties.color))
  }, [objectTypeStore, grassDataStore, materials])

  /**
   * Генерация травы и добавление её в текущий объект.
   * 1) Создаём/обновляем материал «Трава».
   * 2) Генерируем единый меш и присваиваем UUID материала.
   * 3) Заменяем объект или добавляем к нему примитив — в зависимости от флага «Очистить перед генерацией».
   */
  const handleGenerate = () => {
    // Пытаемся найти уже существующий материал по имени
    const existing = materials.find(m => m.name.toLowerCase() === 'трава')
    let grassUuid = existing?.uuid
    if (!grassUuid) {
      const base = createDefaultGrassMaterials({ color: grassColor })[0]
      grassUuid = addMaterial(base)
    } else {
      // Обновляем цвет существующего материала
      useObjectStore.getState().updateMaterial(grassUuid, {
        properties: { ...(existing?.properties || {}), color: grassColor }
      } as any)
    }
    // Генерируем примитивы
    const newPrims = generateGrass({ ...params, grassMaterialUuid: grassUuid! })
    const list = clearBefore ? newPrims : [...primitives, ...newPrims]
    setPrimitives(list as any)
    // Устанавливаем тип объекта и параметры генератора травы
    setObjectType('grass')
    setGrassData({ params: { ...params }, grassMaterialUuid: grassUuid! })
  }

  return (
    <Stack gap="sm" p="sm">
      <Text fw={600}>Генератор травы</Text>
      <Group grow>
        <NumberInput label="Seed" value={params.seed} onChange={(v) => setParams(p => ({ ...p, seed: Math.floor(Number(v) || 0) }))} step={1}/>
        <NumberInput label="Клинков" value={params.blades} onChange={(v) => setParams(p => ({ ...p, blades: Math.max(1, Math.floor(Number(v) || 0)) }))} min={1} step={1}/>
      </Group>
      <Group grow>
        <NumberInput label="Высота" value={params.bladeHeight} onChange={(v) => setParams(p => ({ ...p, bladeHeight: Math.max(0.05, Number(v) || 0) }))} min={0.05} step={0.01}/>
        <NumberInput label="Разброс высоты" value={params.bladeHeightJitter} onChange={(v) => setParams(p => ({ ...p, bladeHeightJitter: Math.max(0, Math.min(1, Number(v) || 0)) }))} min={0} max={1} step={0.01}/>
      </Group>
      <Group grow>
        <NumberInput label="Половина ширины" value={params.bladeHalfWidth} onChange={(v) => setParams(p => ({ ...p, bladeHalfWidth: Math.max(0.001, Number(v) || 0) }))} min={0.001} step={0.001}/>
        <NumberInput label="Сужение" value={params.bladeTaper} onChange={(v) => setParams(p => ({ ...p, bladeTaper: Math.max(0, Math.min(1, Number(v) || 0)) }))} min={0} max={1} step={0.01}/>
      </Group>
      <Group grow>
        <NumberInput label="Изгиб" value={params.bendStrength} onChange={(v) => setParams(p => ({ ...p, bendStrength: Math.max(0, Math.min(1, Number(v) || 0)) }))} min={0} max={1} step={0.01}/>
        <NumberInput label="Сегментов" value={params.segments} onChange={(v) => setParams(p => ({ ...p, segments: Math.max(2, Math.floor(Number(v) || 0)) }))} min={2} step={1}/>
      </Group>
      <Group grow>
        <NumberInput label="LOD2 offset" value={params.lod2Offset} onChange={(v) => setParams(p => ({ ...p, lod2Offset: Math.max(0, Number(v) || 0) }))} min={0} step={0.001} precision={3}/>
      </Group>
      <Group grow>
        <NumberInput label="Радиус пучка" value={params.clumpRadius} onChange={(v) => setParams(p => ({ ...p, clumpRadius: Math.max(0, Number(v) || 0) }))} min={0} step={0.01}/>
        <ColorInput label="Цвет" value={grassColor} onChange={setGrassColor} format="hex" disallowInput/>
      </Group>
      <Group justify="space-between">
        <Switch label="Очистить перед генерацией" checked={clearBefore} onChange={(e) => setClearBefore(e.currentTarget.checked)} />
        <Button onClick={handleGenerate}>Сгенерировать</Button>
      </Group>
      <Box>
        <Text size="sm" c="dimmed">Создаёт единый mesh без текстур; материал двусторонний.</Text>
      </Box>
    </Stack>
  )
}

export default GrassGeneratorPanel

