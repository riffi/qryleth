import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Group, ScrollArea, Text, Tooltip } from '@mantine/core'
import { getTerrainDebugEntries, subscribeTerrainDebug } from '@/features/editor/scene/lib/terrain/texturing/DebugTextureRegistry'

/**
 * Отладочная панель текстур террейна (атласы и splatmap).
 *
 * Панель фиксируется поверх канваса рендера, содержит список площадок
 * и превью: albedo/normal/roughness/ao + splatmap. Используется только
 * для диагностики проблем с мультитекстурной раскраской.
 */
export const TerrainTextureDebugPanel: React.FC = () => {
  // Локальный флаг видимости панели (переключатель)
  const [open, setOpen] = useState(false)
  // Снимок реестра отладочных текстур
  const [tick, setTick] = useState(0)
  useEffect(() => subscribeTerrainDebug(() => setTick(v => v + 1)), [])
  const entries = useMemo(() => getTerrainDebugEntries(), [tick])

  // Превращаем канвасы в dataURL разово на рендер (чтобы отобразить как <img>)
  const makeSrc = (c?: HTMLCanvasElement | null) => {
    try { return c ? c.toDataURL('image/png') : null } catch { return null }
  }
  // Спец‑превью для splat: форсируем альфу=255, чтобы каналы RGBA были видимы на фоне
  const makeSplatSrc = (c?: HTMLCanvasElement | null) => {
    if (!c) return null
    try {
      const tmp = document.createElement('canvas')
      tmp.width = c.width; tmp.height = c.height
      const ctx = tmp.getContext('2d', { willReadFrequently: true } as any)!
      const img = ctx.createImageData(c.width, c.height)
      const srcCtx = c.getContext('2d', { willReadFrequently: true } as any)!
      const src = srcCtx.getImageData(0, 0, c.width, c.height)
      const d = img.data
      const s = src.data
      for (let i = 0; i < d.length; i += 4) {
        d[i] = s[i]; d[i+1] = s[i+1]; d[i+2] = s[i+2]; d[i+3] = 255
      }
      ctx.putImageData(img, 0, 0)
      return tmp.toDataURL('image/png')
    } catch { return null }
  }

  // Прочитать конкретный пиксель RGBA для диагностики
  const readPixel = (c: HTMLCanvasElement | undefined | null, x: number, y: number): [number, number, number, number] | null => {
    try {
      if (!c) return null
      const ctx = c.getContext('2d', { willReadFrequently: true } as any)
      if (!ctx) return null
      const clamped = ctx.getImageData(Math.max(0, Math.min(c.width - 1, x)), Math.max(0, Math.min(c.height - 1, y)), 1, 1).data
      return [clamped[0], clamped[1], clamped[2], clamped[3]]
    } catch { return null }
  }

  return (
    <Box style={{ position: 'absolute', right: 8, bottom: 8, zIndex: 10, pointerEvents: 'auto' }}>
      <Group justify="flex-end">
        <Button size="xs" variant={open ? 'filled' : 'light'} onClick={() => setOpen(v => !v)}>
          Текстуры террейна
        </Button>
      </Group>
      {open && (
        <Box style={{ marginTop: 8, width: 420, maxHeight: 420, background: 'rgba(0,0,0,0.65)', border: '1px solid #444', borderRadius: 8, overflow: 'hidden' }}>
          <ScrollArea h={420}>
            <Box p={8}>
              {entries.length === 0 && (
                <Text size="sm" c="#ddd">Нет данных: выполните генерацию атласа/splat у площадки.</Text>
              )}
              {entries.map((e) => {
                const sAlbedo = makeSrc(e.albedo)
                const sNormal = makeSrc(e.normal)
                const sRough = makeSrc(e.roughness)
                const sAO = makeSrc(e.ao)
                const sSplat = makeSplatSrc(e.splat)
                const stats = e.splatStats
                // НЕЛЬЗЯ использовать хуки внутри цикла. Читаем пиксель напрямую без useMemo
                const centerPx = readPixel(e.splat, Math.floor((e.splat?.width || 1) / 2), Math.floor((e.splat?.height || 1) / 2))
                return (
                  <Box key={e.itemId} style={{ marginBottom: 12, padding: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                    <Text size="sm" c="#eee" style={{ marginBottom: 6 }}>{e.name || e.itemId}</Text>
                    <Text size="xs" c="#bbb" style={{ marginBottom: 6 }}>
                      Атлас: {e.atlasSize || '?'} | Splat: {e.splatSize || '?'} | Слоёв: {e.layers?.length || 0}
                    </Text>
                    <Group gap={8} wrap="wrap">
                      {/*<Preview label="Albedo" src={sAlbedo} />*/}
                      {/*<Preview label="Normal" src={sNormal} />*/}
                      {/*<Preview label="Rough" src={sRough} />*/}
                      {/*<Preview label="AO" src={sAO} />*/}
                      <Preview label="Splat" src={sSplat} />
                    </Group>
                    {stats && (
                      <Box mt={8} style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid #444', borderRadius: 6, padding: 6 }}>
                        <Text size="xs" c="#ccc">Высота: min {Number.isFinite(stats.minH) ? stats.minH.toFixed(2) : '—'} | max {Number.isFinite(stats.maxH) ? stats.maxH.toFixed(2) : '—'}</Text>
                        <Text size="xs" c="#ccc">Распределение слоёв (argmax): [{(stats.layerCounts || [0,0,0,0]).join(', ')}]</Text>
                        <Text size="xs" c="#ccc">Каналы min: [{(stats.chanMin || [0,0,0,0]).map(v=>Number.isFinite(v) ? v.toFixed(2) : '—').join(', ')}] max: [{(stats.chanMax || [0,0,0,0]).map(v=>Number.isFinite(v) ? v.toFixed(2) : '—').join(', ')}]</Text>
                        <Text size="xs" c="#ccc">Центр: h={Number.isFinite(stats.centerH) ? stats.centerH.toFixed(2) : '—'}, weights=[{(stats.centerWeights || [0,0,0,0]).map(v=>Number.isFinite(v) ? v.toFixed(2) : '—').join(', ')}]</Text>
                        <Text size="xs" c="#ccc">Center bytes (buffer): [{(stats.centerBytes || [0,0,0,0]).join(', ')}]</Text>
                        {centerPx && (
                          <Text size="xs" c="#ccc">Splat@center RGBA: [{centerPx.join(', ')}]</Text>
                        )}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
          </ScrollArea>
        </Box>
      )}
    </Box>
  )
}

/**
 * Превью одного канала: рендерит картинку 128×128 с подписью.
 */
const Preview: React.FC<{ label: string; src: string | null }> = ({ label, src }) => (
  <Box style={{ width: 128 }}>
    <Tooltip label={label} openDelay={300}>
      <Box style={{ width: 128, height: 128, background: '#222', border: '1px solid #555', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {src ? (
          <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <Text size="xs" c="#777">нет</Text>
        )}
      </Box>
    </Tooltip>
    <Text size="xs" c="#ccc" ta="center" mt={4}>{label}</Text>
  </Box>
)

export default TerrainTextureDebugPanel
