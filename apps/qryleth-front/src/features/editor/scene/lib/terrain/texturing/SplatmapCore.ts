import type { GfxHeightSampler } from '@/entities/terrain'
import { TERRAIN_TEXTURING_CONFIG } from '@/features/editor/scene/config/terrainTexturing'
import type { TerrainSplatStats } from './DebugTextureRegistry'

/**
 * Вычислить нормализованные веса 4 каналов по высоте с треугольным профилем вокруг опорных высот.
 * Добавлен параметр noiseOffset для смещения точек перехода между слоями.
 * @param h текущая высота Y (мировая)
 * @param heights массив опорных высот 0..3
 * @param width ширина перехода (метры по Y)
 * @param noiseOffset смещение точек перехода для добавления вариативности (в единицах высоты)
 */
export function heightWeights4(h: number, heights: number[], width: number, noiseOffset: number = 0): [number, number, number, number] {
  const count = Math.min(4, heights.length)
  const w = Math.max(1e-5, width)
  const hw = w
  const out: number[] = [0, 0, 0, 0]
  if (count <= 0) { out[0] = 1; return out as [number, number, number, number] }
  if (count === 1) { out[0] = 1; return out as [number, number, number, number] }

  const mids: number[] = []
  for (let i = 0; i < count - 1; i++) {
    const baseMid = 0.5 * (heights[i] + heights[i + 1])
    const maxOffset = 0.25 * Math.abs(heights[i + 1] - heights[i])
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, noiseOffset * w * 0.3))
    mids.push(baseMid + clampedOffset)
  }

  if (h <= mids[0] - hw) { out[0] = 1; return out as [number, number, number, number] }
  if (h >= mids[mids.length - 1] + hw) { out[count - 1] = 1; return out as [number, number, number, number] }

  let j = 0
  while (j < mids.length && h >= mids[j]) j++
  const i0 = Math.max(0, Math.min(count - 2, j))
  const i1 = i0 + 1
  const m = mids[i0]
  const x = h - m
  let t = (x + hw) / (2 * hw)
  t = Math.max(0, Math.min(1, t))
  t = t * t * (3 - 2 * t)
  out[i0] = 1 - t
  out[i1] = t
  return out as [number, number, number, number]
}

/**
 * Детерминированный псевдошум в диапазоне [-1, 1] по целочисленным координатам.
 * Используется для лёгкой вариативности переходов между слоями.
 * @param x координата пикселя по X (целое)
 * @param y координата пикселя по Y (целое)
 * @param c индекс канала/seed
 */
export function noiseSigned(x: number, y: number, c: number): number {
  const s = Math.sin((x * 12.9898 + y * 78.233 + c * 37.719) * 43758.5453)
  const v = s - Math.floor(s)
  return v * 2 - 1
}

export interface SplatmapParamsCore {
  size: number
  center: [number, number]
  worldSize: { width: number; depth: number }
  layerHeights: number[]
  blendHeight?: number
  qualityScale?: number
  blurRadiusPx?: number
}

/**
 * Чистое CPU‑ядро генерации splatmap: отдаёт только байты и статистику без Canvas/DOM.
 * Выполняется одинаково в главном потоке и в воркере.
 * @param sampler сэмплер высот террейна
 * @param p параметры генерации splatmap
 */
export function computeSplatBytes(
  sampler: GfxHeightSampler,
  p: SplatmapParamsCore
): { bytes: Uint8Array; stats: TerrainSplatStats } {
  const size = p.size
  const q = Math.max(0.25, Math.min(1.0, p.qualityScale ?? 1.0))
  const calcSize = Math.max(8, Math.floor(size * q))
  const blurR = Math.max(0, Math.floor(p.blurRadiusPx ?? 0))
  const noiseAmp = Math.max(0, Math.min(0.5, TERRAIN_TEXTURING_CONFIG.splatNoiseStrength ?? 0))

  const small = new Uint8ClampedArray(calcSize * calcSize * 4)
  const buffer = new Uint8ClampedArray(size * size * 4)

  const cx = p.center[0]
  const cz = p.center[1]
  const w = p.worldSize.width
  const d = p.worldSize.depth
  const blend = p.blendHeight ?? TERRAIN_TEXTURING_CONFIG.blendHeightMeters

  let idx = 0
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
      if (!Number.isFinite(h)) h = 0
      if (h < minH) minH = h
      if (h > maxH) maxH = h

      const noiseValue = noiseAmp > 0 ? noiseSigned(x, y, 0) * noiseAmp : 0
      const [r, g, b, a] = heightWeights4(h, p.layerHeights, blend, noiseValue)

      if (r < chanMin[0]) chanMin[0] = r; if (r > chanMax[0]) chanMax[0] = r
      if (g < chanMin[1]) chanMin[1] = g; if (g > chanMax[1]) chanMax[1] = g
      if (b < chanMin[2]) chanMin[2] = b; if (b > chanMax[2]) chanMax[2] = b
      if (a < chanMin[3]) chanMin[3] = a; if (a > chanMax[3]) chanMax[3] = a

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

  if (blurR > 0) {
    const tmp = new Uint8ClampedArray(small.length)
    for (let y = 0; y < calcSize; y++) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0
      const rowStart = y * calcSize
      for (let k = -blurR; k <= blurR; k++) {
        const xk = Math.max(0, Math.min(calcSize - 1, k))
        const i = (rowStart + xk) * 4
        sumR += small[i]; sumG += small[i+1]; sumB += small[i+2]; sumA += small[i+3]
      }
      const win = 2 * blurR + 1
      for (let x = 0; x < calcSize; x++) {
        const di = (rowStart + x) * 4
        tmp[di]   = Math.round(sumR / win)
        tmp[di+1] = Math.round(sumG / win)
        tmp[di+2] = Math.round(sumB / win)
        tmp[di+3] = Math.round(sumA / win)
        const xOut = Math.max(0, Math.min(calcSize - 1, x - blurR))
        const xIn  = Math.max(0, Math.min(calcSize - 1, x + blurR + 1))
        const iOut = (rowStart + xOut) * 4
        const iIn  = (rowStart + xIn) * 4
        sumR += small[iIn]   - small[iOut]
        sumG += small[iIn+1] - small[iOut+1]
        sumB += small[iIn+2] - small[iOut+2]
        sumA += small[iIn+3] - small[iOut+3]
      }
    }
    for (let x = 0; x < calcSize; x++) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0
      for (let k = -blurR; k <= blurR; k++) {
        const yk = Math.max(0, Math.min(calcSize - 1, k))
        const i = (yk * calcSize + x) * 4
        sumR += tmp[i]; sumG += tmp[i+1]; sumB += tmp[i+2]; sumA += tmp[i+3]
      }
      const win = 2 * blurR + 1
      for (let y = 0; y < calcSize; y++) {
        const di = (y * calcSize + x) * 4
        small[di]   = Math.round(sumR / win)
        small[di+1] = Math.round(sumG / win)
        small[di+2] = Math.round(sumB / win)
        small[di+3] = Math.round(sumA / win)
        const yOut = Math.max(0, Math.min(calcSize - 1, y - blurR))
        const yIn  = Math.max(0, Math.min(calcSize - 1, y + blurR + 1))
        const iOut = (yOut * calcSize + x) * 4
        const iIn  = (yIn  * calcSize + x) * 4
        sumR += tmp[iIn]   - tmp[iOut]
        sumG += tmp[iIn+1] - tmp[iOut+1]
        sumB += tmp[iIn+2] - tmp[iOut+2]
        sumA += tmp[iIn+3] - tmp[iOut+3]
      }
    }
  }

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

  // Центр для сравнения
  const u0 = 0.5, v0 = 0.5
  const wx0 = (u0 - 0.5) * w + cx
  const wz0 = (v0 - 0.5) * d + cz
  let h0 = sampler.getHeight(wx0, wz0)
  if (!Number.isFinite(h0)) h0 = 0
  const w0 = heightWeights4(h0, p.layerHeights, blend, 0)

  const sizeInt = size
  const cxPix = Math.floor(sizeInt / 2)
  const cyPix = Math.floor(sizeInt / 2)
  const cIdx = (cyPix * sizeInt + cxPix) * 4
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

  return { bytes: new Uint8Array(buffer), stats }
}

