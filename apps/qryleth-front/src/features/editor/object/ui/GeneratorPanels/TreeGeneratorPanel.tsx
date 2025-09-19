import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Group, NumberInput, Stack, Switch, Text, ColorInput, Divider, SegmentedControl, Slider, Modal, Textarea, Select, Tabs, ActionIcon, Tooltip } from '@mantine/core'
import { IconTrees, IconGitBranch, IconLeaf, IconDice5, IconArrowUp, IconArrowDown, IconMinus } from '@tabler/icons-react'
import classes from './TreeGeneratorPanel.module.css'
import { useObjectStore } from '../../model/objectStore'
import { createDefaultTreeMaterials, generateTree } from '../../lib/generators/tree/generateTree'
import { leafTextureRegistry, woodTextureRegistry } from '@/shared/lib/textures'
import { useSetBarkTextureSetId } from '../../model/barkTexturePreviewStore'
import { useObjectDebugFlags } from '../../model/debugFlagsStore'
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
    trunkShearStrength: 0,
    trunkBranchLevels: 0,
    trunkBranchesPerLevel: 2,
    trunkBranchAngleDeg: 20,
    trunkBranchChildHeightFactor: 0.7,
    branchLevels: 2,
    branchesPerSegment: 2,
    branchCountJitter: 0.3,
    branchTopBias: 0,
    branchChildTipBias: 0.5,
    branchChildAvoidBaseFrac: 0.1,
    branchLength: 1.4,
    branchLengthJitter: 0.3,
    branchRadius: 0.08,
    branchRadiusFalloff: 0.7,
    branchAngleDeg: 35,
    branchAngleDegFirst: 35,
    branchAngleDegNext: 28,
    randomness: 0.3,
    leavesPerBranch: 3,
    leafSize: 0.16,
    branchTipTaper: 0.35,
    branchBendBase: 0.5,
    branchBendJitter: 0.4,
    branchCollarSize: 0.6,
    branchCollarFrac: 0.22,
    leafShape: 'billboard',
    leafPlacement: 'end',
    leafTiltDeg: 25,
    leafGlobalTiltMode: 'none',
    leafGlobalTiltLevel: 0,
    leavesPerMeter: 6,
    angleSpread: 1,
    embedFactor: 1,
    leafTextureSetId: 'leafset019-1k-jpg',
    leafTexturePaintFactor: 0,
    leafTexturePaintJitter: 0,
    barkTextureSetId: 'bark014-1k-jpg',
    barkUvRepeatU: 1,
    barkUvRepeatV: 1,
    barkTexDensityPerMeter: 1,
    // Отсечка веток по высоте: по умолчанию без отсечки
    branchHeightCutoff: 0,
  })

  // Параметры материалов
  const [barkColor, setBarkColor] = useState('#8B5A2B')
  const [leafColor, setLeafColor] = useState('#2E8B57')
  // Флаг: использовать ли роль палитры для материала листвы (по умолчанию включено)
  const [leafUsePaletteRole, setLeafUsePaletteRole] = useState<boolean>(true)
  const [clearBefore, setClearBefore] = useState(true)
  // Debug‑флаги Object Editor
  const leafRectDebug = useObjectDebugFlags(s => s.leafRectDebug)
  const setLeafRectDebug = useObjectDebugFlags(s => s.setLeafRectDebug)

  // Состояние модального окна конфигурации (импорт/экспорт JSON)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [configMode, setConfigMode] = useState<'export' | 'import'>('export')
  const [configJson, setConfigJson] = useState('')
  const [configError, setConfigError] = useState<string | null>(null)
  // Список спрайтов из атласа для текстурного режима
  const [atlasOptions, setAtlasOptions] = useState<{ value: string; label: string }[]>([])
  // Выбранный набор листвы — теперь хранится прямо в параметрах генератора
  const selectedLeafSetId = params.leafTextureSetId || 'leafset019-1k-jpg'
  const [leafSetModalOpen, setLeafSetModalOpen] = useState(false)
  // Набор коры: аналогично выбору листвы
  const selectedBarkSetId = params.barkTextureSetId || 'bark014-1k-jpg'
  const [barkSetModalOpen, setBarkSetModalOpen] = useState(false)
  const setBarkPreviewId = useSetBarkTextureSetId()
  // Активная вкладка панели генератора: trunk | branches | leaves
  const [activeTab, setActiveTab] = useState<'trunk' | 'branches' | 'leaves'>('trunk')
  useEffect(() => {
    let mounted = true
    const set = leafTextureRegistry.get(selectedLeafSetId) || leafTextureRegistry.list()[0] || leafTextureRegistry.get('leafset019-1k-jpg')
    const atlasUrl = set?.atlasUrl || '/texture/leaf/LeafSet019_1K-JPG/atlas.json'
    fetch(atlasUrl)
      .then(r => r.json())
      .then((arr: { name: string }[]) => {
        if (!mounted) return
        const opts = (arr || []).map(x => ({ value: x.name, label: x.name }))
        setAtlasOptions(opts)
        if (!params.leafTextureSpriteName && opts[0]) setParams(p => ({ ...p, leafTextureSpriteName: opts[0].value }))
      })
      .catch(() => void 0)
    return () => { mounted = false }
  }, [selectedLeafSetId])

  /**
   * Формирует человекочитаемый JSON текущих параметров генератора
   */
  const buildParamsJson = () => JSON.stringify(params, null, 2)

  /**
   * Открывает модальное окно экспорта конфигурации: показывает JSON и даёт скопировать
   */
  const openExportJson = () => {
    setConfigMode('export')
    setConfigError(null)
    setConfigJson(buildParamsJson())
    setConfigModalOpen(true)
  }

  /**
   * Открывает модальное окно импорта конфигурации: позволяет вставить и применить JSON
   */
  const openImportJson = () => {
    setConfigMode('import')
    setConfigError(null)
    // Подставляем текущие значения как шаблон
    setConfigJson(buildParamsJson())
    setConfigModalOpen(true)
  }

  /**
   * Применяет конфигурацию из JSON, беря только поддерживаемые поля TreeGeneratorParams
   */
  const applyImportedParams = () => {
    try {
      const parsed = JSON.parse(configJson || '{}')
      if (typeof parsed !== 'object' || parsed === null) {
        setConfigError('Ожидался объект JSON с параметрами')
        return
      }
      const allowedKeys: (keyof TreeGeneratorParams)[] = [
        'seed',
        'trunkHeight', 'trunkRadius', 'trunkSegments', 'trunkTaperFactor', 'trunkShearStrength',
        'trunkBranchLevels', 'trunkBranchesPerLevel', 'trunkBranchAngleDeg', 'trunkBranchChildHeightFactor',
        'branchLevels', 'branchesPerSegment', 'branchCountJitter', 'branchTopBias', 'branchUpBias',
        'branchLength', 'branchLengthJitter', 'branchRadius', 'branchRadiusFalloff', 'branchTipTaper', 'branchBendBase', 'branchBendJitter', 'branchCollarSize', 'branchCollarFrac', 'branchChildTipBias', 'branchChildAvoidBaseFrac', 'branchAngleDeg', 'branchAngleDegFirst', 'branchAngleDegNext', 'angleSpread',
        'randomness',
        'leavesPerBranch', 'leafSize', 'leafShape', 'leafTiltDeg', 'leafGlobalTiltMode', 'leafGlobalTiltLevel', 'leafTextureSpriteName', 'leafTextureSetId', 'leafTexturePaintFactor', 'leafTexturePaintJitter', 'leafPlacement', 'leavesPerMeter',
        'embedFactor', 'barkTexDensityPerMeter',
        'branchHeightCutoff',
      ]
      const requiredKeys: (keyof TreeGeneratorParams)[] = [
        'seed',
        'trunkHeight', 'trunkRadius', 'trunkSegments',
        'branchLevels', 'branchesPerSegment',
        'branchLength', 'branchRadius', 'branchAngleDeg',
        'randomness',
        'leavesPerBranch', 'leafSize',
      ]
      // Составляем новый объект ТОЛЬКО из разрешённых полей
      const next: any = {}
      for (const k of allowedKeys) if (k in parsed) next[k] = parsed[k]
      // Проверяем обязательные поля
      const missing = requiredKeys.filter(k => next[k] === undefined || next[k] === null)
      if (missing.length > 0) {
        setConfigError('Отсутствуют обязательные поля: ' + missing.join(', '))
        return
      }
      // Полная замена состояния параметров
      setParams(next as TreeGeneratorParams)
      setConfigModalOpen(false)
      setConfigError(null)
    } catch (e: any) {
      setConfigError('Ошибка парсинга JSON: ' + (e?.message || String(e)))
    }
  }

  const {
    addMaterial,
    setMaterials,
    setPrimitives,
    primitives,
    materials,
    updateMaterial,
  } = useObjectStore()

  // Достаём тип объекта и treeData из стора для инициализации контролов из GfxObject
  const objectTypeStore = useObjectStore(s => s.objectType)
  const treeDataStore = useObjectStore(s => s.treeData)

  /**
   * Инициализация контролов панели из текущего объекта (если это процедурное дерево).
   * Выполняется при первом открытии и при фактической смене данных (по подписи).
   */
  const initSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    if (objectTypeStore !== 'tree' || !treeDataStore?.params) return

    // Предпочитаем поиск материалов по UUID из treeData; fallback — по имени
    const barkMat = materials.find(m => m.uuid === treeDataStore.barkMaterialUuid) || materials.find(m => m.name.toLowerCase() === 'кора')
    const leafMat = materials.find(m => m.uuid === treeDataStore.leafMaterialUuid) || materials.find(m => m.name.toLowerCase() === 'листья')

    const nextSig = JSON.stringify({ params: treeDataStore.params, bark: barkMat?.properties?.color, leaf: leafMat?.properties?.color })
    if (nextSig === initSignatureRef.current) return

    // Применяем параметры генератора из объекта (не перетираем отсутствующие ключи)
    setParams(prev => ({ ...prev, ...(treeDataStore.params as any) }))
    if (barkMat?.properties?.color) setBarkColor(String(barkMat.properties.color))
    // Инициализация для листвы: если у материала задан источник цвета из палитры — включаем флаг и скрываем локальный цвет,
    // иначе используем локальный цвет из материала
    const src: any = (leafMat as any)?.properties?.colorSource
    if (src && src.type === 'role') {
      setLeafUsePaletteRole(true)
    } else {
      setLeafUsePaletteRole(false)
      if (leafMat?.properties?.color) setLeafColor(String(leafMat.properties.color))
    }

    initSignatureRef.current = nextSig
  }, [objectTypeStore, treeDataStore, materials])

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
      // Применяем логику палитры для листьев в зависимости от галочки
      const leafBase = base[1]
      if (leafUsePaletteRole) {
        // Включаем роль палитры foliage
        ;(leafBase.properties as any).colorSource = { type: 'role', role: 'foliage' }
      } else {
        // Фиксированный цвет: выключаем роль палитры
        if ((leafBase.properties as any).colorSource) delete (leafBase.properties as any).colorSource
        ;(leafBase.properties as any).color = leafColor
      }
      // Если один из материалов отсутствует — создаём оба для консистентности
      const newBarkUuid = addMaterial(base[0])
      const newLeafUuid = addMaterial(base[1])
      barkUuid = barkUuid || newBarkUuid
      leafUuid = leafUuid || newLeafUuid
    } else {
      // Материалы существуют — обновим их цвета согласно текущим контролам UI
      updateMaterial(barkUuid, {
        properties: {
          ...(existingBark?.properties || {}),
          color: barkColor,
        }
      } as any)
      if (leafUsePaletteRole) {
        updateMaterial(leafUuid, {
          properties: {
            ...(existingLeaf?.properties || {}),
            // Включаем роль палитры foliage; локальный цвет оставляем без изменений как бэкап
            colorSource: { type: 'role', role: 'foliage' } as any,
          }
        } as any)
      } else {
        updateMaterial(leafUuid, {
          properties: {
            ...(existingLeaf?.properties || {}),
            // Выключаем роль палитры и используем фиксированный цвет
            color: leafColor,
            colorSource: { type: 'fixed' } as any,
          }
        } as any)
      }
    }

    // Сохраняем тип объекта и параметры процедурного дерева в стор
    // Если пользователь очищает объект перед генерацией — считаем объект процедурным деревом
    if (clearBefore) {
      useObjectStore.getState().setObjectType('tree')
      useObjectStore.getState().setTreeData({
        params,
        barkMaterialUuid: barkUuid!,
        leafMaterialUuid: leafUuid!
      })
    }

    // Генерируем примитивы для предпросмотра/редактирования трансформаций
    const generated = generateTree({ ...params, barkMaterialUuid: barkUuid!, leafMaterialUuid: leafUuid! })
    // При полной очистке всегда заменяем; при добавлении — дополняем
    if (clearBefore) setPrimitives(generated)
    else setPrimitives([...primitives, ...generated])
  }

  // Готовые контролы сгруппированы по секциям
  return (
    <Box p="sm" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Stack gap="sm" style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column' }}>
        {/* Sticky header: заголовок, случайность и вкладки */}
        <Box className={classes.headerSticky}>
          <Group justify="space-between" mb={6}>
            <Text fw={600}>Генератор дерева</Text>
            <Switch label="Очистить перед генерацией" checked={clearBefore} onChange={(e) => setClearBefore(e.currentTarget.checked)} />
          </Group>
          <Divider label="Случайность" />
          <Group align="end" gap="xs" wrap="nowrap">
            <NumberInput style={{ flex: 1 }} label="Seed" value={params.seed} onChange={(v) => setParams(p => ({ ...p, seed: Number(v) || 0 }))} step={1} clampBehavior="strict"/>
            <Tooltip label="Перебросить seed" withArrow>
              <ActionIcon variant="subtle" color="blue" mt={22} onClick={() => setParams(p => ({ ...p, seed: Math.floor(Math.random() * 1_000_000) }))}>
                <IconDice5 size={18} />
              </ActionIcon>
            </Tooltip>
            <NumberInput style={{ flex: 1 }} label="Случайность" value={params.randomness} onChange={(v) => setParams(p => ({ ...p, randomness: Math.max(0, Math.min(1, Number(v) || 0)) }))} step={0.05} min={0} max={1}/>
          </Group>
          <Tabs value={activeTab} onChange={(v) => setActiveTab((v as any) as 'trunk'|'branches'|'leaves')} variant="unstyled" classNames={{ tab: classes.tab, list: classes.tabsList }}>
            <Tabs.List grow>
              <Tabs.Tab value="trunk" leftSection={<IconTrees size={16} />}>Ствол</Tabs.Tab>
              <Tabs.Tab value="branches" leftSection={<IconGitBranch size={16} />}>Ветви</Tabs.Tab>
              <Tabs.Tab value="leaves" leftSection={<IconLeaf size={16} />}>Листья</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Box>

        {/* Прокручиваемая центральная область */}
        <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Stack gap="sm">
        {/**
         * Локальные флаги доступности контролов:
         * - trunkBranchDisabled: нет разветвления ствола → отключаем его параметры
         * - branchesDisabled: нет веток → отключаем параметры веток и листвы
         * - leavesAlong: режим размещения листвы вдоль ветви
         */}
        {(() => null)()}
        {/** вычисления */}
        {(() => {
          return null
        })()}
        

        {/* Контент активной вкладки */}

        {activeTab === 'trunk' && (<>
        <Group justify="space-between" align="center" mb="xs">
          <Text size="sm">Текстура коры: {woodTextureRegistry.get(selectedBarkSetId)?.name || '—'}</Text>
          <Button variant="light" onClick={() => setBarkSetModalOpen(true)}>Выбрать текстуру</Button>
        </Group>
        <Group grow>
          <NumberInput
            label="Повтор U"
            value={params.barkUvRepeatU ?? 1}
            onChange={(v) => setParams(p => ({ ...p, barkUvRepeatU: Math.max(0.05, Number(v) || 1) }))}
            min={0.05}
            step={0.1}
          />
          <NumberInput
            label="Повтор V"
            value={params.barkUvRepeatV ?? 1}
            onChange={(v) => setParams(p => ({ ...p, barkUvRepeatV: Math.max(0.05, Number(v) || 1) }))}
            min={0.05}
            step={0.1}
          />
        </Group>
        <Group grow>
          <NumberInput label="Высота" value={params.trunkHeight} onChange={(v) => setParams(p => ({ ...p, trunkHeight: Math.max(0.5, Number(v) || 0) }))} min={0.5} step={0.1}/>
          <NumberInput label="Радиус" value={params.trunkRadius} onChange={(v) => setParams(p => ({ ...p, trunkRadius: Math.max(0.02, Number(v) || 0) }))} min={0.02} step={0.02}/>
          <NumberInput label="Сегменты" value={params.trunkSegments} onChange={(v) => setParams(p => ({ ...p, trunkSegments: Math.max(1, Math.round(Number(v) || 1)) }))} min={1} step={1}/>
        </Group>
        <Group grow>
          <Box>
            <Text size="sm" mb={4}>Плотность коры (повторов/м)</Text>
            <Slider
              value={params.barkTexDensityPerMeter ?? 1}
              onChange={(v) => setParams(p => ({ ...p, barkTexDensityPerMeter: Array.isArray(v) ? v[0] : v }))}
              min={0.1}
              max={5}
              step={0.05}
              marks={[{ value: 0.5, label: '0.5' }, { value: 1, label: '1' }, { value: 2, label: '2' }]}
            />
          </Box>
        </Group>
        {/* Отсечка веток по высоте: 0..trunkHeight */}
        <Slider
          label={"Отсечка веток по высоте"}
          value={params.branchHeightCutoff ?? 0}
          onChange={(v) => setParams(p => ({ ...p, branchHeightCutoff: Array.isArray(v) ? v[0] : v }))}
          min={0}
          max={params.trunkHeight}
          step={0.05}
          marks={[{ value: 0, label: '0' }, { value: params.trunkHeight, label: String(params.trunkHeight) }]}
          disabled={params.branchLevels <= 0}
        />
        <Text size="xs" c="dimmed">До этой высоты ветви не создаются вовсе</Text>
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
        <Box>
          <Text size="sm" mb={4}>Скос сегментов ствола</Text>
          <Slider
            value={params.trunkShearStrength ?? 0}
            onChange={(v) => setParams(p => ({ ...p, trunkShearStrength: Array.isArray(v) ? v[0] : v }))}
            min={0}
            max={1}
            step={0.01}
            marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }]}
          />
        </Box>

        <Divider label="Разветвление ствола" />
        {/** Булевы флаги для disable */}
        {(() => null)()}
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
            disabled={(params.trunkBranchLevels ?? 0) <= 0}
          />
          <NumberInput
            label="Угол (°)"
            value={params.trunkBranchAngleDeg ?? 20}
            onChange={(v) => setParams(p => ({ ...p, trunkBranchAngleDeg: Math.max(0, Math.min(85, Number(v) || 0)) }))}
            min={0}
            max={85}
            step={1}
            disabled={(params.trunkBranchLevels ?? 0) <= 0}
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
              disabled={(params.trunkBranchLevels ?? 0) <= 0}
            />
          </Box>
        </Group>
        </>)}

        {activeTab === 'branches' && (<>
        <Group grow>
          <NumberInput label="Уровни" value={params.branchLevels} onChange={(v) => setParams(p => ({ ...p, branchLevels: Math.max(0, Math.round(Number(v) || 0)) }))} min={0} step={1}/>
          <NumberInput label="Ветвей/сегмент" value={params.branchesPerSegment} onChange={(v) => setParams(p => ({ ...p, branchesPerSegment: Math.max(0, Number(v) || 0) }))} min={0} step={1} disabled={params.branchLevels <= 0}/>
          <NumberInput label="Длина ветви" value={params.branchLength} onChange={(v) => setParams(p => ({ ...p, branchLength: Math.max(0.2, Number(v) || 0) }))} min={0.2} step={0.1} disabled={params.branchLevels <= 0}/>
        </Group>
        <Box>
          <Text size="sm" mb={4}>Разброс количества дочерних</Text>
          <Slider
            value={params.branchCountJitter ?? 0}
            onChange={(v) => setParams(p => ({ ...p, branchCountJitter: Array.isArray(v) ? v[0] : v }))}
            min={0}
            max={1}
            step={0.01}
            marks={[{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' }]}
            disabled={params.branchLevels <= 0}
          />
        </Box>
        <Box>
          <Text size="sm" mb={4}>Разброс длины ветви</Text>
          <Slider
            value={params.branchLengthJitter ?? params.randomness}
            onChange={(v) => setParams(p => ({ ...p, branchLengthJitter: Array.isArray(v) ? v[0] : v }))}
            min={0}
            max={1}
            step={0.01}
            marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }]}
            disabled={params.branchLevels <= 0}
          />
        </Box>
        <Group grow>
          <Box>
            <Text size="sm" mb={4}>Радиус следующего уровня</Text>
            <Slider
              value={params.branchRadiusFalloff ?? 0.7}
              onChange={(v) => setParams(p => ({ ...p, branchRadiusFalloff: Array.isArray(v) ? v[0] : v }))}
              min={0.4}
              max={0.95}
              step={0.01}
              marks={[{ value: 0.5, label: '0.5' }, { value: 0.7, label: '0.7' }, { value: 0.9, label: '0.9' }]}
              disabled={params.branchLevels <= 0}
            />
          </Box>
          <Box>
            <Text size="sm" mb={4}>Сужение к кончику</Text>
            <Slider
              value={params.branchTipTaper ?? 0.35}
              onChange={(v) => setParams(p => ({ ...p, branchTipTaper: Array.isArray(v) ? v[0] : v }))}
              min={0}
              max={0.9}
              step={0.01}
              marks={[{ value: 0, label: '0' }, { value: 0.35, label: '0.35' }, { value: 0.7, label: '0.7' }]}
              disabled={params.branchLevels <= 0}
            />
          </Box>
        </Group>
        <Group grow>
          <Box>
            <Text size="sm" mb={4}>Базовый изгиб ветвей</Text>
            <Slider
              value={params.branchBendBase ?? 0.5}
              onChange={(v) => setParams(p => ({ ...p, branchBendBase: Array.isArray(v) ? v[0] : v }))}
              min={0}
              max={1}
              step={0.01}
              marks={[{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' }]}
              disabled={params.branchLevels <= 0}
            />
          </Box>
          <Box>
            <Text size="sm" mb={4}>Разброс изгиба</Text>
            <Slider
              value={params.branchBendJitter ?? 0.4}
              onChange={(v) => setParams(p => ({ ...p, branchBendJitter: Array.isArray(v) ? v[0] : v }))}
              min={0}
              max={1}
              step={0.01}
              marks={[{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' }]}
              disabled={params.branchLevels <= 0}
            />
          </Box>
        </Group>
        <Box>
          <Text size="sm" mb={4}>Размер воротника стыка</Text>
          <Slider
            value={params.branchCollarSize ?? 0.6}
            onChange={(v) => setParams(p => ({ ...p, branchCollarSize: Array.isArray(v) ? v[0] : v }))}
            min={0}
            max={1}
            step={0.01}
            marks={[{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' }]}
            disabled={params.branchLevels <= 0}
          />
        </Box>
        <Box>
          <Text size="sm" mb={4}>Длина воротника (доля)</Text>
          <Slider
            value={params.branchCollarFrac ?? 0.22}
            onChange={(v) => setParams(p => ({ ...p, branchCollarFrac: Array.isArray(v) ? v[0] : v }))}
            min={0}
            max={0.6}
            step={0.01}
            marks={[{ value: 0, label: '0' }, { value: 0.22, label: '0.22' }, { value: 0.5, label: '0.5' }]}
            disabled={params.branchLevels <= 0}
          />
        </Box>
        {/* Переключатель крепления по поверхности убран по запросу */}
        <Box>
          <Text size="sm" mb={4}>Стремление крепления к концу</Text>
          <Slider
            value={params.branchChildTipBias ?? 0.5}
            onChange={(v) => setParams(p => ({ ...p, branchChildTipBias: Array.isArray(v) ? v[0] : v }))}
            min={0}
            max={1}
            step={0.01}
            marks={[{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' }]}
            disabled={params.branchLevels <= 0}
          />
        </Box>
        <Box>
          <Text size="sm" mb={4}>Избегать базу родителя (%)</Text>
          <Slider
            value={params.branchChildAvoidBaseFrac ?? 0.1}
            onChange={(v) => setParams(p => ({ ...p, branchChildAvoidBaseFrac: Array.isArray(v) ? v[0] : v }))}
            min={0}
            max={0.5}
            step={0.01}
            marks={[{ value: 0, label: '0' }, { value: 0.25, label: '25%' }, { value: 0.5, label: '50%' }]}
            disabled={params.branchLevels <= 0}
          />
        </Box>
        <Box>
          <Text size="sm" mb={4}>Привязка ветвей к верху</Text>
          <Slider
            value={params.branchTopBias ?? 0}
            onChange={(v) => setParams(p => ({ ...p, branchTopBias: Array.isArray(v) ? v[0] : v }))}
            min={0}
            max={1}
            step={0.01}
            marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }]}
            disabled={params.branchLevels <= 0}
          />
        </Box>
        <Box>
          <Text size="sm" mb={4}>Стремление ветвей вверх</Text>
          <Slider
            value={params.branchUpBias ?? 0}
            onChange={(v) => setParams(p => ({ ...p, branchUpBias: Array.isArray(v) ? v[0] : v }))}
            min={0}
            max={1}
            step={0.01}
            marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }]}
            disabled={params.branchLevels <= 0}
          />
        </Box>
        <Group grow>
          <NumberInput label="Радиус ветви" value={params.branchRadius} onChange={(v) => setParams(p => ({ ...p, branchRadius: Math.max(0.01, Number(v) || 0) }))} min={0.01} step={0.01} disabled={params.branchLevels <= 0}/>
          <NumberInput label="Базовый угол (°)" value={params.branchAngleDeg} onChange={(v) => setParams(p => ({ ...p, branchAngleDeg: Math.max(0, Math.min(85, Number(v) || 0)) }))} min={0} max={85} step={1} disabled={params.branchLevels <= 0}/>
          <NumberInput label="Угол L1 (°)" value={params.branchAngleDegFirst ?? params.branchAngleDeg} onChange={(v) => setParams(p => ({ ...p, branchAngleDegFirst: Math.max(0, Math.min(85, Number(v) || 0)) }))} min={0} max={85} step={1} disabled={params.branchLevels <= 0}/>
          <NumberInput label="Угол L2+ (°)" value={params.branchAngleDegNext ?? params.branchAngleDeg} onChange={(v) => setParams(p => ({ ...p, branchAngleDegNext: Math.max(0, Math.min(85, Number(v) || 0)) }))} min={0} max={85} step={1} disabled={params.branchLevels <= 0}/>
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
            disabled={params.branchLevels <= 0}
          />
        </Box>
        </>)}

        {activeTab === 'leaves' && (<>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="sm">Набор листвы: {leafTextureRegistry.get(selectedLeafSetId)?.name || '—'}</Text>
            <Button variant="light" onClick={() => setLeafSetModalOpen(true)}>Выбрать набор</Button>
          </Group>
          <Group grow>
            <NumberInput label="Листьев/ветка" value={params.leavesPerBranch} onChange={(v) => setParams(p => ({ ...p, leavesPerBranch: Math.max(0, Math.round(Number(v) || 0)) }))} min={0} step={1} disabled={params.branchLevels <= 0 || params.leafPlacement === 'along'}/>
            <NumberInput label="Размер листа" value={params.leafSize} onChange={(v) => setParams(p => ({ ...p, leafSize: Math.max(0.01, Number(v) || 0) }))} min={0.01} step={0.01} disabled={params.branchLevels <= 0}/>
          </Group>
        <SegmentedControl
          value={params.leafShape || 'billboard'}
          onChange={(v) => setParams(p => ({ ...p, leafShape: (v as 'billboard'|'sphere'|'coniferCross'|'texture') }))}
          data={[
            { label: 'Билборды', value: 'billboard' },
            { label: 'Сферы', value: 'sphere' },
            { label: 'Хвойная (крест)', value: 'coniferCross' },
            { label: 'Текстура', value: 'texture' },
          ]}
          disabled={params.branchLevels <= 0}
        />
        {params.leafShape === 'texture' && (
          <Stack gap="xs">
            <Group grow align="end">
              <NumberInput
                label="Наклон листа к ветви (°)"
                value={params.leafTiltDeg ?? 25}
                onChange={(v) => setParams(p => ({ ...p, leafTiltDeg: Math.max(0, Math.min(90, Number(v) || 0)) }))}
                min={0}
                max={90}
                step={1}
                disabled={params.branchLevels <= 0}
              />
              <Switch
                label="Обводка листа (debug)"
                checked={leafRectDebug}
                onChange={(e) => setLeafRectDebug(e.currentTarget.checked)}
              />
            </Group>

            <Group grow align="center">
              <Stack gap={4} style={{ flex: 1 }}>
                <Text size="sm">Стремление листвы</Text>
                <SegmentedControl
                  value={(params.leafGlobalTiltMode || 'none') as any}
                  onChange={(v) => setParams(p => ({ ...p, leafGlobalTiltMode: (v as any) || 'none' }))}
                  data={[
                    { label: (<IconMinus size={16} />) as any, value: 'none' },
                    { label: (<IconArrowUp size={16} />) as any, value: 'up' },
                    { label: (<IconArrowDown size={16} />) as any, value: 'down' },
                  ]}
                  disabled={params.branchLevels <= 0}
                />
              </Stack>
              <Stack gap={4} style={{ flex: 1 }}>
                <Text size="sm">Уровень стремления</Text>
                <Slider
                  value={params.leafGlobalTiltLevel ?? 0}
                  onChange={(v) => setParams(p => ({ ...p, leafGlobalTiltLevel: Array.isArray(v) ? v[0] : v }))}
                  min={0}
                  max={1}
                  step={0.01}
                  marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }]}
                  disabled={params.branchLevels <= 0 || (params.leafGlobalTiltMode || 'none') === 'none'}
                />
              </Stack>
            </Group>

            <Stack gap="xs">
              <Group gap="xs" justify="space-between">
                <Text size="sm">Спрайты</Text>
                <Switch
                  size="xs"
                  label="Использовать все"
                  checked={!!params.useAllLeafSprites}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked
                    setParams(p => ({
                      ...p,
                      useAllLeafSprites: checked,
                      leafSpriteNames: checked ? atlasOptions.map(o => o.value) : p.leafSpriteNames
                    }))
                  }}
                />
              </Group>
              {!params.useAllLeafSprites && (
                <Select
                  label="Спрайт из атласа"
                  placeholder={atlasOptions.length ? 'Выберите' : 'Атлас не найден'}
                  data={atlasOptions}
                  value={params.leafTextureSpriteName || null}
                  onChange={(v) => setParams(p => ({ ...p, leafTextureSpriteName: v || undefined }))}
                  searchable
                  clearable
                  disabled={params.branchLevels <= 0}
                />
              )}
              {params.useAllLeafSprites && (
                <Text size="xs" c="dimmed">Будут использованы все спрайты из атласа, равномерно в случайном порядке.</Text>
              )}
            </Stack>
            <Box>
              <Text size="sm" mb={4}>Покраска текстуры листвы</Text>
              <Slider
                value={params.leafTexturePaintFactor ?? 0}
                onChange={(v) => setParams(p => ({ ...p, leafTexturePaintFactor: Array.isArray(v) ? v[0] : v }))}
                min={0}
                max={1}
                step={0.01}
                marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }]}
                disabled={params.branchLevels <= 0}
              />
              <Text size="xs" c="dimmed">0 — оставить цвета текстуры; 1 — максимально привести тон/насыщенность к цвету материала «Листья»</Text>
            </Box>
            <Box>
              <Text size="sm" mb={4}>Разброс покраски по листьям</Text>
              <Slider
                value={params.leafTexturePaintJitter ?? 0}
                onChange={(v) => setParams(p => ({ ...p, leafTexturePaintJitter: Array.isArray(v) ? v[0] : v }))}
                min={0}
                max={1}
                step={0.01}
                marks={[{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' }]}
                disabled={params.branchLevels <= 0}
              />
              <Text size="xs" c="dimmed">0 — у всех листьев одинаково; 1 — у части листьев покраска может быть вплоть до 0; 0.5 — покраска листа = глобальный фактор минус 0–50%</Text>
            </Box>
          </Stack>
        )}
        <Group grow>
          <SegmentedControl
            value={params.leafPlacement || 'end'}
            onChange={(v) => setParams(p => ({ ...p, leafPlacement: (v as 'end'|'along') }))}
            data={[
              { label: 'На концах', value: 'end' },
              { label: 'Вдоль ветви', value: 'along' },
            ]}
            disabled={params.branchLevels <= 0}
          />
          {params.leafPlacement === 'along' && (
            <Slider
              value={params.leavesPerMeter ?? 6}
              onChange={(v) => setParams(p => ({ ...p, leavesPerMeter: Array.isArray(v) ? v[0] : v }))}
              min={1}
              max={12}
              step={0.5}
              marks={[{ value: 2, label: '2/м' }, { value: 6, label: '6/м' }, { value: 10, label: '10/м' }]}
              disabled={params.branchLevels <= 0}
            />
          )}
        </Group>
        </>)}

        </Stack>
        </Box>

        {/* Sticky footer */}
        <Box className={classes.footerSticky}>
          <Divider label="Материалы" />
          <Group grow align="end">
            <ColorInput label="Цвет коры" value={barkColor} onChange={setBarkColor} format="hex" withEyeDropper/>
            <Stack gap={6} style={{ flex: 1 }}>
              <Switch
                label="Использовать роль палитры"
                checked={leafUsePaletteRole}
                onChange={(e) => setLeafUsePaletteRole(e.currentTarget.checked)}
              />
              {!leafUsePaletteRole && (
                <ColorInput label="Цвет листвы" value={leafColor} onChange={setLeafColor} format="hex" withEyeDropper/>
              )}
              {leafUsePaletteRole && (
                <Text size="xs" c="dimmed">Роль: foliage (цвет из активной палитры)</Text>
              )}
            </Stack>
          </Group>

          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={openExportJson}>Экспорт JSON</Button>
            <Button variant="light" onClick={openImportJson}>Импорт JSON</Button>
            <Button onClick={handleGenerate}>Сгенерировать</Button>
          </Group>
        </Box>
      </Stack>

      {/* Модальное окно конфигурации JSON (импорт/экспорт) */}
      <Modal opened={configModalOpen} onClose={() => setConfigModalOpen(false)} title={configMode === 'export' ? 'Экспорт конфигурации (JSON)' : 'Импорт конфигурации (JSON)'} size="70%">
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            {configMode === 'export'
              ? 'Скопируйте JSON конфигурации. Вы можете отредактировать перед копированием.'
              : 'Вставьте JSON конфигурации и нажмите «Применить».'}
          </Text>
          <Textarea minRows={12} autosize value={configJson} onChange={(e) => setConfigJson(e.currentTarget.value)} spellCheck={false} />
          {configError && <Text size="sm" c="red">{configError}</Text>}
          <Group justify="space-between" mt="xs">
            {configMode === 'export' ? (
              <Button
                variant="default"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(configJson)
                    setConfigError(null)
                  } catch {
                    setConfigError('Не удалось скопировать в буфер обмена. Скопируйте вручную.')
                  }
                }}
              >
                Скопировать в буфер
              </Button>
            ) : (
              <Button onClick={applyImportedParams}>Применить</Button>
            )}
            <Button variant="light" onClick={() => setConfigModalOpen(false)}>Закрыть</Button>
          </Group>
        </Stack>
      </Modal>
      {/* Всплывающее окно выбора набора текстур листвы */}
      <Modal opened={leafSetModalOpen} onClose={() => setLeafSetModalOpen(false)} title="Выбор набора листвы" size="lg">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">Выберите набор: будет использован для предпросмотра и атласа спрайтов в ObjectEditor.</Text>
          <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {leafTextureRegistry.list().map(set => {
              const selected = set.id === selectedLeafSetId
              return (
                <Box key={set.id}
                  onClick={() => {
                    // Обновляем локальные параметры генератора
                    setParams(p => ({ ...p, leafTextureSetId: set.id }))
                    // Мгновенно пробрасываем выбор в объект (если это процедурное дерево),
                    // чтобы отладочная панель и предпросмотр сразу переключились на новый набор
                    const st = useObjectStore.getState()
                    if (st.objectType === 'tree' && st.treeData?.params) {
                      st.setTreeData({
                        ...st.treeData,
                        params: { ...(st.treeData.params as any), leafTextureSetId: set.id }
                      })
                    }
                    setLeafSetModalOpen(false)
                  }}
                  style={{
                    cursor: 'pointer',
                    border: `2px solid ${selected ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-dark-5)'}`,
                    borderRadius: 8,
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--mantine-color-dark-7)'
                  }}>
                  <Box style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: 6, background: 'var(--mantine-color-dark-6)' }}>
                    <img src={set.previewUrl} alt={set.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </Box>
                  <Text size="sm" ta="center">{set.name}</Text>
                </Box>
              )
            })}
          </Box>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setLeafSetModalOpen(false)}>Закрыть</Button>
          </Group>
        </Stack>
      </Modal>
      {/* Всплывающее окно выбора текстуры коры (ствол/ветви) */}
      <Modal opened={barkSetModalOpen} onClose={() => setBarkSetModalOpen(false)} title="Выбор текстуры коры" size="lg">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">Выберите набор PBR-карт для коры дерева. Текстура применяется к стволу и ветвям.</Text>
          <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {woodTextureRegistry.list().map(set => {
              const selected = set.id === selectedBarkSetId
              return (
                <Box key={set.id}
                  onClick={() => {
                    // Обновляем параметры генератора
                    setParams(p => ({ ...p, barkTextureSetId: set.id }))
                    // Пробрасываем предпросмотр (всегда) и, если возможно, в данные объекта
                    setBarkPreviewId(set.id)
                    const st = useObjectStore.getState()
                    st.setTreeData({
                      ...(st.treeData || {} as any),
                      params: { ...((st.treeData?.params as any) || {}), barkTextureSetId: set.id }
                    } as any)
                    setBarkSetModalOpen(false)
                  }}
                  style={{
                    cursor: 'pointer',
                    border: `2px solid ${selected ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-dark-5)'}`,
                    borderRadius: 8,
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--mantine-color-dark-7)'
                  }}>
                  <Box style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: 6, background: 'var(--mantine-color-dark-6)' }}>
                    <img src={set.previewUrl} alt={set.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </Box>
                  <Text size="sm" ta="center">{set.name}</Text>
                </Box>
              )
            })}
          </Box>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setBarkSetModalOpen(false)}>Закрыть</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}

export default TreeGeneratorPanel
