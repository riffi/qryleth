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
  /**
   * Масштаб качества вычисления (0.25..1.0). При < 1.0 карта считается на уменьшенном размере
   * и затем билinear‑апскейлится до `size`. Существенно ускоряет генерацию без заметной потери качества
   * благодаря последующему сглаживанию весов в шейдере.
   */
  qualityScale?: number
}

/**
 * Вычислить нормализованные веса 4 каналов по высоте с треугольным профилем вокруг опорных высот.
 * @param h текущая высота Y (мировая)
 * @param heights массив опорных высот 0..3
 * @param width ширина перехода (метры по Y)
 */
function heightWeights4(h: number, heights: number[], width: number): [number, number, number, number] {
  // Гауссовы профили вокруг опорных высот дают более плавные переходы,
  // чем треугольные. Сигма ~ width / 2.355 (FWHM), но берём чуть шире для гладкости.
  const w = Math.max(1e-5, width)
  const sigma = Math.max(1e-4, w / 2.0)
  const inv2s2 = 1.0 / (2.0 * sigma * sigma)
  const count = Math.min(4, heights.length)
  const raw: number[] = [0, 0, 0, 0]

  for (let i = 0; i < count; i++) {
    const d = h - heights[i]
    raw[i] = Math.exp(-(d * d) * inv2s2)
  }

  let sum = 0
  for (let i = 0; i < count; i++) sum += raw[i]
  if (sum <= 1e-12) {
    if (count > 0) { raw[0] = 1; sum = 1 } else { return [1, 0, 0, 0] }
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
  const q = Math.max(0.25, Math.min(1.0, p.qualityScale ?? 1.0))
  const calcSize = Math.max(8, Math.floor(size * q))
  const cnv = document.createElement('canvas')
  cnv.width = size
  cnv.height = size
  const ctx = cnv.getContext('2d', { willReadFrequently: true } as any)!
  // Буфер для расчётного размера и финальный буфер
  const small = new Uint8ClampedArray(calcSize * calcSize * 4)
  const buffer = new Uint8ClampedArray(size * size * 4)

  const cx = p.center[0]
  const cz = p.center[1]
  const w = p.worldSize.width
  const d = p.worldSize.depth
  const blend = p.blendHeight ?? TERRAIN_TEXTURING_CONFIG.blendHeightMeters
  const expK = Math.max(1, TERRAIN_TEXTURING_CONFIG.splatWeightExponent ?? 1)

  let idx = 0
  // Диагностика: min/max высоты и каналов, счётчики argmax
  let minH = Number.POSITIVE_INFINITY
  let maxH = Number.NEGATIVE_INFINITY
  const chanMin: [number, number, number, number] = [1, 1, 1, 1]
  const chanMax: [number, number, number, number] = [0, 0, 0, 0]
  const layerCounts: [number, number, number, number] = [0, 0, 0, 0]
  for (let y = 0; y < calcSize; y++) {
    const v = (y + 0.5) / calcSize
    const wz = (v - 0.5) * d + cz
    for (let x = 0; x < calcSize; x++) {
      const u = (x + 0.5) / calcSize
      const wx = (u - 0.5) * w + cx
      let h = sampler.getHeight(wx, wz)
      if (!Number.isFinite(h)) {
        // Страховка от NaN/Infinity: считаем, что попали в слой 0
        h = 0
      }
      if (h < minH) minH = h
      if (h > maxH) maxH = h
      let [r, g, b, a] = heightWeights4(h, p.layerHeights, blend)
      // Усилим доминирующий слой и ослабим паразитные «хвосты» малых весов
      if (expK > 1.0001) {
        r = Math.pow(r, expK); g = Math.pow(g, expK); b = Math.pow(b, expK); a = Math.pow(a, expK)
        const s = r + g + b + a
        if (s > 1e-12) { r/=s; g/=s; b/=s; a/=s }
      }
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
      small[idx++] = Math.max(0, Math.min(255, Math.round(r * 255)))
      small[idx++] = Math.max(0, Math.min(255, Math.round(g * 255)))
      small[idx++] = Math.max(0, Math.min(255, Math.round(b * 255)))
      small[idx++] = Math.max(0, Math.min(255, Math.round(a * 255)))
    }
  }
  // Если расчётный размер меньше финального — билinear‑апскейл
  if (calcSize !== size) {
    let di = 0
    const sx = calcSize / size
    const sy = calcSize / size
    for (let y = 0; y < size; y++) {
      const fy = (y + 0.5) * sy - 0.5
      const y0 = Math.max(0, Math.min(calcSize - 1, Math.floor(fy)))
      const y1 = Math.max(0, Math.min(calcSize - 1, y0 + 1))
      const wy = fy - y0
      for (let x = 0; x < size; x++) {
        const fx = (x + 0.5) * sx - 0.5
        const x0 = Math.max(0, Math.min(calcSize - 1, Math.floor(fx)))
        const x1 = Math.max(0, Math.min(calcSize - 1, x0 + 1))
        const wx = fx - x0
        const i00 = (y0 * calcSize + x0) * 4
        const i10 = (y0 * calcSize + x1) * 4
        const i01 = (y1 * calcSize + x0) * 4
        const i11 = (y1 * calcSize + x1) * 4
        for (let c = 0; c < 4; c++) {
          const v00 = small[i00 + c]
          const v10 = small[i10 + c]
          const v01 = small[i01 + c]
          const v11 = small[i11 + c]
          const v0 = v00 + (v10 - v00) * wx
          const v1 = v01 + (v11 - v01) * wx
          buffer[di++] = v0 + (v1 - v0) * wy
        }
      }
    }
  } else {
    buffer.set(small)
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
