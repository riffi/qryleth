/**
 * Опции генерации Перлин-шума.
 * - octaveCount: количество октав (уровней детализации), по умолчанию 4
 * - amplitude: начальная амплитуда (вклад первой октавы), по умолчанию 0.1
 * - persistence: коэффициент уменьшения амплитуды между октавами, по умолчанию 0.2
 */
export interface PerlinOptions {
  octaveCount?: number
  amplitude?: number
  persistence?: number
  /**
   * Seed для детерминированной генерации шума. При одинаковом seed
   * результат будет идентичен. Можно передавать число или строку.
   */
  seed?: number | string
}

/**
 * Генерирует карту Перлин-шума размером width x height.
 *
 * Алгоритм:
 * 1) Создает белый шум (равномерно распределенные случайные значения).
 * 2) Для каждой октавы строит «сглаженный» шум с разной частотой (samplePeriod = 2^octave).
 * 3) Смешивает сглаженные карты шумов, уменьшая вклад каждой последующей октавы согласно persistence.
 * 4) Нормализует результат по суммарной амплитуде, чтобы значения были в сопоставимом диапазоне.
 *
 * Параметры:
 * - width: ширина карты шума (количество колонок).
 * - height: высота карты шума (количество строк).
 * - options: параметры генерации (см. PerlinOptions).
 *
 * Возвращает:
 * - Массив длиной width * height с значениями в диапазоне примерно [0, 1].
 */
export function generatePerlinNoise(
  width: number,
  height: number,
  options: PerlinOptions = {}
): number[] {
  const octaveCount = options.octaveCount ?? 4
  let amplitude = options.amplitude ?? 0.1
  const persistence = options.persistence ?? 0.2

  // Создаем генератор случайных чисел: детерминированный при наличии seed
  const rng = createRng(options.seed)
  const whiteNoise = generateWhiteNoise(width, height, rng)

  const smoothNoiseList: number[][] = new Array(octaveCount)
  for (let i = 0; i < octaveCount; i += 1) {
    smoothNoiseList[i] = generateSmoothNoise(i)
  }

  const perlinNoise: number[] = new Array(width * height)
  let totalAmplitude = 0

  // Смешиваем сглаженные уровни шума начиная с высокой октавы
  for (let i = octaveCount - 1; i >= 0; i -= 1) {
    amplitude *= persistence
    totalAmplitude += amplitude

    for (let j = 0; j < perlinNoise.length; j += 1) {
      perlinNoise[j] = (perlinNoise[j] || 0) + smoothNoiseList[i][j] * amplitude
    }
  }

  // Нормализация по суммарной амплитуде
  for (let i = 0; i < perlinNoise.length; i += 1) {
    perlinNoise[i] /= totalAmplitude
  }

  return perlinNoise

  /**
   * Генерирует «сглаженный» шум для заданной октавы, интерполируя значения белого шума.
   *
   * Идея: берем сетку с шагом samplePeriod и для каждой точки (x, y)
   * интерполируем четыре ближайших «узла» белого шума (по вертикали и горизонтали).
   */
  function generateSmoothNoise(octave: number): number[] {
    const noise: number[] = new Array(width * height)
    const samplePeriod = Math.pow(2, octave)
    const sampleFrequency = 1 / samplePeriod
    let noiseIndex = 0

    for (let y = 0; y < height; y += 1) {
      const sampleY0 = Math.floor(y / samplePeriod) * samplePeriod
      const sampleY1 = (sampleY0 + samplePeriod) % height
      const vertBlend = (y - sampleY0) * sampleFrequency

      for (let x = 0; x < width; x += 1) {
        const sampleX0 = Math.floor(x / samplePeriod) * samplePeriod
        const sampleX1 = (sampleX0 + samplePeriod) % width
        const horizBlend = (x - sampleX0) * sampleFrequency

        // Смешиваем верхние два «узла»
        const top = interpolate(
          whiteNoise[sampleY0 * width + sampleX0],
          whiteNoise[sampleY1 * width + sampleX0],
          vertBlend
        )
        // Смешиваем нижние два «узла»
        const bottom = interpolate(
          whiteNoise[sampleY0 * width + sampleX1],
          whiteNoise[sampleY1 * width + sampleX1],
          vertBlend
        )
        // Финальная интерполяция по горизонтали
        noise[noiseIndex] = interpolate(top, bottom, horizBlend)
        noiseIndex += 1
      }
    }

    return noise
  }
}

/**
 * Генерирует «белый» шум для карты width x height.
 * Каждый элемент — независимое случайное число в диапазоне [0, 1).
 */
export function generateWhiteNoise(
  width: number,
  height: number,
  rng: () => number = Math.random
): number[] {
  const noise: number[] = new Array(width * height)
  for (let i = 0; i < noise.length; i += 1) {
    noise[i] = rng()
  }
  return noise
}

/**
 * Линейная интерполяция между двумя значениями.
 * - x0: начальное значение
 * - x1: конечное значение
 * - alpha: коэффициент смешивания [0..1]
 */
function interpolate(x0: number, x1: number, alpha: number): number {
  return x0 * (1 - alpha) + alpha * x1
}

/**
 * Создает генератор псевдослучайных чисел в диапазоне [0, 1).
 * Если seed не задан, возвращает стандартный Math.random.
 * Для детерминизма используется простая, быстрая схема mulberry32.
 */
function createRng(seed?: number | string): () => number {
  if (seed === undefined) return Math.random
  const s = typeof seed === 'number' ? seed >>> 0 : xfnv1a(seed)
  return mulberry32(s)
}

/**
 * Быстрый PRNG: mulberry32. Возвращает функцию генерации чисел в [0, 1).
 */
function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Хеширует строковый seed в 32-битное беззнаковое число (xfnv1a).
 */
function xfnv1a(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
