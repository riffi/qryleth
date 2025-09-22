import type { GfxHeightSampler } from '@/entities/terrain'
import { TERRAIN_TEXTURING_CONFIG } from '@/features/editor/scene/config/terrainTexturing'
import type { TerrainSplatStats } from './DebugTextureRegistry'

/**
 * Параметры генерации splatmap для до 4 слоёв текстур.
 */
export interface SplatmapParams {
  /** Размер splatmap (квадрат, степень двойки) */
  size: number
  /** Центр площадки в мировых координатах XZ */
  center: [number, number]
  /** Размеры площадки (ширина X, глубина Z) в мировых единицах */
  worldSize: { width: number; depth: number }
  /** Опорные высоты для слоёв (мировой Y), индекс в массиве = индекс слоя (0..3) */
  layerHeights: number[]
  /** Глобальная ширина перехода между слоями (метры по Y) */
  blendHeight?: number
}

/**
 * Вычислить нормализованные веса 4 каналов по высоте с треугольным профилем вокруг опорных высот.
 * @param h текущая высота Y (мировая)
 * @param heights массив опорных высот 0..3
 * @param width ширина перехода (метры по Y)
 */
function heightWeights4(h: number, heights: number[], width: number): [number, number, number, number] {
  const w = Math.max(1e-5, width)
  const hw = w * 0.5
  const count = Math.min(4, heights.length)
  const raw: number[] = [0, 0, 0, 0]

  // Треугольные профили вокруг опорных высот
  for (let i = 0; i < count; i++) {
    const d = Math.abs(h - heights[i])
    const t = Math.max(0, 1 - d / hw)
    raw[i] = t
  }

  let sum = 0
  for (let i = 0; i < count; i++) sum += raw[i]

  // Вне зон смешивания всех слоёв — выбираем ближайший слой, чтобы не было нулевых весов
  if (sum <= 1e-6) {
    if (count > 0) {
      let best = 0
      let bestD = Math.abs(h - heights[0])
      for (let i = 1; i < count; i++) {
        const d = Math.abs(h - heights[i])
        if (d < bestD) { bestD = d; best = i }
      }
      raw[best] = 1
      sum = 1
    } else {
      // На всякий случай (не должно происходить при корректном вызове)
      raw[0] = 1
      sum = 1
    }
  }

  return [raw[0] / sum, raw[1] / sum, raw[2] / sum, raw[3] / sum] as [number, number, number, number]
}

/**
 * Сгенерировать splatmap (RGBA) для до 4 слоёв на основе высот террейна.
 * Каждый канал RGBA соответствует одному слою, значения — нормализованные веса [0..1].
 *
 * Алгоритм:
 * - проходим по пикселям карты; uv = ((x+0.5)/size, (y+0.5)/size)
 * - преобразуем uv → мировые XZ: x = (uv.x - 0.5) * width + centerX; z = (uv.y - 0.5) * depth + centerZ
 * - берём высоту у сэмплера и считаем веса вокруг опорных высот с глобальной шириной перехода
 *
 * @param sampler сэмплер высот
 * @param p параметры генерации
 * @returns Canvas (можно завернуть в CanvasTexture на стороне вызова)
 */
export function buildSplatmap(sampler: GfxHeightSampler, p: SplatmapParams): { canvas: HTMLCanvasElement; stats: TerrainSplatStats; bytes: Uint8Array } {
  const size = p.size
  const cnv = document.createElement('canvas')
  cnv.width = size
  cnv.height = size
  const ctx = cnv.getContext('2d', { willReadFrequently: true } as any)!
  // Создаём явный буфер и ImageData через конструктор, чтобы исключить тонкости createImageData
  const buffer = new Uint8ClampedArray(size * size * 4)

  const cx = p.center[0]
  const cz = p.center[1]
  const w = p.worldSize.width
  const d = p.worldSize.depth
  const blend = p.blendHeight ?? TERRAIN_TEXTURING_CONFIG.blendHeightMeters

  let idx = 0
  // Диагностика: min/max высоты и каналов, счётчики argmax
  let minH = Number.POSITIVE_INFINITY
  let maxH = Number.NEGATIVE_INFINITY
  const chanMin: [number, number, number, number] = [1, 1, 1, 1]
  const chanMax: [number, number, number, number] = [0, 0, 0, 0]
  const layerCounts: [number, number, number, number] = [0, 0, 0, 0]
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size
    const wz = (v - 0.5) * d + cz
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      const wx = (u - 0.5) * w + cx
      let h = sampler.getHeight(wx, wz)
      if (!Number.isFinite(h)) {
        // Страховка от NaN/Infinity: считаем, что попали в слой 0
        h = 0
      }
      if (h < minH) minH = h
      if (h > maxH) maxH = h
      const [r, g, b, a] = heightWeights4(h, p.layerHeights, blend)
      // Обновляем диагностику каналов
      if (r < chanMin[0]) chanMin[0] = r; if (r > chanMax[0]) chanMax[0] = r
      if (g < chanMin[1]) chanMin[1] = g; if (g > chanMax[1]) chanMax[1] = g
      if (b < chanMin[2]) chanMin[2] = b; if (b > chanMax[2]) chanMax[2] = b
      if (a < chanMin[3]) chanMin[3] = a; if (a > chanMax[3]) chanMax[3] = a
      // Argmax по слоям для распределения
      let arg = 0
      let best = r
      if (g > best) { best = g; arg = 1 }
      if (b > best) { best = b; arg = 2 }
      if (a > best) { best = a; arg = 3 }
      layerCounts[arg]++
      buffer[idx++] = Math.max(0, Math.min(255, Math.round(r * 255)))
      buffer[idx++] = Math.max(0, Math.min(255, Math.round(g * 255)))
      buffer[idx++] = Math.max(0, Math.min(255, Math.round(b * 255)))
      buffer[idx++] = Math.max(0, Math.min(255, Math.round(a * 255)))
    }
  }
  const img = new ImageData(buffer, size, size)
  ctx.putImageData(img, 0, 0)
  // Дополнительно посчитаем веса в центре (для сравнения с пикселем центра канваса)
  const u0 = 0.5, v0 = 0.5
  const wx0 = (u0 - 0.5) * w + cx
  const wz0 = (v0 - 0.5) * d + cz
  let h0 = sampler.getHeight(wx0, wz0)
  if (!Number.isFinite(h0)) h0 = 0
  const w0 = heightWeights4(h0, p.layerHeights, blend)
  // Вычислим индекс центра в буфере и прочитаем байты (как должны быть записаны)
  const cxPix = Math.floor(size / 2)
  const cyPix = Math.floor(size / 2)
  const cIdx = (cyPix * size + cxPix) * 4
  const centerBytes: [number, number, number, number] = [
    buffer[cIdx] ?? 0,
    buffer[cIdx + 1] ?? 0,
    buffer[cIdx + 2] ?? 0,
    buffer[cIdx + 3] ?? 0,
  ]
  const stats: TerrainSplatStats = {
    minH: isFinite(minH) ? minH : 0,
    maxH: isFinite(maxH) ? maxH : 0,
    layerCounts,
    chanMin,
    chanMax,
    centerH: h0,
    centerWeights: w0,
    centerBytes,
  }
  // Создаём копию буфера в Uint8Array для безопасной передачи в WebGL DataTexture
  const bytes = new Uint8Array(buffer)
  return { canvas: cnv, stats, bytes }
}

// Обратная совместимость: в старых местах можно вызывать старое имя
export function buildSplatmapCanvas(sampler: GfxHeightSampler, p: SplatmapParams): HTMLCanvasElement {
  return buildSplatmap(sampler, p).canvas
}
