import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Group, NumberInput, ScrollArea, Select, Stack, Text } from '@mantine/core'
import { useObjectPrimitives, useObjectSelectedPrimitiveIds } from '@/features/editor/object/model/objectStore'

/**
 * Панель отладки вырезки спрайтов из атласа для текстурных листьев.
 * Показывает исходную карту цвета с наложением прямоугольника выбранного спрайта из atlas.json,
 * а также численные параметры (x,y,w,h), рассчитанные repeat/offset и центр/поворот.
 * Работает на основе текущего выделенного листа (если выбрано несколько — берётся первый),
 * либо первого встречного листа с shape='texture' среди примитивов объекта.
 */
export const LeafSpriteDebugPanel: React.FC = () => {
  const primitives = useObjectPrimitives()
  const selected = useObjectSelectedPrimitiveIds()

  // Находим целевой примитив-лист
  const target = useMemo(() => {
    const bySelected = selected.map(i => primitives[i]).find(p => p?.type === 'leaf' && (p as any)?.geometry?.shape === 'texture')
    if (bySelected) return bySelected as any
    const anyLeaf = primitives.find(p => p.type === 'leaf' && (p as any)?.geometry?.shape === 'texture')
    return anyLeaf as any
  }, [primitives, selected])

  const spriteName = (target?.geometry as any)?.texSpriteName as string | undefined
  const texRotDeg = undefined

  // Загружаем атлас и исходное изображение
  const [atlas, setAtlas] = useState<{ name: string; x: number; y: number; width: number; height: number; anchorX?: number; anchorY?: number; anchor?: { x: number; y: number } }[]>([])
  const originalAtlasRef = useRef<typeof atlas | null>(null)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    let active = true
    fetch('/texture/leaf/LeafSet019_1K-JPG/atlas.json')
      .then(r => r.json())
      .then((arr) => {
        if (!active) return
        const next = (arr || []) as any
        setAtlas(next)
        originalAtlasRef.current = next
      })
      .catch(() => setAtlas([]))
    const img = new Image()
    img.onload = () => { if (active) setImgEl(img) }
    img.src = '/texture/leaf/LeafSet019_1K-JPG/LeafSet019_1K-JPG_Color.jpg'
    return () => { active = false }
  }, [])

  const [currentName, setCurrentName] = useState<string | null>(null)
  // Не сбрасывать выбор при локальном редактировании atlas: реагируем только на смену spriteName или длины массива
  useEffect(() => {
    if (spriteName && currentName !== spriteName) {
      setCurrentName(spriteName)
    } else if (!currentName && atlas[0]) {
      setCurrentName(atlas[0].name)
    } else if (currentName) {
      // Если выбранный спрайт исчез (редкий случай) — переключаемся на первый
      const exists = atlas.some(a => a.name === currentName)
      if (!exists && atlas[0]) setCurrentName(atlas[0].name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spriteName, atlas.length])

  const rect = useMemo(() => atlas.find(a => a.name === currentName) || atlas[0], [atlas, currentName])
  const W = imgEl?.naturalWidth || 1
  const H = imgEl?.naturalHeight || 1
  const repX = rect ? rect.width / W : 1
  const repY = rect ? rect.height / H : 1
  const offX = rect ? rect.x / W : 0
  const offY = rect ? 1 - (rect.y + rect.height) / H : 0
  const cx = offX + repX * 0.5
  const cy = offY + repY * 0.5
  /**
   * Точка основания (anchor) спрайта для визуальной проверки крепления.
   * Поддерживаются форматы в atlas.json: anchorX/anchorY (в пикселях) или anchor: { x, y }.
   * Если значения отсутствуют — используем нижнюю середину прямоугольника.
   */
  const anchor = useMemo(() => {
    const ax = (rect && (typeof (rect as any).anchorX === 'number' ? (rect as any).anchorX : (rect as any)?.anchor?.x))
    const ay = (rect && (typeof (rect as any).anchorY === 'number' ? (rect as any).anchorY : (rect as any)?.anchor?.y))
    const px = rect ? rect.x + (typeof ax === 'number' ? ax : rect.width * 0.5) : 0
    const py = rect ? rect.y + (typeof ay === 'number' ? ay : rect.height) : 0
    const u = rect && rect.width > 0 ? ((typeof ax === 'number' ? ax : rect.width * 0.5) / rect.width) : 0.5
    const v = rect && rect.height > 0 ? ((typeof ay === 'number' ? ay : rect.height) / rect.height) : 1.0
    return { px, py, u, v }
  }, [rect])

  // Размер предпросмотра
  // Управление масштабом предпросмотра (в процентах)
  const [scalePct, setScalePct] = useState<number>(100)
  useEffect(() => {
    // Инициализируем масштаб, чтобы ширина превью ~320px (не трогаем, если пользователь уже менял)
    if (W > 0) {
      const suggested = Math.min(100, Math.max(10, Math.round((320 / W) * 100)))
      setScalePct(prev => (prev === 100 ? suggested : prev))
    }
  }, [W])
  const scale = Math.max(0.1, Math.min(2, (scalePct || 100) / 100))
  const viewW = Math.max(1, Math.round(W * scale))
  const viewH = Math.max(1, Math.round(H * scale))

  // Редактируемые значения текущего спрайта
  const [editX, setEditX] = useState<number | ''>('')
  const [editY, setEditY] = useState<number | ''>('')
  const [editW, setEditW] = useState<number | ''>('')
  const [editH, setEditH] = useState<number | ''>('')
  const [editAnchorX, setEditAnchorX] = useState<number | ''>('')
  const [editAnchorY, setEditAnchorY] = useState<number | ''>('')

  // Инициализация/обновление редактируемых полей при смене спрайта
  useEffect(() => {
    if (!rect) return
    setEditX(rect.x)
    setEditY(rect.y)
    setEditW(rect.width)
    setEditH(rect.height)
    const ax = (rect as any).anchorX ?? (rect as any)?.anchor?.x
    const ay = (rect as any).anchorY ?? (rect as any)?.anchor?.y
    setEditAnchorX(typeof ax === 'number' ? ax : '')
    setEditAnchorY(typeof ay === 'number' ? ay : '')
  }, [rect?.name])

  // Применить значения в atlas для текущего спрайта
  const applyEditsToAtlas = (next: { x?: number; y?: number; width?: number; height?: number; anchorX?: number | null; anchorY?: number | null }) => {
    if (!currentName) return
    setAtlas(prev => prev.map(item => {
      if (item.name !== currentName) return item
      const updated: any = { ...item }
      if (typeof next.x === 'number') updated.x = Math.max(0, Math.min(W - 1, next.x))
      if (typeof next.y === 'number') updated.y = Math.max(0, Math.min(H - 1, next.y))
      if (typeof next.width === 'number') updated.width = Math.max(1, Math.min(W - (updated.x ?? item.x), next.width))
      if (typeof next.height === 'number') updated.height = Math.max(1, Math.min(H - (updated.y ?? item.y), next.height))
      if (next.anchorX === null) delete updated.anchorX
      else if (typeof next.anchorX === 'number') updated.anchorX = Math.max(0, Math.min((updated.width ?? item.width), next.anchorX))
      if (next.anchorY === null) delete updated.anchorY
      else if (typeof next.anchorY === 'number') updated.anchorY = Math.max(0, Math.min((updated.height ?? item.height), next.anchorY))
      // Удаляем объект anchor в пользу anchorX/anchorY
      if ('anchor' in updated) delete updated.anchor
      return updated
    }))
  }

  // Копирование atlаs.json в буфер обмена
  const copyAtlasToClipboard = async () => {
    try {
      const json = JSON.stringify(atlas, null, 2)
      await navigator.clipboard.writeText(json)
    } catch (e) {
      // ignore
    }
  }

  return (
    <ScrollArea style={{ height: '100%' }}>
      <Stack gap="xs" p="sm">
        <Text size="sm" c="dimmed">Отладка вырезки спрайта из атласа</Text>
        <Select
          label="Спрайт"
          data={(atlas || []).map(a => ({ value: a.name, label: a.name }))}
          value={currentName}
          onChange={(v) => setCurrentName(v)}
          searchable
          nothingFoundMessage="Нет спрайтов"
        />
        <Group gap="xs" align="end">
          <NumberInput
            label="Масштаб (%)"
            value={scalePct}
            onChange={(v) => setScalePct(Math.max(10, Math.min(200, Number(v) || 100)))}
            min={10}
            max={200}
            step={5}
            clampBehavior="strict"
            style={{ width: 160 }}
          />
          <Text size="xs" c="dimmed" style={{ paddingBottom: 6 }}>
            Ширина: {viewW}px, Высота: {viewH}px
          </Text>
        </Group>
        {/* Редактор геометрии спрайта и pivot (anchor) */}
        {rect && (
          <Group align="flex-end" grow>
            <NumberInput label="x" value={editX} onChange={(v) => { const n = Number(v)||0; setEditX(n); applyEditsToAtlas({ x: n }) }} min={0} max={W-1} step={1} clampBehavior="strict"/>
            <NumberInput label="y" value={editY} onChange={(v) => { const n = Number(v)||0; setEditY(n); applyEditsToAtlas({ y: n }) }} min={0} max={H-1} step={1} clampBehavior="strict"/>
            <NumberInput label="w" value={editW} onChange={(v) => { const n = Number(v)||1; setEditW(n); applyEditsToAtlas({ width: n }) }} min={1} max={W} step={1} clampBehavior="strict"/>
            <NumberInput label="h" value={editH} onChange={(v) => { const n = Number(v)||1; setEditH(n); applyEditsToAtlas({ height: n }) }} min={1} max={H} step={1} clampBehavior="strict"/>
            <NumberInput label="pivotX" value={editAnchorX} onChange={(v) => { const nn = (v===''? '' : Number(v)); setEditAnchorX(nn as any); applyEditsToAtlas({ anchorX: (nn===''? null : Number(nn)) as any }) }} min={0} max={(rect?.width||1)} step={1} clampBehavior="strict"/>
            <NumberInput label="pivotY" value={editAnchorY} onChange={(v) => { const nn = (v===''? '' : Number(v)); setEditAnchorY(nn as any); applyEditsToAtlas({ anchorY: (nn===''? null : Number(nn)) as any }) }} min={0} max={(rect?.height||1)} step={1} clampBehavior="strict"/>
          </Group>
        )}
        <Box>
          <Text size="sm">Исходная карта (масштаб {Math.round(scale*100)}%)</Text>
          <Box style={{ position: 'relative', width: viewW, height: viewH, border: '1px solid var(--mantine-color-dark-5)' }}>
            {imgEl && (
              <img src={imgEl.src} width={viewW} height={viewH} style={{ display: 'block' }} />
            )}
            {rect && (
              <Box style={{
                position: 'absolute',
                left: Math.round(rect.x * scale),
                top: Math.round(rect.y * scale),
                width: Math.round(rect.width * scale),
                height: Math.round(rect.height * scale),
                border: '2px solid var(--mantine-color-green-5)',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)'
              }} />
            )}
            {rect && (
              <Box style={{ position: 'absolute', left: Math.round(cx * W * scale)-4, top: Math.round((1-cy) * H * scale)-4, width: 8, height: 8, background: 'var(--mantine-color-red-6)', borderRadius: 4 }} />
            )}
            {rect && (
              <Box
                title="Точка основания (anchor)"
                style={{
                  position: 'absolute',
                  left: Math.round(anchor.px * scale) - 4,
                  top: Math.round(anchor.py * scale) - 4,
                  width: 8,
                  height: 8,
                  background: 'var(--mantine-color-blue-6)',
                  borderRadius: 4,
                  boxShadow: '0 0 0 1px #000'
                }}
              />
            )}
          </Box>
        </Box>
        <Box>
          <Text size="sm" fw={600}>Данные</Text>
          <Text size="sm">Имя: {currentName || '-'}</Text>
          <Text size="sm">Rect (px): x={rect?.x ?? '-'}, y={rect?.y ?? '-'}, w={rect?.width ?? '-'}, h={rect?.height ?? '-'}</Text>
          <Text size="sm">Изображение (px): W={W}, H={H}</Text>
          <Text size="sm">UV: repeat=({repX.toFixed(4)}, {repY.toFixed(4)}), offset=({offX.toFixed(4)}, {offY.toFixed(4)})</Text>
          <Text size="sm">UV-центр: ({cx.toFixed(4)}, {cy.toFixed(4)}), поворот=-</Text>
          <Text size="sm">Anchor (px): x={Math.round(anchor.px)}, y={Math.round(anchor.py)}</Text>
          <Text size="sm">Anchor (u,v): ({anchor.u.toFixed(4)}, {anchor.v.toFixed(4)})</Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="light" onClick={() => { if (originalAtlasRef.current) setAtlas(JSON.parse(JSON.stringify(originalAtlasRef.current))) }}>Сбросить</Button>
            <Button onClick={copyAtlasToClipboard}>Скопировать atlas.json</Button>
          </Group>
        </Box>
      </Stack>
    </ScrollArea>
  )
}

export default LeafSpriteDebugPanel
