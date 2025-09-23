import React, { useEffect, useMemo, useState } from 'react'
import { ActionIcon, Box, Button, Group, ScrollArea, Text, Tooltip } from '@mantine/core'
import { IconDownload } from '@tabler/icons-react'
import { getTerrainDebugEntries, subscribeTerrainDebug } from '@/features/editor/scene/lib/terrain/texturing/DebugTextureRegistry'
import type { TerrainDebugEntry } from '@/features/editor/scene/lib/terrain/texturing/DebugTextureRegistry'

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

  // ВАЖНО: избегаем toDataURL/getImageData (дорого). Для превью используем drawImage в мини‑канвас.

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
              {entries.map((e: TerrainDebugEntry) => {
                const stats = e.splatStats
                return (
                  <Box key={e.itemId} style={{ marginBottom: 12, padding: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                    <Text size="sm" c="#eee" style={{ marginBottom: 6 }}>{e.name || e.itemId}</Text>
                    <Text size="xs" c="#bbb" style={{ marginBottom: 6 }}>
                      Атлас: {e.atlasSize || '?'} | Splat: {e.splatSize || '?'} | Слоёв: {e.layers?.length || 0}
                    </Text>
                    <Group gap={8} wrap="wrap" align="flex-start">
                      <CanvasPreview label="Splat" source={e.splatPreview || e.splat || null} />
                      {e.splat && (
                        <Tooltip label="Скачать splatmap (PNG)" openDelay={300}>
                          <ActionIcon
                            variant="light"
                            aria-label="Скачать splatmap"
                            onClick={() => downloadSplatEntryAsPng(e)}
                          >
                            <IconDownload size={18} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                    {stats && (
                      <Box mt={8} style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid #444', borderRadius: 6, padding: 6 }}>
                        <Text size="xs" c="#ccc">Высота: min {Number.isFinite(stats.minH) ? stats.minH.toFixed(2) : '—'} | max {Number.isFinite(stats.maxH) ? stats.maxH.toFixed(2) : '—'}</Text>
                        <Text size="xs" c="#ccc">Распределение слоёв (argmax): [{(stats.layerCounts || [0,0,0,0]).join(', ')}]</Text>
                        <Text size="xs" c="#ccc">Каналы min: [{(stats.chanMin || [0,0,0,0]).map(v=>Number.isFinite(v) ? v.toFixed(2) : '—').join(', ')}] max: [{(stats.chanMax || [0,0,0,0]).map(v=>Number.isFinite(v) ? v.toFixed(2) : '—').join(', ')}]</Text>
                        <Text size="xs" c="#ccc">Центр: h={Number.isFinite(stats.centerH) ? stats.centerH.toFixed(2) : '—'}, weights=[{(stats.centerWeights || [0,0,0,0]).map(v=>Number.isFinite(v) ? v.toFixed(2) : '—').join(', ')}]</Text>
                        <Text size="xs" c="#ccc">Center bytes (buffer): [{(stats.centerBytes || [0,0,0,0]).join(', ')}]</Text>
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
 * Скачать PNG с полной splatmap так, чтобы изображение корректно отображалось в просмотрщиках.
 *
 * Проблема: исходный splat содержит реальные веса в RGBA, при этом канал A часто близок к 0
 * (если 4‑й слой слабый/отсутствует). При сохранении PNG с такой альфой большинство пикселей
 * становятся «прозрачными», и просмотрщик показывает «пустую» картинку.
 *
 * Решение: создаём копию канваса, где принудительно устанавливаем альфу=255 для всех пикселей
 * (делаем изображение непрозрачным), сохраняя исходные значения RGB без премультипликации.
 * Так в PNG видны все каналы, и картинка не выглядит пустой. Сам исходный сплат в движке не меняем.
 *
 * @param canvas исходный канвас splatmap (полного размера)
 * @param filename имя файла для сохранения (например, "terrain_splat_1024x1024.png")
 */
interface SplatEntryLike { itemId: string; name?: string; splat?: HTMLCanvasElement | null; splatBytes?: Uint8Array; splatSize?: number }

function downloadSplatEntryAsPng(entry: SplatEntryLike): void {
  const file = `${(entry.name || entry.itemId).replace(/\s+/g, '_')}_splat_${entry.splatSize || entry.splat?.width || 0}x${entry.splatSize || entry.splat?.height || 0}.png`
  // Если есть сырые байты и размер — собираем PNG из них, принудительно устанавливая альфу=255
  if (entry.splatBytes && entry.splatSize) {
    try {
      const size = entry.splatSize
      const cnv = document.createElement('canvas')
      cnv.width = size; cnv.height = size
      const ctx = cnv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
      const img = ctx.createImageData(size, size)
      const src = entry.splatBytes
      const dst = img.data
      for (let i = 0, n = src.length; i < n; i += 4) {
        dst[i] = src[i]
        dst[i+1] = src[i+1]
        dst[i+2] = src[i+2]
        dst[i+3] = 255
      }
      ctx.putImageData(img, 0, 0)
      return saveCanvasPng(cnv, file)
    } catch { /* ignore and fallback */ }
  }
  // Фоллбек: читаем из исходного канваса, форсим альфу=255 и сохраняем
  if (entry.splat) return downloadCanvasAsPng(entry.splat, file)
}

function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  try {
    const w = canvas.width
    const h = canvas.height
    const ctxSrc = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null
    if (!ctxSrc) throw new Error('no-2d-context')
    const img = ctxSrc.getImageData(0, 0, w, h)
    const data = img.data
    for (let i = 3; i < data.length; i += 4) data[i] = 255 // альфа=1.0 для всех пикселей
    const out = document.createElement('canvas')
    out.width = w; out.height = h
    const ctxOut = out.getContext('2d') as CanvasRenderingContext2D
    ctxOut.putImageData(img, 0, 0)
    saveCanvasPng(out, filename)
  } catch {
    // Фоллбек: пытаемся сохранить исходный канвас как есть
    try {
      saveCanvasPng(canvas, filename)
    } catch { /* ignore */ void 0 }
  }
}

function saveCanvasPng(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 'image/png')
}

// Превью канваса: быстрое и без readback, с белой подложкой, чтобы не «чернила» при альфе.
const CanvasPreview: React.FC<{ label: string; source: HTMLCanvasElement | null }> = ({ label, source }) => {
  const [node, setNode] = React.useState<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!node) return
    const ctx = node.getContext('2d', { alpha: false }) as CanvasRenderingContext2D | null
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, node.width, node.height)
    if (source) {
      try {
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(source, 0, 0, node.width, node.height)
      } catch { /* ignore */ void 0 }
    }
  }, [node, source])
  return (
    <Box style={{ width: 128 }}>
      <Tooltip label={label} openDelay={300}>
        <Box style={{ width: 128, height: 128, background: '#222', border: '1px solid #555', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <canvas ref={setNode} width={128} height={128} style={{ display: 'block' }} />
        </Box>
      </Tooltip>
      <Text size="xs" c="#ccc" ta="center" mt={4}>{label}</Text>
    </Box>
  )
}

export default TerrainTextureDebugPanel
