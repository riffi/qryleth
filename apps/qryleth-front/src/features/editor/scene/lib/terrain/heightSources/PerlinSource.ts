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
 * @param world — размеры мира { worldWidth, worldDepth }
 * @returns функция (x,z)=>y, выдающая высоту по мировым координатам
 */
/**
 * Создаёт функцию-источник высот на базе Перлин-шума.
 *
 * Особенности реализации:
 * - Значения шума, сгенерированные `generatePerlinNoise`, находятся примерно в диапазоне [0..1].
 * - Для совместимости с прежними настройками высота масштабируется на коэффициент 4.
 * - Поддерживается «DC-смещение» базового уровня через `params.heightOffset` —
 *   это позволяет опускать/поднимать базу рельефа относительно Y=0.
 *
 * @param params — параметры генерации Перлин-шума (seed, octaveCount, amplitude, persistence, width, height, heightOffset?)
 * @param world — размеры мира { worldWidth, worldDepth }
 * @returns функция (x,z)=>y, выдающая высоту по мировым координатам
 */
export function createPerlinSource(
  params: GfxPerlinParams,
  world: { worldWidth: number; worldDepth: number }
) {
  const noise = generatePerlinNoise(params.width + 1, params.height + 1, {
    octaveCount: params.octaveCount,
    amplitude: params.amplitude,
    persistence: params.persistence,
    seed: params.seed
  })

  return (x: number, z: number): number => {
    const halfW = world.worldWidth / 2
    const halfH = world.worldDepth / 2
    const u = (x + halfW) / world.worldWidth
    const v = (z + halfH) / world.worldDepth
    const ix = Math.max(0, Math.min(params.width, Math.floor(u * params.width)))
    const iz = Math.max(0, Math.min(params.height, Math.floor(v * params.height)))
    const idx = iz * (params.width + 1) + ix
    const value = noise[idx] || 0
    const base = (params.heightOffset ?? 0)
    // Масштабируем шум и применяем базовое смещение (DC-смещение)
    return value * 4 + base
  }
}
