import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Group, ScrollArea, Select, Stack, Text } from '@mantine/core'
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
  const texRotDeg = (target?.geometry as any)?.texRotationDeg as number | undefined

  // Загружаем атлас и исходное изображение
  const [atlas, setAtlas] = useState<{ name: string; x: number; y: number; width: number; height: number }[]>([])
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    let active = true
    fetch('/texture/leaf/LeafSet019_1K-JPG/atlas.json').then(r => r.json()).then((arr) => { if (active) setAtlas(arr || []) }).catch(() => setAtlas([]))
    const img = new Image()
    img.onload = () => { if (active) setImgEl(img) }
    img.src = '/texture/leaf/LeafSet019_1K-JPG/LeafSet019_1K-JPG_Color.jpg'
    return () => { active = false }
  }, [])

  const [currentName, setCurrentName] = useState<string | null>(null)
  useEffect(() => {
    if (spriteName) setCurrentName(spriteName)
    else if (atlas[0]) setCurrentName(atlas[0].name)
  }, [spriteName, atlas])

  const rect = useMemo(() => atlas.find(a => a.name === currentName) || atlas[0], [atlas, currentName])
  const W = imgEl?.naturalWidth || 1
  const H = imgEl?.naturalHeight || 1
  const repX = rect ? rect.width / W : 1
  const repY = rect ? rect.height / H : 1
  const offX = rect ? rect.x / W : 0
  const offY = rect ? 1 - (rect.y + rect.height) / H : 0
  const cx = offX + repX * 0.5
  const cy = offY + repY * 0.5

  // Размер предпросмотра
  const previewMaxW = 320
  const scale = W ? Math.min(1, previewMaxW / W) : 1
  const viewW = Math.round(W * scale)
  const viewH = Math.round(H * scale)

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
          </Box>
        </Box>
        <Box>
          <Text size="sm" fw={600}>Данные</Text>
          <Text size="sm">Имя: {currentName || '-'}</Text>
          <Text size="sm">Rect (px): x={rect?.x ?? '-'}, y={rect?.y ?? '-'}, w={rect?.width ?? '-'}, h={rect?.height ?? '-'}</Text>
          <Text size="sm">Изображение (px): W={W}, H={H}</Text>
          <Text size="sm">UV: repeat=({repX.toFixed(4)}, {repY.toFixed(4)}), offset=({offX.toFixed(4)}, {offY.toFixed(4)})</Text>
          <Text size="sm">UV-центр: ({cx.toFixed(4)}, {cy.toFixed(4)}), поворот={typeof texRotDeg === 'number' ? `${Math.round(texRotDeg)}°` : '-'}</Text>
        </Box>
      </Stack>
    </ScrollArea>
  )
}

export default LeafSpriteDebugPanel

