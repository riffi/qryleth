import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Group, NumberInput, Select, SegmentedControl, Stack, Switch, Tabs, Text, ColorInput, Divider, Accordion } from '@mantine/core'
import { useObjectStore } from '../../model/objectStore'
import type { CreateGfxMaterial } from '@/entities/material'
import { generateUUID } from '@/shared/lib/uuid'
import { generateEzTreeGeometry, TreeOptions, TreePreset } from '../../lib/generators/ezTree'
import { leafTextureRegistry, woodTextureRegistry } from '@/shared/lib/textures'

/**
 * Вспомогательная функция: извлекает из BufferGeometry массивы позиций/нормалей/индексов/uv.
 * Возвращает плоские массивы чисел для примитива типа 'mesh'.
 */
function extractGeometryArrays(geom: any): { positions: number[]; normals?: number[]; indices?: number[]; uvs?: number[] } {
  const pos = geom.getAttribute?.('position')
  const nor = geom.getAttribute?.('normal')
  const uv = geom.getAttribute?.('uv')
  const idx = geom.getIndex?.()
  return {
    positions: pos ? Array.from(pos.array as Float32Array) : [],
    normals: nor ? Array.from(nor.array as Float32Array) : undefined,
    indices: idx ? Array.from(idx.array as any) : undefined,
    uvs: uv ? Array.from(uv.array as Float32Array) : undefined,
  }
}

/**
 * Создаёт два материала по умолчанию: «Кора» и «Листья», совместимые с ObjectEditor.
 * Цвета можно переопределить из UI.
 */
function createDefaultMaterials(options?: { barkColor?: string; leafColor?: string }): CreateGfxMaterial[] {
  return [
    {
      name: 'Кора',
      type: 'dielectric',
      isGlobal: false,
      properties: {
        color: options?.barkColor ?? '#8B5A2B',
        roughness: 0.9,
        metalness: 0,
      }
    },
    {
      name: 'Листья',
      type: 'dielectric',
      isGlobal: false,
      properties: {
        color: options?.leafColor ?? '#2E8B57',
        roughness: 0.7,
        metalness: 0,
        // Поддержка роли палитры может быть добавлена позже через свойства colorSource
      }
    }
  ]
}

/**
 * Панель генерации деревьев ez-tree. Визуально согласована с текущей панелью TreeGeneratorPanel
 * (вкладки Ствол/Ветви/Листья), но управляет параметрами EzTree (TreeOptions) и создаёт два mesh-примитива:
 * ствол+ветви и листья.
 */
export const EzTreeGeneratorPanel: React.FC = () => {
  // Простые контролы, покрывающие основные параметры EzTree
  const [preset, setPreset] = useState<string | null>(null)
  const [seed, setSeed] = useState<number>(0)
  const [treeType, setTreeType] = useState<'deciduous' | 'evergreen'>('deciduous')

  // Параметры коры
  const [barkType, setBarkType] = useState<'birch' | 'oak' | 'pine' | 'willow'>('oak')
  const [barkColor, setBarkColor] = useState<string>('#8B5A2B')
  const [barkFlat, setBarkFlat] = useState<boolean>(false)
  const [barkTex, setBarkTex] = useState<boolean>(false)
  const [barkUvRepeatU, setBarkUvRepeatU] = useState<number>(1)
  const [barkUvRepeatV, setBarkUvRepeatV] = useState<number>(1)
  // Выбор набора коры/листьев из реестра проекта
  const [barkTextureSetId, setBarkTextureSetId] = useState<string>('bark014-1k-jpg')

  // Ветви (основные уровни и геометрия)
  const [levels, setLevels] = useState<number>(3)
  const [childrenL1, setChildrenL1] = useState<number>(7)
  const [childrenL2, setChildrenL2] = useState<number>(7)
  const [childrenL3, setChildrenL3] = useState<number>(5)
  const [angleL1, setAngleL1] = useState<number>(70)
  const [angleL2, setAngleL2] = useState<number>(60)
  const [angleL3, setAngleL3] = useState<number>(60)
  const [lengthL0, setLengthL0] = useState<number>(20)
  const [lengthL1, setLengthL1] = useState<number>(20)
  const [lengthL2, setLengthL2] = useState<number>(10)
  const [radiusL0, setRadiusL0] = useState<number>(1.5)
  const [radiusL1, setRadiusL1] = useState<number>(0.7)
  const [radiusL2, setRadiusL2] = useState<number>(0.7)
  const [sectionsL0, setSectionsL0] = useState<number>(12)
  const [segmentsL0, setSegmentsL0] = useState<number>(8)
  const [sectionsL1, setSectionsL1] = useState<number>(10)
  const [sectionsL2, setSectionsL2] = useState<number>(8)
  const [sectionsL3, setSectionsL3] = useState<number>(6)
  const [segmentsL1, setSegmentsL1] = useState<number>(6)
  const [segmentsL2, setSegmentsL2] = useState<number>(4)
  const [segmentsL3, setSegmentsL3] = useState<number>(3)
  // Доп. параметры ez-tree
  const [startL1, setStartL1] = useState<number>(0.4)
  const [startL2, setStartL2] = useState<number>(0.3)
  const [startL3, setStartL3] = useState<number>(0.3)
  const [taper0, setTaper0] = useState<number>(0.7)
  const [taper1, setTaper1] = useState<number>(0.7)
  const [taper2, setTaper2] = useState<number>(0.7)
  const [taper3, setTaper3] = useState<number>(0.7)
  const [gn0, setGn0] = useState<number>(0.15)
  const [gn1, setGn1] = useState<number>(0.2)
  const [gn2, setGn2] = useState<number>(0.3)
  const [gn3, setGn3] = useState<number>(0.02)
  const [tw0, setTw0] = useState<number>(0)
  const [tw1, setTw1] = useState<number>(0)
  const [tw2, setTw2] = useState<number>(0)
  const [tw3, setTw3] = useState<number>(0)
  const [forceX, setForceX] = useState<number>(0)
  const [forceY, setForceY] = useState<number>(1)
  const [forceZ, setForceZ] = useState<number>(0)
  const [forceS, setForceS] = useState<number>(0.01)

  // Листья
  const [leafType, setLeafType] = useState<'oak' | 'ash' | 'aspen' | 'pine'>('oak')
  const [leafBillboard, setLeafBillboard] = useState<'single' | 'double'>('double')
  const [leafAngle, setLeafAngle] = useState<number>(10)
  const [leafStart, setLeafStart] = useState<number>(0)
  const [leafCount, setLeafCount] = useState<number>(1)
  const [leafSize, setLeafSize] = useState<number>(2.5)
  const [leafSizeVar, setLeafSizeVar] = useState<number>(0.7)
  const [leafTint, setLeafTint] = useState<string>('#ffffff')
  const [leafAlphaTest, setLeafAlphaTest] = useState<number>(0.5)
  const [leafTextureSetId, setLeafTextureSetId] = useState<string>('leafset019-1k-jpg')
  // Режим полной совместимости ez-tree (шейдер листвы и тип материалов)
  const [ezTreeCompat, setEzTreeCompat] = useState<boolean>(true)
  // Параметры «ветра» для листьев (совместимый шейдер ez-tree)
  const [windStrengthX, setWindStrengthX] = useState<number>(0.5)
  const [windStrengthZ, setWindStrengthZ] = useState<number>(0.5)
  const [windFrequency, setWindFrequency] = useState<number>(0.5)
  const [windScale, setWindScale] = useState<number>(70)

  const { materials, addMaterial, updateMaterial, setPrimitives } = useObjectStore()

  const presetOptions = useMemo(() => Object.keys(TreePreset || {}).map(k => ({ value: k, label: k })), [])

  /**
   * Применяет JSON пресета ez-tree к UI-контролам панели.
   * Берутся только известные поля; остальные игнорируются.
   */
  const applyPresetToControls = (json: any) => {
    if (!json || typeof json !== 'object') return
    try {
      if (typeof json.seed === 'number') setSeed(json.seed)
      if (typeof json.type === 'string') setTreeType(json.type as any)
      const b = json.bark || {}
      if (typeof b.type === 'string') setBarkType(b.type)
      if (typeof b.flatShading === 'boolean') setBarkFlat(b.flatShading)
      if (typeof b.textured === 'boolean') setBarkTex(b.textured)
      // Маппинг ez-tree textureScale -> наши повторы UV (repeat)
      // В ez-tree: repeat.x = scale.x; repeat.y = 1/scale.y
      if (b.textureScale && typeof b.textureScale.x === 'number') setBarkUvRepeatU(b.textureScale.x)
      if (b.textureScale && typeof b.textureScale.y === 'number' && b.textureScale.y !== 0) setBarkUvRepeatV(1 / b.textureScale.y)
      const br = json.branch || {}
      if (typeof br.levels === 'number') setLevels(br.levels)
      const ang = br.angle || {}
      if (ang['1'] != null) setAngleL1(Number(ang['1']))
      if (ang['2'] != null) setAngleL2(Number(ang['2']))
      if (ang['3'] != null) setAngleL3(Number(ang['3']))
      const ch = br.children || {}
      if (ch['0'] != null) setChildrenL1(Number(ch['0']))
      if (ch['1'] != null) setChildrenL2(Number(ch['1']))
      if (ch['2'] != null) setChildrenL3(Number(ch['2']))
      const len = br.length || {}
      if (len['0'] != null) setLengthL0(Number(len['0']))
      if (len['1'] != null) setLengthL1(Number(len['1']))
      if (len['2'] != null) setLengthL2(Number(len['2']))
      const rad = br.radius || {}
      if (rad['0'] != null) setRadiusL0(Number(rad['0']))
      if (rad['1'] != null) setRadiusL1(Number(rad['1']))
      if (rad['2'] != null) setRadiusL2(Number(rad['2']))
      const sec = br.sections || {}
      if (sec['0'] != null) setSectionsL0(Number(sec['0']))
      if (sec['1'] != null) setSectionsL1(Number(sec['1']))
      if (sec['2'] != null) setSectionsL2(Number(sec['2']))
      if (sec['3'] != null) setSectionsL3(Number(sec['3']))
      const seg = br.segments || {}
      if (seg['0'] != null) setSegmentsL0(Number(seg['0']))
      if (seg['1'] != null) setSegmentsL1(Number(seg['1']))
      if (seg['2'] != null) setSegmentsL2(Number(seg['2']))
      if (seg['3'] != null) setSegmentsL3(Number(seg['3']))
      const st = br.start || {}
      if (st['1'] != null) setStartL1(Number(st['1']))
      if (st['2'] != null) setStartL2(Number(st['2']))
      if (st['3'] != null) setStartL3(Number(st['3']))
      const tp = br.taper || {}
      if (tp['0'] != null) setTaper0(Number(tp['0']))
      if (tp['1'] != null) setTaper1(Number(tp['1']))
      if (tp['2'] != null) setTaper2(Number(tp['2']))
      if (tp['3'] != null) setTaper3(Number(tp['3']))
      const gn = br.gnarliness || {}
      if (gn['0'] != null) setGn0(Number(gn['0']))
      if (gn['1'] != null) setGn1(Number(gn['1']))
      if (gn['2'] != null) setGn2(Number(gn['2']))
      if (gn['3'] != null) setGn3(Number(gn['3']))
      const tw = br.twist || {}
      if (tw['0'] != null) setTw0(Number(tw['0']))
      if (tw['1'] != null) setTw1(Number(tw['1']))
      if (tw['2'] != null) setTw2(Number(tw['2']))
      if (tw['3'] != null) setTw3(Number(tw['3']))
      const force = br.force || {}
      const dir = force.direction || {}
      if (dir.x != null) setForceX(Number(dir.x))
      if (dir.y != null) setForceY(Number(dir.y))
      if (dir.z != null) setForceZ(Number(dir.z))
      if (force.strength != null) setForceS(Number(force.strength))
      const lf = json.leaves || {}
      if (typeof lf.type === 'string') setLeafType(lf.type)
      if (typeof lf.billboard === 'string') setLeafBillboard(lf.billboard)
      if (lf.angle != null) setLeafAngle(Number(lf.angle))
      if (lf.count != null) setLeafCount(Number(lf.count))
      if (lf.start != null) setLeafStart(Number(lf.start))
      if (lf.size != null) setLeafSize(Number(lf.size))
      if (lf.sizeVariance != null) setLeafSizeVar(Number(lf.sizeVariance))
      if (lf.tint != null) setLeafTint('#' + Number(lf.tint).toString(16).padStart(6, '0'))
      if (lf.alphaTest != null) setLeafAlphaTest(Number(lf.alphaTest))
    } catch { /* ignore */ }
  }

  const [activeTab, setActiveTab] = useState<'trunk' | 'branches' | 'leaves'>('trunk')

  // Маппинг типа коры/листвы на наборы ez-tree для 100% совпадения
  useEffect(() => {
    if (!ezTreeCompat) return
    const map: Record<string, string> = {
      birch: 'ez-bark-birch', oak: 'ez-bark-oak', pine: 'ez-bark-pine', willow: 'ez-bark-willow'
    }
    const id = map[barkType]
    if (id && woodTextureRegistry.get(id)) setBarkTextureSetId(id)
  }, [barkType, ezTreeCompat])
  useEffect(() => {
    if (!ezTreeCompat) return
    const map: Record<string, string> = { oak: 'ez-leaf-oak', ash: 'ez-leaf-ash', aspen: 'ez-leaf-aspen', pine: 'ez-leaf-pine' }
    const id = map[leafType]
    if (id && leafTextureRegistry.get(id)) setLeafTextureSetId(id)
  }, [leafType, ezTreeCompat])

  const handleGenerate = () => {
    // Создаём/обновляем материалы «Кора» и «Листья»
    const existingBark = materials.find(m => m.name.toLowerCase() === 'кора')
    const existingLeaf = materials.find(m => m.name.toLowerCase() === 'листья')
    let barkUuid = existingBark?.uuid
    let leafUuid = existingLeaf?.uuid
    if (!barkUuid || !leafUuid) {
      const base = createDefaultMaterials({ barkColor, leafColor: leafTint })
      const newBarkUuid = addMaterial(base[0])
      const newLeafUuid = addMaterial(base[1])
      barkUuid = barkUuid || newBarkUuid
      leafUuid = leafUuid || newLeafUuid
    } else {
      updateMaterial(barkUuid, { properties: { ...(existingBark?.properties || {}), color: barkColor } } as any)
      updateMaterial(leafUuid, { properties: { ...(existingLeaf?.properties || {}), color: leafTint } } as any)
    }

    // Настраиваем локальные опции генератора ez-tree из контролов
    const opts = new TreeOptions()
    opts.seed = seed
    opts.type = treeType
    // ВАЖНО: сначала применяем пресет (если выбран), чтобы затем значения из UI его переопределили
    if (preset && TreePreset[preset]) {
      opts.copy(TreePreset[preset])
    }
    // Кора
    opts.bark.type = barkType
    opts.bark.tint = 0xffffff // базовый белый — используем цвет материала стора
    opts.bark.flatShading = barkFlat
    opts.bark.textured = barkTex
    opts.bark.textureScale = { x: 1, y: 1 }
    // Ветви
    opts.branch.levels = levels
    opts.branch.angle = { 1: angleL1, 2: angleL2, 3: angleL3 }
    opts.branch.children = { 0: childrenL1, 1: childrenL2, 2: childrenL3 }
    opts.branch.length = { 0: lengthL0, 1: lengthL1, 2: lengthL2, 3: 1 }
    opts.branch.radius = { 0: radiusL0, 1: radiusL1, 2: radiusL2, 3: radiusL2 }
    opts.branch.sections = { 0: sectionsL0, 1: sectionsL1, 2: sectionsL2, 3: sectionsL3 }
    opts.branch.segments = { 0: segmentsL0, 1: segmentsL1, 2: segmentsL2, 3: segmentsL3 }
    opts.branch.start = { 1: startL1, 2: startL2, 3: startL3 }
    opts.branch.taper = { 0: taper0, 1: taper1, 2: taper2, 3: taper3 }
    opts.branch.gnarliness = { 0: gn0, 1: gn1, 2: gn2, 3: gn3 }
    opts.branch.twist = { 0: tw0, 1: tw1, 2: tw2, 3: tw3 }
    opts.branch.force = { direction: { x: forceX, y: forceY, z: forceZ }, strength: forceS }
    // Листья
    opts.leaves.type = leafType
    opts.leaves.billboard = leafBillboard
    opts.leaves.angle = leafAngle
    opts.leaves.count = leafCount
    opts.leaves.start = leafStart
    opts.leaves.size = leafSize
    opts.leaves.sizeVariance = leafSizeVar
    opts.leaves.tint = parseInt(leafTint.replace('#','0x')) || 0xffffff
    opts.leaves.alphaTest = leafAlphaTest

    // (Пресет уже применён выше — здесь больше не копируем, чтобы не перетирать значения из UI)
    const ge = generateEzTreeGeometry(opts)
    const branches = { positions: ge.branches.positions, normals: ge.branches.normals, indices: ge.branches.indices, uvs: ge.branches.uvs }

    // Собираем два mesh-примитива
    const nextPrims = [
      {
        uuid: generateUUID(),
        type: 'mesh',
        name: 'ez-tree: ствол+ветви',
        geometry: branches as any,
        objectMaterialUuid: barkUuid,
        visible: true,
        transform: { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] }
      },
      // листья добавим ниже как примитивы 'leaf'
    ] as any

    // Сохраняем тип объекта и параметры процедурного дерева
    useObjectStore.getState().setObjectType('tree')
    // Сохраняем ПОЛНЫЙ набор опций (opts) в params, чтобы можно было пересоздавать листья без регенерации ствола
    const optsJson: any = JSON.parse(JSON.stringify(opts))
    useObjectStore.getState().setTreeData({
      params: {
        ...optsJson,
        // Доп. поля проекта (связывают наборы текстур и live‑параметры рендера)
        barkFlat,
        barkTextureSetId,
        barkUvRepeatU,
        barkUvRepeatV,
        leafTextureSetId,
        leafAlphaTest,
        ezTreeCompat,
        ezWindStrength: [windStrengthX, 0, windStrengthZ],
        ezWindFrequency: windFrequency,
        ezWindScale: windScale,
        // Запоминаем базовый размер листа для live‑скейла
        genLeafBaseSize: opts.leaves.size,
        leafSize: opts.leaves.size,
        leafTextureSpriteName: undefined,
      },
      barkMaterialUuid: barkUuid!,
      leafMaterialUuid: leafUuid!,
    })

    // Добавляем примитивы листьев как билборды: InstancedLeavesOE/ChunkedInstancedLeaves их подберут и подставят карты
    const leafPrims = ge.leafInstances.map(inst => ({
      uuid: generateUUID(),
      type: 'leaf',
      name: 'Лист',
      // В ez-tree геометрия листа квадратная W=L=size. В нашем билборде radius интерпретируется как высота (sy),
      // поэтому для полного соответствия используем radius = size (без деления на 2).
      geometry: { radius: Math.max(0.01, inst.size), shape: 'texture' },
      objectMaterialUuid: leafUuid,
      visible: true,
      transform: { position: inst.position as any, rotation: inst.orientation as any, scale: [1,1,1] },
    }))

    // Режим замены: очищаем и вставляем только новое дерево
    setPrimitives([nextPrims[0], ...leafPrims] as any)
  }

  // Все изменения параметров применяются только по кнопке "Сгенерировать" (без live‑апдейтов)

  return (
    <Stack p="sm" gap="sm" style={{ height: '100%', overflow: 'auto' }}>
      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">Генерация деревьев по алгоритму ez-tree (геометрия)</Text>
        <Switch label="Совместимость ez-tree" checked={ezTreeCompat} onChange={(e)=>setEzTreeCompat(e.currentTarget.checked)} />
      </Group>

      <Tabs value={activeTab} onChange={(v) => setActiveTab((v as any) || 'trunk')}>
        <Tabs.List>
          <Tabs.Tab value="trunk">Ствол</Tabs.Tab>
          <Tabs.Tab value="branches">Ветви</Tabs.Tab>
          <Tabs.Tab value="leaves">Листья</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="trunk" pt="sm">
          <Group grow>
            <NumberInput label="Seed" value={seed} onChange={(v) => setSeed(Math.floor(Number(v) || 0))} step={1} />
            <Select
              label="Preset"
              placeholder="Не выбран"
              data={presetOptions}
              value={preset}
              onChange={(v) => {
                setPreset(v)
                if (v && TreePreset[v]) applyPresetToControls(TreePreset[v])
              }}
              clearable
            />
          </Group>
          <SegmentedControl fullWidth data={[{label:'Лиственное', value:'deciduous'},{label:'Хвойное', value:'evergreen'}]} value={treeType} onChange={(v)=>setTreeType(v as any)} mt="sm" />
          <Group grow mt="sm">
            <Select label="Тип коры" data={[{value:'birch',label:'Берёза'},{value:'oak',label:'Дуб'},{value:'pine',label:'Сосна'},{value:'willow',label:'Ива'}]} value={barkType} onChange={(v)=>setBarkType((v as any)||'oak')} />
            <ColorInput label="Цвет коры" value={barkColor} onChange={setBarkColor} format="hex" />
          </Group>
          <Group mt="xs">
            <Switch label="Плоское освещение" checked={barkFlat} onChange={(e)=>setBarkFlat(e.currentTarget.checked)} />
            <Switch label="Текстура коры (ez-tree)" checked={barkTex} onChange={(e)=>setBarkTex(e.currentTarget.checked)} />
          </Group>
          <Group grow mt="xs">
            <Text size="sm" c="dimmed">Ветер листвы (совместимый шейдер ez-tree)</Text>
          </Group>
          <Group grow>
            <NumberInput label="Сила X" value={windStrengthX} onChange={(v)=>setWindStrengthX(Number(v)||0)} step={0.05} />
            <NumberInput label="Сила Z" value={windStrengthZ} onChange={(v)=>setWindStrengthZ(Number(v)||0)} step={0.05} />
            <NumberInput label="Частота" value={windFrequency} onChange={(v)=>setWindFrequency(Math.max(0, Number(v)||0))} min={0} step={0.05} />
            <NumberInput label="Шкала" value={windScale} onChange={(v)=>setWindScale(Math.max(1, Math.round(Number(v)||1)))} min={1} step={1} />
          </Group>
          <Group grow mt="xs">
            <Select
              label="Набор коры"
              data={woodTextureRegistry.list().map(s => ({ value: s.id, label: s.name }))}
              value={barkTextureSetId}
              onChange={(v) => setBarkTextureSetId(v || 'bark014-1k-jpg')}
            />
            <NumberInput label="Повтор U" value={barkUvRepeatU} onChange={(v)=>setBarkUvRepeatU(Math.max(0.05, Number(v)||1))} min={0.05} step={0.1} />
            <NumberInput label="Повтор V" value={barkUvRepeatV} onChange={(v)=>setBarkUvRepeatV(Math.max(0.05, Number(v)||1))} min={0.05} step={0.1} />
          </Group>
        </Tabs.Panel>

        <Tabs.Panel value="branches" pt="sm">
          <Group grow>
            <NumberInput label="Уровни" value={levels} onChange={(v)=>setLevels(Math.max(0, Math.round(Number(v)||0)))} min={0} step={1} />
            <NumberInput label="Секции L0" value={sectionsL0} onChange={(v)=>setSectionsL0(Math.max(1, Math.round(Number(v)||1)))} min={1} step={1} />
            <NumberInput label="Сегменты L0" value={segmentsL0} onChange={(v)=>setSegmentsL0(Math.max(3, Math.round(Number(v)||3)))} min={3} step={1} />
          </Group>
          <Group grow mt="xs">
            <NumberInput label="Секции L1" value={sectionsL1} onChange={(v)=>setSectionsL1(Math.max(1, Math.round(Number(v)||1)))} min={1} step={1} />
            <NumberInput label="Сегменты L1" value={segmentsL1} onChange={(v)=>setSegmentsL1(Math.max(3, Math.round(Number(v)||3)))} min={3} step={1} />
          </Group>
          <Group grow mt="xs">
            <NumberInput label="Секции L2" value={sectionsL2} onChange={(v)=>setSectionsL2(Math.max(1, Math.round(Number(v)||1)))} min={1} step={1} />
            <NumberInput label="Сегменты L2" value={segmentsL2} onChange={(v)=>setSegmentsL2(Math.max(3, Math.round(Number(v)||3)))} min={3} step={1} />
          </Group>
          <Group grow mt="xs">
            <NumberInput label="Секции L3" value={sectionsL3} onChange={(v)=>setSectionsL3(Math.max(1, Math.round(Number(v)||1)))} min={1} step={1} />
            <NumberInput label="Сегменты L3" value={segmentsL3} onChange={(v)=>setSegmentsL3(Math.max(3, Math.round(Number(v)||3)))} min={3} step={1} />
          </Group>
          <Group grow mt="xs">
            <NumberInput label="Длина L0" value={lengthL0} onChange={(v)=>setLengthL0(Math.max(1, Number(v)||1))} min={1} />
            <NumberInput label="Радиус L0" value={radiusL0} onChange={(v)=>setRadiusL0(Math.max(0.01, Number(v)||0.01))} min={0.01} step={0.01} />
          </Group>
          <Group grow mt="xs">
            <NumberInput label="Длина L1" value={lengthL1} onChange={(v)=>setLengthL1(Math.max(0.1, Number(v)||0.1))} min={0.1} />
            <NumberInput label="Радиус L1" value={radiusL1} onChange={(v)=>setRadiusL1(Math.max(0.01, Number(v)||0.01))} min={0.01} step={0.01} />
          </Group>
          <Group grow mt="xs">
            <NumberInput label="Длина L2" value={lengthL2} onChange={(v)=>setLengthL2(Math.max(0.1, Number(v)||0.1))} min={0.1} />
            <NumberInput label="Радиус L2" value={radiusL2} onChange={(v)=>setRadiusL2(Math.max(0.01, Number(v)||0.01))} min={0.01} step={0.01} />
          </Group>
          <Group grow mt="xs">
            <NumberInput label="Детей L0" value={childrenL1} onChange={(v)=>setChildrenL1(Math.max(0, Math.round(Number(v)||0)))} min={0} step={1} />
            <NumberInput label="Детей L1" value={childrenL2} onChange={(v)=>setChildrenL2(Math.max(0, Math.round(Number(v)||0)))} min={0} step={1} />
            <NumberInput label="Детей L2" value={childrenL3} onChange={(v)=>setChildrenL3(Math.max(0, Math.round(Number(v)||0)))} min={0} step={1} />
          </Group>
          <Group grow mt="xs">
            <NumberInput label="Угол L1 (°)" value={angleL1} onChange={(v)=>setAngleL1(Math.max(0, Math.min(85, Number(v)||0)))} min={0} max={85} />
            <NumberInput label="Угол L2 (°)" value={angleL2} onChange={(v)=>setAngleL2(Math.max(0, Math.min(85, Number(v)||0)))} min={0} max={85} />
            <NumberInput label="Угол L3 (°)" value={angleL3} onChange={(v)=>setAngleL3(Math.max(0, Math.min(85, Number(v)||0)))} min={0} max={85} />
          </Group>
          <Divider label="Старт дочерних (доля длины)" my="xs" />
          <Group grow>
            <NumberInput label="Start L1" value={startL1} onChange={(v)=>setStartL1(Math.max(0, Math.min(1, Number(v)||0)))} min={0} max={1} step={0.01} />
            <NumberInput label="Start L2" value={startL2} onChange={(v)=>setStartL2(Math.max(0, Math.min(1, Number(v)||0)))} min={0} max={1} step={0.01} />
            <NumberInput label="Start L3" value={startL3} onChange={(v)=>setStartL3(Math.max(0, Math.min(1, Number(v)||0)))} min={0} max={1} step={0.01} />
          </Group>
          <Accordion variant="contained" mt="sm">
            <Accordion.Item value="adv">
              <Accordion.Control>Дополнительно (сужение/кручение/кривизна/сила роста)</Accordion.Control>
              <Accordion.Panel>
                <Text size="sm" c="dimmed">Сужение (taper) по уровням</Text>
                <Group grow>
                  <NumberInput label="Taper L0" value={taper0} onChange={(v)=>setTaper0(Math.max(0, Math.min(1, Number(v)||0.7)))} min={0} max={1} step={0.01} />
                  <NumberInput label="Taper L1" value={taper1} onChange={(v)=>setTaper1(Math.max(0, Math.min(1, Number(v)||0.7)))} min={0} max={1} step={0.01} />
                  <NumberInput label="Taper L2" value={taper2} onChange={(v)=>setTaper2(Math.max(0, Math.min(1, Number(v)||0.7)))} min={0} max={1} step={0.01} />
                  <NumberInput label="Taper L3" value={taper3} onChange={(v)=>setTaper3(Math.max(0, Math.min(1, Number(v)||0.7)))} min={0} max={1} step={0.01} />
                </Group>
                <Text size="sm" c="dimmed" mt="xs">Кручение (twist, радианы) по уровням</Text>
                <Group grow>
                  <NumberInput label="Twist L0" value={tw0} onChange={(v)=>setTw0(Number(v)||0)} step={0.01} />
                  <NumberInput label="Twist L1" value={tw1} onChange={(v)=>setTw1(Number(v)||0)} step={0.01} />
                  <NumberInput label="Twist L2" value={tw2} onChange={(v)=>setTw2(Number(v)||0)} step={0.01} />
                  <NumberInput label="Twist L3" value={tw3} onChange={(v)=>setTw3(Number(v)||0)} step={0.01} />
                </Group>
                <Text size="sm" c="dimmed" mt="xs">Кривизна (gnarliness) по уровням</Text>
                <Group grow>
                  <NumberInput label="Gn L0" value={gn0} onChange={(v)=>setGn0(Math.max(0, Number(v)||0))} min={0} step={0.01} />
                  <NumberInput label="Gn L1" value={gn1} onChange={(v)=>setGn1(Math.max(0, Number(v)||0))} min={0} step={0.01} />
                  <NumberInput label="Gn L2" value={gn2} onChange={(v)=>setGn2(Math.max(0, Number(v)||0))} min={0} step={0.01} />
                  <NumberInput label="Gn L3" value={gn3} onChange={(v)=>setGn3(Math.max(0, Number(v)||0))} min={0} step={0.01} />
                </Group>
                <Text size="sm" c="dimmed" mt="xs">Сила роста (force)</Text>
                <Group grow>
                  <NumberInput label="Fx" value={forceX} onChange={(v)=>setForceX(Number(v)||0)} step={0.01} />
                  <NumberInput label="Fy" value={forceY} onChange={(v)=>setForceY(Number(v)||0)} step={0.01} />
                  <NumberInput label="Fz" value={forceZ} onChange={(v)=>setForceZ(Number(v)||0)} step={0.01} />
                  <NumberInput label="Strength" value={forceS} onChange={(v)=>setForceS(Math.max(0, Number(v)||0))} min={0} step={0.001} />
                </Group>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Tabs.Panel>

        <Tabs.Panel value="leaves" pt="sm">
          <Group grow>
            <Select label="Тип листьев" data={[{value:'oak',label:'Дуб'},{value:'ash',label:'Ясень'},{value:'aspen',label:'Осина'},{value:'pine',label:'Сосна'}]} value={leafType} onChange={(v)=>setLeafType((v as any)||'oak')} />
            <SegmentedControl fullWidth data={[{label:'Single', value:'single'},{label:'Double', value:'double'}]} value={leafBillboard} onChange={(v)=>setLeafBillboard(v as any)} />
          </Group>
          <Group grow mt="xs">
            <NumberInput label="Количество" value={leafCount} onChange={(v)=>setLeafCount(Math.max(0, Math.round(Number(v)||0)))} min={0} step={1} />
            <NumberInput label="Угол (°)" value={leafAngle} onChange={(v)=>setLeafAngle(Math.max(0, Math.min(90, Number(v)||0)))} min={0} max={90} />
          </Group>
          <Group grow mt="xs">
            <NumberInput label="Старт вдоль ветви" value={leafStart} onChange={(v)=>setLeafStart(Math.max(0, Math.min(1, Number(v)||0)))} min={0} max={1} step={0.01} />
          </Group>
          <Group grow mt="xs">
            <NumberInput label="Размер" value={leafSize} onChange={(v)=>setLeafSize(Math.max(0.1, Number(v)||0.1))} min={0.1} step={0.1} />
            <NumberInput label="Разброс размера" value={leafSizeVar} onChange={(v)=>setLeafSizeVar(Math.max(0, Math.min(1, Number(v)||0)))} min={0} max={1} step={0.01} />
          </Group>
          <Group grow mt="xs">
            <ColorInput label="Цвет листвы" value={leafTint} onChange={setLeafTint} format="hex" />
            <NumberInput label="AlphaTest" value={leafAlphaTest} onChange={(v)=>setLeafAlphaTest(Math.max(0, Math.min(1, Number(v)||0)))} min={0} max={1} step={0.01} />
          </Group>
          <Group grow mt="xs">
            <Select
              label="Набор листвы"
              data={leafTextureRegistry.list().map(s => ({ value: s.id, label: s.name }))}
              value={leafTextureSetId}
              onChange={(v) => setLeafTextureSetId(v || 'leafset019-1k-jpg')}
            />
          </Group>
        </Tabs.Panel>
      </Tabs>

      <Group justify="space-between" mt="md">
        <Box />
        <Button variant="filled" color="green" onClick={handleGenerate}>Сгенерировать ez-tree</Button>
      </Group>
    </Stack>
  )
}

export default EzTreeGeneratorPanel
