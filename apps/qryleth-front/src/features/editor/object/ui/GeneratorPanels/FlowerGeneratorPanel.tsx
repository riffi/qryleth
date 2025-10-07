import React, { useEffect, useState } from 'react'
import { Box, Button, ColorInput, Group, NumberInput, Select, Stack, Switch, Text, ActionIcon, Tooltip } from '@mantine/core'
import { useObjectStore } from '../../model/objectStore'
import { createDefaultFlowerMaterials, generateFlower } from '../../lib/generators/flower/generateFlower'
import type { FlowerGeneratorParams } from '../../lib/generators/flower/types'
import { IconDice5 } from '@tabler/icons-react'

/**
 * Панель процедурной генерации цветов (пучок стеблей и головок).
 * Настраиваемые цвета: листья, стебли, сферы, лепестки. Детерминированный seed с кнопкой переброса.
 */
export const FlowerGeneratorPanel: React.FC = () => {
  const [params, setParams] = useState<FlowerGeneratorParams>({
    seed: 12345,
    stems: 5,
    stemHeight: 0.8,
    stemHeightJitter: 0.3,
    stemRadius: 0.01,
    stemSegments: 10,
    stemBend: 0.5,
    stemBaseSpread: 0.08,

    leaves: 10,
    leafLength: 0.25,
    leafHalfWidth: 0.02,
    leafTaper: 0.85,
    leafBend: 0.5,

    headType: 'daisy',
    headRadius: 0.07,
    petals: 12,
    petalLength: 0.12,
    petalHalfWidth: 0.015,
    petalTaper: 0.9,
    petalBend: 0.35,

    bellSpheres: 4,
    hydrangeaSpheres: 24,
  })

  const [leavesColor, setLeavesColor] = useState('#2e8b57')
  const [stemColor, setStemColor] = useState('#3a9d5d')
  const [sphereColor, setSphereColor] = useState('#ffd27a')
  const [petalColor, setPetalColor] = useState('#ffffff')
  const [clearBefore, setClearBefore] = useState(true)

  const {
    addMaterial,
    setPrimitives,
    materials,
    primitives,
    setObjectType,
  } = useObjectStore()

  const objectTypeStore = useObjectStore(s => s.objectType)
  const flowerDataStore = useObjectStore(s => (s as any).flowerData)

  useEffect(() => {
    if (objectTypeStore !== 'flower' || !flowerDataStore?.params) return
    setParams(prev => ({ ...prev, ...(flowerDataStore.params as any) }))
    // Восстанавливаем цвета из материалов по UUID
    const leavesMat = materials.find(m => m.uuid === flowerDataStore.leavesMaterialUuid) || materials.find(m => m.name.toLowerCase() === 'листья')
    const stemMat = materials.find(m => m.uuid === flowerDataStore.stemMaterialUuid) || materials.find(m => m.name.toLowerCase() === 'стебли')
    const sphereMat = materials.find(m => m.uuid === flowerDataStore.sphereMaterialUuid) || materials.find(m => m.name.toLowerCase() === 'цветочные сферы')
    const petalMat = materials.find(m => m.uuid === flowerDataStore.petalMaterialUuid) || materials.find(m => m.name.toLowerCase() === 'лепестки')
    if (leavesMat?.properties?.color) setLeavesColor(String(leavesMat.properties.color))
    if (stemMat?.properties?.color) setStemColor(String(stemMat.properties.color))
    if (sphereMat?.properties?.color) setSphereColor(String(sphereMat.properties.color))
    if (petalMat?.properties?.color) setPetalColor(String(petalMat.properties.color))
  }, [objectTypeStore, flowerDataStore, materials])

  /**
   * Генерация цветка: создаём/обновляем 4 материала и генерируем примитивы.
   * Сохраняем параметры генератора в store для корректного сохранения и предпросмотра.
   */
  const handleGenerate = () => {
    // Утилита: найти материал по имени и вернуть UUID (если существует)
    const getOrCreate = (name: string, make: () => string): string => {
      const existing = materials.find(m => m.name.toLowerCase() === name.toLowerCase())
      return existing?.uuid || make()
    }

    // Создаём дефолтные материалы, если их ещё нет, иначе обновляем цвета
    let leavesUuid = ''
    let stemUuid = ''
    let sphereUuid = ''
    let petalUuid = ''

    const defaults = createDefaultFlowerMaterials({ leavesColor, stemColor, sphereColor, petalColor })
    leavesUuid = getOrCreate('Листья', () => addMaterial(defaults[0]))
    stemUuid = getOrCreate('Стебли', () => addMaterial(defaults[1]))
    sphereUuid = getOrCreate('Цветочные сферы', () => addMaterial(defaults[2]))
    petalUuid = getOrCreate('Лепестки', () => addMaterial(defaults[3]))

    // Обновляем цвета, если материалы существовали
    const leavesExisting = materials.find(m => m.uuid === leavesUuid)
    const stemExisting = materials.find(m => m.uuid === stemUuid)
    const sphereExisting = materials.find(m => m.uuid === sphereUuid)
    const petalExisting = materials.find(m => m.uuid === petalUuid)
    // Мержим свойства, чтобы не потерять флаги (например, side)
    // Листья: принудительно двусторонние (DoubleSide)
    useObjectStore.getState().updateMaterial(leavesUuid, { properties: { ...(leavesExisting?.properties || {}), color: leavesColor, side: 'double' } } as any)
    useObjectStore.getState().updateMaterial(stemUuid,   { properties: { ...(stemExisting?.properties || {}), color: stemColor } } as any)
    useObjectStore.getState().updateMaterial(sphereUuid, { properties: { ...(sphereExisting?.properties || {}), color: sphereColor } } as any)
    // Лепестки: принудительно двусторонние (DoubleSide)
    useObjectStore.getState().updateMaterial(petalUuid,  { properties: { ...(petalExisting?.properties || {}), color: petalColor, side: 'double' } } as any)

    // Генерация примитивов
    const newPrims = generateFlower({
      ...params,
      leavesMaterialUuid: leavesUuid,
      stemMaterialUuid: stemUuid,
      sphereMaterialUuid: sphereUuid,
      petalMaterialUuid: petalUuid,
    })
    const list = clearBefore ? newPrims : [...primitives, ...newPrims]
    setPrimitives(list as any)

    // Сохраняем тип объекта и параметры генератора
    setObjectType('flower' as any)
    ;(useObjectStore.getState() as any).setFlowerData?.({
      params: { ...params },
      leavesMaterialUuid: leavesUuid,
      stemMaterialUuid: stemUuid,
      sphereMaterialUuid: sphereUuid,
      petalMaterialUuid: petalUuid,
    })
  }

  const reroll = () => setParams(p => ({ ...p, seed: Math.floor(Math.random() * 2 ** 31) }))

  return (
    <Stack gap="sm" p="sm" style={{ height: '100%', overflow: 'auto' }}>
      <Group justify="space-between" align="center">
        <Text fw={600}>Генератор цветов</Text>
        <Tooltip label="Перебросить seed">
          <ActionIcon variant="subtle" onClick={reroll}><IconDice5 size={16} /></ActionIcon>
        </Tooltip>
      </Group>

      <Group grow>
        <NumberInput label="Seed" value={params.seed} onChange={(v) => setParams(p => ({ ...p, seed: Math.floor(Number(v) || 0) }))} step={1} />
        <NumberInput label="Стеблей" value={params.stems} onChange={(v) => setParams(p => ({ ...p, stems: Math.max(1, Math.floor(Number(v) || 0)) }))} min={1} step={1} />
      </Group>
      <Group grow>
        <NumberInput label="Высота стебля" value={params.stemHeight} onChange={(v) => setParams(p => ({ ...p, stemHeight: Math.max(0.1, Number(v) || 0) }))} min={0.1} step={0.01} />
        <NumberInput label="Разброс высоты" value={params.stemHeightJitter} onChange={(v) => setParams(p => ({ ...p, stemHeightJitter: Math.max(0, Math.min(1, Number(v) || 0)) }))} min={0} max={1} step={0.01} />
      </Group>
      <Group grow>
        <NumberInput label="Радиус стебля" value={params.stemRadius} onChange={(v) => setParams(p => ({ ...p, stemRadius: Math.max(0.001, Number(v) || 0) }))} min={0.001} step={0.001} />
        <NumberInput label="Сегментов стебля" value={params.stemSegments} onChange={(v) => setParams(p => ({ ...p, stemSegments: Math.max(4, Math.floor(Number(v) || 0)) }))} min={4} step={1} />
      </Group>
      <Group grow>
        <NumberInput label="Изгиб стебля" value={params.stemBend} onChange={(v) => setParams(p => ({ ...p, stemBend: Math.max(0, Math.min(1, Number(v) || 0)) }))} min={0} max={1} step={0.01} />
        <NumberInput label="Разброс корней (XZ)" value={params.stemBaseSpread} onChange={(v) => setParams(p => ({ ...p, stemBaseSpread: Math.max(0, Number(v) || 0) }))} min={0} step={0.01} />
      </Group>

      <Group grow>
        <NumberInput label="Листьев" value={params.leaves} onChange={(v) => setParams(p => ({ ...p, leaves: Math.max(0, Math.floor(Number(v) || 0)) }))} min={0} step={1} />
        <NumberInput label="Длина листа" value={params.leafLength} onChange={(v) => setParams(p => ({ ...p, leafLength: Math.max(0.02, Number(v) || 0) }))} min={0.02} step={0.01} />
      </Group>
      <Group grow>
        <NumberInput label="Полуширина листа" value={params.leafHalfWidth} onChange={(v) => setParams(p => ({ ...p, leafHalfWidth: Math.max(0.001, Number(v) || 0) }))} min={0.001} step={0.001} />
        <NumberInput label="Сужение листа" value={params.leafTaper} onChange={(v) => setParams(p => ({ ...p, leafTaper: Math.max(0, Math.min(1, Number(v) || 0)) }))} min={0} max={1} step={0.01} />
      </Group>
      <Group grow>
        <NumberInput label="Изгиб листа" value={params.leafBend} onChange={(v) => setParams(p => ({ ...p, leafBend: Math.max(0, Math.min(1, Number(v) || 0)) }))} min={0} max={1} step={0.01} />
      </Group>

      <Group grow>
        <Select label="Тип соцветия" value={params.headType} onChange={(v) => setParams(p => ({ ...p, headType: (v as any) || 'daisy' }))}
          data={[{ value: 'daisy', label: 'Ромашка' }, { value: 'bell', label: 'Колокольчик' }, { value: 'hydrangea', label: 'Гортензия' }]} />
        <NumberInput label="Радиус головки" value={params.headRadius} onChange={(v) => setParams(p => ({ ...p, headRadius: Math.max(0.01, Number(v) || 0) }))} min={0.01} step={0.01} />
      </Group>
      {params.headType !== 'hydrangea' && (
        <>
          <Group grow>
            <NumberInput label="Лепестков" value={params.petals} onChange={(v) => setParams(p => ({ ...p, petals: Math.max(0, Math.floor(Number(v) || 0)) }))} min={0} step={1} />
            <NumberInput label="Длина лепестка" value={params.petalLength} onChange={(v) => setParams(p => ({ ...p, petalLength: Math.max(0.02, Number(v) || 0) }))} min={0.02} step={0.01} />
          </Group>
          <Group grow>
            <NumberInput label="Полуширина лепестка" value={params.petalHalfWidth} onChange={(v) => setParams(p => ({ ...p, petalHalfWidth: Math.max(0.001, Number(v) || 0) }))} min={0.001} step={0.001} />
            <NumberInput label="Сужение лепестка" value={params.petalTaper} onChange={(v) => setParams(p => ({ ...p, petalTaper: Math.max(0, Math.min(1, Number(v) || 0)) }))} min={0} max={1} step={0.01} />
          </Group>
          <Group grow>
            <NumberInput label="Изгиб лепестка" value={params.petalBend} onChange={(v) => setParams(p => ({ ...p, petalBend: Math.max(0, Math.min(1, Number(v) || 0)) }))} min={0} max={1} step={0.01} />
          </Group>
        </>
      )}
      {params.headType === 'bell' && (
        <Group grow>
          <NumberInput label="Шаров в колокольчике" value={params.bellSpheres} onChange={(v) => setParams(p => ({ ...p, bellSpheres: Math.max(1, Math.floor(Number(v) || 0)) }))} min={1} step={1} />
        </Group>
      )}
      {params.headType === 'hydrangea' && (
        <Group grow>
          <NumberInput label="Шаров в гортензии" value={params.hydrangeaSpheres} onChange={(v) => setParams(p => ({ ...p, hydrangeaSpheres: Math.max(4, Math.floor(Number(v) || 0)) }))} min={4} step={1} />
        </Group>
      )}

      <Group grow>
        <ColorInput label="Цвет листьев" value={leavesColor} onChange={setLeavesColor} format="hex" disallowInput />
        <ColorInput label="Цвет стеблей" value={stemColor} onChange={setStemColor} format="hex" disallowInput />
      </Group>
      <Group grow>
        <ColorInput label="Цвет сфер" value={sphereColor} onChange={setSphereColor} format="hex" disallowInput />
        <ColorInput label="Цвет лепестков" value={petalColor} onChange={setPetalColor} format="hex" disallowInput />
      </Group>

      <Group justify="space-between">
        <Switch label="Очистить перед генерацией" checked={clearBefore} onChange={(e) => setClearBefore(e.currentTarget.checked)} />
        <Button onClick={handleGenerate}>Сгенерировать</Button>
      </Group>
      <Box>
        <Text size="sm" c="dimmed">Стебли — трубки по CatmullRomCurve; листья/лепестки — ленты. Seed детерминированный.</Text>
      </Box>
    </Stack>
  )
}

export default FlowerGeneratorPanel
