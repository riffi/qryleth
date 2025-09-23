import type { GfxHeightSampler, GfxTerrainConfig } from '@/entities/terrain'
import { TERRAIN_TEXTURING_CONFIG } from '@/features/editor/scene/config/terrainTexturing'
import type { TerrainSplatStats } from './DebugTextureRegistry'
import { computeSplatBytes } from './SplatmapCore'

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
   * и затем bilinear‑апскейлится до `size`. Существенно ускоряет генерацию без заметной потери качества
   * благодаря последующему сглаживанию весов в шейдере.
   */
  qualityScale?: number
  /** Радиус CPU‑размытия splat (в пикселях расчётной карты). 0 — без размытия. */
  blurRadiusPx?: number
}

/**
 * Вычислить нормализованные веса 4 каналов по высоте с треугольным профилем вокруг опорных высот.
 * Добавлен параметр noiseOffset для смещения точек перехода между слоями.
 * @param h текущая высота Y (мировая)
 * @param heights массив опорных высот 0..3
 * @param width ширина перехода (метры по Y)
 * @param noiseOffset смещение точек перехода для добавления вариативности (в единицах высоты)
 */
function heightWeights4(h: number, heights: number[], width: number, noiseOffset: number = 0): [number, number, number, number] {
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

  // Средние точки между слоями с добавлением шума
  const mids: number[] = []
  for (let i = 0; i < count - 1; i++) {
    // Добавляем смещение к средней точке, но ограничиваем его,
    // чтобы не выйти за пределы соседних высот
    const baseMid = 0.5 * (heights[i] + heights[i + 1])
    const maxOffset = 0.25 * Math.abs(heights[i + 1] - heights[i])
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, noiseOffset * w * 0.3))
    mids.push(baseMid + clampedOffset)
  }

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
 * @param c индекс канала (0..3) или seed компонент
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
 * - добавляем шум к точкам перехода для создания вариативности
 *
 * @param sampler сэмплер высот
 * @param p параметры генерации
 * @returns Canvas (можно завернуть в CanvasTexture на стороне вызова)
 */
export function buildSplatmap(sampler: GfxHeightSampler, p: SplatmapParams): { canvas: HTMLCanvasElement; stats: TerrainSplatStats; bytes: Uint8Array } {
  /**
   * Локальный замер времени генерации splatmap.
   * Используем `performance.now()` при наличии (более точный high‑res таймер),
   * в противном случае — `Date.now()`.
   */
  const tStart = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now()
  const size = p.size
  const q = Math.max(0.25, Math.min(1.0, p.qualityScale ?? 1.0))
  const calcSize = Math.max(8, Math.floor(size * q))
  const blurR = Math.max(0, Math.floor(p.blurRadiusPx ?? 0))
  // Амплитуда шума для смещения переходов между слоями берётся в ядре
  const cnv = document.createElement('canvas')
  cnv.width = size
  cnv.height = size
  // Создаём 2D-контекст; указываем willReadFrequently для оптимизации чтения пикселей
  const ctx = cnv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  const { bytes, stats } = computeSplatBytes(sampler, p)
  const buffer = new Uint8ClampedArray(bytes)
  const img = new ImageData(buffer, size, size)
  ctx.putImageData(img, 0, 0)
  // Создаём копию буфера в Uint8Array для безопасной передачи в WebGL DataTexture
  // Финальный замер и вывод в консоль длительности генерации splatmap
  const tEnd = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now()
  const elapsedMs = tEnd - tStart
  // Выводим лаконичное сообщение с ключевыми параметрами
  // Пример: [Ландшафт] Splatmap создан за 12.3 мс (size: 512, q: 1, blur: 0)
  try {
    // Защита от возможных ошибок в окружении, где `console` переопределён
    console.log(`[Ландшафт] Splatmap создан за ${elapsedMs.toFixed(1)} мс (size: ${size}, q: ${(p.qualityScale ?? 1).toFixed(2)}, blur: ${blurR})`)
  } catch {
    /* ignore logging issues */
  }

  return { canvas: cnv, stats, bytes }
}

/**
 * Асинхронная генерация splatmap в Web Worker, чтобы не блокировать UI.
 * Принимает конфигурацию террейна (а не готовый сэмплер), т.к. сэмплер
 * не переносим между потоками. Воркёр создаёт свой сэмплер и выполняет
 * ту же логику, что и синхронная версия, но отдаёт только байты и статистику.
 */
export async function buildSplatmapInWorker(cfg: GfxTerrainConfig, p: SplatmapParams): Promise<{ bytes: Uint8Array; stats: TerrainSplatStats }> {
  /**
   * Измеряем длительность асинхронной генерации в воркере и логируем по завершении.
   */
  const tStart = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now()
  const blurR = Math.max(0, Math.floor(p.blurRadiusPx ?? 0))
  const q = Math.max(0.25, Math.min(1.0, p.qualityScale ?? 1.0))
  return new Promise((resolve, reject) => {
    try {
      // Динамически создаём воркера модульного типа (совместимо с Vite)
      const worker = new Worker(new URL('./workers/SplatmapWorker.ts', import.meta.url), { type: 'module' })
      const onMessage = (ev: MessageEvent) => {
        const data = ev.data as { ok: true; bytes: ArrayBuffer; stats: TerrainSplatStats } | { ok: false; error: string }
        worker.removeEventListener('message', onMessage)
        worker.terminate()
        if ((data as any).ok) {
          const tEnd = (typeof performance !== 'undefined' && typeof performance.now === 'function')
            ? performance.now()
            : Date.now()
          const elapsedMs = tEnd - tStart
          try {
            console.log(`[Ландшафт] Splatmap создан за ${elapsedMs.toFixed(1)} мс (size: ${p.size}, q: ${q.toFixed(2)}, blur: ${blurR}) [worker]`)
          } catch {}
          resolve({ bytes: new Uint8Array((data as any).bytes), stats: (data as any).stats })
        } else {
          reject(new Error((data as any).error || 'Splatmap worker failed'))
        }
      }
      worker.addEventListener('message', onMessage)
      worker.postMessage({ cfg, params: p })
    } catch (e: any) {
      reject(e)
    }
  })
}

// Обратная совместимость: в старых местах можно вызывать старое имя
export function buildSplatmapCanvas(sampler: GfxHeightSampler, p: SplatmapParams): HTMLCanvasElement {
  return buildSplatmap(sampler, p).canvas
}
