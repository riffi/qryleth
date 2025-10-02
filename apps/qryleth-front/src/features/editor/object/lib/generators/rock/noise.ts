import { createNoise3D } from 'simplex-noise'
import { mulberry32 } from '@/shared/lib/utils/prng'

export type NoiseFunction = (x: number, y: number, z: number) => number

/**
 * Создаёт 3D‑шум с привязкой к seed, используя simplex‑noise и общий PRNG.
 */
export function createSeededNoise(seed: number): NoiseFunction {
  const rng = mulberry32(seed >>> 0)
  return createNoise3D(() => rng() * 2 - 1)
}

/**
 * Фрактальный шум (FBM): несколько октав базового шума.
 */
export function fbm(noise: NoiseFunction, x: number, y: number, z: number, octaves = 4): number {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0
  for (let i = 0; i < octaves; i++) {
    value += noise(x * frequency, y * frequency, z * frequency) * amplitude
    maxValue += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return value / maxValue
}

