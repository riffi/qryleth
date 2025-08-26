import { generatePerlinNoise } from '@/shared/lib/noise/perlin'
import type { GfxPerlinParams } from '@/entities/terrain'

/**
 * Создаёт функцию-источник высот на базе Перлин-шума.
 *
 * Алгоритм:
 * - Генерируем решетку шума (width+1)x(height+1) для корректного доступа к правой/нижней границе.
 * - При семплинге преобразуем мировые координаты в нормализованные UV [0..1],
 *   затем в индексы решётки и читаем ближайшее значение.
 * - Итоговая высота масштабируется коэффициентом 4 для совместимости с прежней реализацией.
 *
 * @param params — параметры генерации Перлин-шума (seed, octaveCount, amplitude, persistence, width, height)
 * @param world — размеры мира { worldWidth, worldHeight }
 * @returns функция (x,z)=>y, выдающая высоту по мировым координатам
 */
export function createPerlinSource(
  params: GfxPerlinParams,
  world: { worldWidth: number; worldHeight: number }
) {
  const noise = generatePerlinNoise(params.width + 1, params.height + 1, {
    octaveCount: params.octaveCount,
    amplitude: params.amplitude,
    persistence: params.persistence,
    seed: params.seed
  })

  return (x: number, z: number): number => {
    const halfW = world.worldWidth / 2
    const halfH = world.worldHeight / 2
    const u = (x + halfW) / world.worldWidth
    const v = (z + halfH) / world.worldHeight
    const ix = Math.max(0, Math.min(params.width, Math.floor(u * params.width)))
    const iz = Math.max(0, Math.min(params.height, Math.floor(v * params.height)))
    const idx = iz * (params.width + 1) + ix
    const value = noise[idx] || 0
    return value * 4 // масштаб совместимости
  }
}

