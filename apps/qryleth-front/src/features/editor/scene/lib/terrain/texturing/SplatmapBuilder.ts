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
  /** Радиус CPU‑размытия splat (в пикселях расчётной карты). 0 — без размытия. */
  blurRadiusPx?: number
}

/**
 * Вычислить нормализованные веса 4 каналов по высоте с треугольным профилем вокруг опорных высот.
 * @param h текущая высота Y (мировая)
 * @param heights массив опорных высот 0..3
 * @param width ширина перехода (метры по Y)
 */
function heightWeights4(h: number, heights: number[], width: number): [number, number, number, number] {
  /**
   * Монотонная схема смешивания по высоте: вне диапазона — полностью первый/последний слой,
   * между соседними опорными высотами — плавная интерполяция только между соответствующей парой
   * с шириной перехода ~ width (smoothstep вокруг средней точки).
   */
  const count = Math.min(4, heights.length)
  const w = Math.max(1e-5, width)
  // Увеличим ширину перехода: используем полный w как половину окна сглаживания
  const hw = w
  const out: number[] = [0, 0, 0, 0]
  if (count <= 0) { out[0] = 1; return out as [number, number, number, number] }
  if (count === 1) { out[0] = 1; return out as [number, number, number, number] }

  // Средние точки между слоями
  const mids: number[] = []
  for (let i = 0; i < count - 1; i++) mids.push(0.5 * (heights[i] + heights[i + 1]))

  // Вне диапазона — крайние слои
  if (h <= mids[0] - hw) { out[0] = 1; return out as [number, number, number, number] }
  if (h >= mids[mids.length - 1] + hw) { out[count - 1] = 1; return out as [number, number, number, number] }

  // Найдём пару для смешивания: h < mids[0] → (0,1), h >= mids[last] → (last-1,last)
  let j = 0
  while (j < mids.length && h >= mids[j]) j++
  const i0 = Math.max(0, Math.min(count - 2, j))
  const i1 = i0 + 1
  const m = mids[i0]
  const x = h - m
  let t = (x + hw) / (2 * hw) // линейная 0..1
  t = Math.max(0, Math.min(1, t))
  // smoothstep для мягкости
  t = t * t * (3 - 2 * t)
  out[i0] = 1 - t
  out[i1] = t
  return out as [number, number, number, number]
}

/**
 * Детерминированный псевдошум в диапазоне [-1, 1] по целочисленным координатам.
 *
 * Используется для внесения лёгкой вариативности в веса слоёв перед размытием,
 * чтобы сделать переходы между слоями менее «стерильными». Функция не обращается
 * к глобальному генератору случайных чисел, а вычисляет значение из (x, y, c),
 * что гарантирует повторяемость результата при одинаковых входах.
 *
 * @param x координата пикселя по X (целое)
 * @param y координата пикселя по Y (целое)
 * @param c индекс канала (0..3)
 * @returns число в диапазоне [-1, 1]
 */
function noiseSigned(x: number, y: number, c: number): number {
  // Простая хеш‑функция на базе синуса для детерминированного «шума»
  const s = Math.sin((x * 12.9898 + y * 78.233 + c * 37.719) * 43758.5453)
  const v = s - Math.floor(s)
  return v * 2 - 1
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
  const blurR = Math.max(0, Math.floor(p.blurRadiusPx ?? 0))
  // Амплитуда шума для весов слоёв, ограничиваем безопасным максимумом 0.25
  const noiseAmp = Math.max(0, Math.min(0.25, TERRAIN_TEXTURING_CONFIG.splatNoiseStrength ?? 0))
  const cnv = document.createElement('canvas')
  cnv.width = size
  cnv.height = size
  // Создаём 2D-контекст; указываем willReadFrequently для оптимизации чтения пикселей
  const ctx = cnv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  // Буфер для расчётного размера и финальный буфер
  const small = new Uint8ClampedArray(calcSize * calcSize * 4)
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
      // Добавим немного детерминированного шума перед размытием, чтобы сделать
      // границы между слоями менее ровными. После добавления — жёстко нормализуем веса.
      if (noiseAmp > 0) {
        const r0 = r, g0 = g, b0 = b, a0 = a
        r = Math.max(0, Math.min(1, r + noiseSigned(x, y, 0) * noiseAmp))
        g = Math.max(0, Math.min(1, g + noiseSigned(x, y, 1) * noiseAmp))
        b = Math.max(0, Math.min(1, b + noiseSigned(x, y, 2) * noiseAmp))
        a = Math.max(0, Math.min(1, a + noiseSigned(x, y, 3) * noiseAmp))
        const s = r + g + b + a
        if (s > 1e-12) {
          r/=s; g/=s; b/=s; a/=s
        } else {
          // На всякий случай, если все обнулились из-за клампа — вернём прежние нормализованные веса
          r = r0; g = g0; b = b0; a = a0
        }
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
  // Опциональное CPU‑размытие (separable box blur, 2 прохода)
  if (blurR > 0) {
    const tmp = new Uint8ClampedArray(small.length)
    // Горизонтальный
    for (let y = 0; y < calcSize; y++) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0
      const rowStart = y * calcSize
      // Инициализация окна [0..r]
      for (let k = -blurR; k <= blurR; k++) {
        const xk = Math.max(0, Math.min(calcSize - 1, k))
        const i = (rowStart + xk) * 4
        sumR += small[i]; sumG += small[i+1]; sumB += small[i+2]; sumA += small[i+3]
      }
      const win = 2 * blurR + 1
      for (let x = 0; x < calcSize; x++) {
        const di = (rowStart + x) * 4
        // Пишем среднее
        tmp[di]   = Math.round(sumR / win)
        tmp[di+1] = Math.round(sumG / win)
        tmp[di+2] = Math.round(sumB / win)
        tmp[di+3] = Math.round(sumA / win)
        // Обновляем окно: выкинуть x-blurR, добавить x+blurR+1
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
    // Вертикальный
    for (let x = 0; x < calcSize; x++) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0
      // Инициализация окна по столбцу
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
    // Примечание: box blur линейный — сумма каналов сохраняется близко к 255, renorm не обязателен
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
