import { describe, it, expect } from 'vitest'
import { createRng } from '@/shared/lib/utils/prng'
import { placeUniform, placePoisson, placeGridJitter, placeRing, placePoints } from './PlacementAlgorithms'

describe('PlacementAlgorithms', () => {
  const worldWidth = 100
  const worldHeight = 80

  it('uniform: детерминированность и попадание в мир', () => {
    const rng1 = createRng(12345)
    const rng2 = createRng(12345)
    const pts1 = placeUniform(20, rng1, { worldWidth, worldHeight })
    const pts2 = placeUniform(20, rng2, { worldWidth, worldHeight })
    expect(pts1.length).toBe(20)
    expect(pts2.length).toBe(20)
    for (let i = 0; i < 20; i++) {
      expect(pts1[i]).toEqual(pts2[i])
      expect(Math.abs(pts1[i].x)).toBeLessThanOrEqual(worldWidth / 2)
      expect(Math.abs(pts1[i].z)).toBeLessThanOrEqual(worldHeight / 2)
    }
  })

  it('poisson: точки не ближе minDistance', () => {
    const rng = createRng(777)
    const minD = 5
    const pts = placePoisson(25, minD, rng, { worldWidth, worldHeight })
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x
        const dz = pts[i].z - pts[j].z
        const d = Math.hypot(dx, dz)
        expect(d).toBeGreaterThanOrEqual(minD - 1e-6)
      }
    }
  })

  it('gridJitter: количество и границы', () => {
    const rng = createRng(42)
    const count = 10
    const cell = 10
    const pts = placeGridJitter(count, cell, 0.5, rng, { worldWidth, worldHeight })
    expect(pts.length).toBe(count)
    for (const p of pts) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(worldWidth / 2 + 1e-6)
      expect(Math.abs(p.z)).toBeLessThanOrEqual(worldHeight / 2 + 1e-6)
    }
  })

  it('ring: радиус в пределах [rMin..rMax]', () => {
    const rng = createRng(99)
    const cx = 5
    const cz = -7
    const rMin = 10
    const rMax = 20
    const pts = placeRing(16, cx, cz, rMin, rMax, rng, { worldWidth, worldHeight })
    // допускаем некоторое число отфильтрованных точек у границ мира
    expect(pts.length).toBeGreaterThan(10)
    for (const p of pts) {
      const d = Math.hypot(p.x - cx, p.z - cz)
      expect(d).toBeGreaterThanOrEqual(rMin - 1e-6)
      expect(d).toBeLessThanOrEqual(rMax + 1e-6)
      expect(Math.abs(p.x)).toBeLessThanOrEqual(worldWidth / 2 + 1e-6)
      expect(Math.abs(p.z)).toBeLessThanOrEqual(worldHeight / 2 + 1e-6)
    }
  })

  it('placePoints: диспетчер по типу', () => {
    const rng = createRng(2025)
    const uniformPts = placePoints({ type: 'uniform' }, 5, rng, { worldWidth, worldHeight })
    expect(uniformPts.length).toBe(5)

    const rng2 = createRng(2025)
    const poissonPts = placePoints({ type: 'poisson', minDistance: 4 }, 8, rng2, { worldWidth, worldHeight })
    expect(poissonPts.length).toBeGreaterThan(0)
  })

  it('area.rect: поддержка нового поля depth и fallback на height', () => {
    const rng = createRng(123)
    // Полоса на севере мира: Z в [30..40] при глубине 80 → halfDepth = 40
    const ptsDepth = placePoints(
      { type: 'uniform', area: { kind: 'rect', x: -50, z: 30, width: 100, depth: 10 } },
      20,
      rng,
      { worldWidth, worldHeight }
    )
    expect(ptsDepth.length).toBe(20)
    for (const p of ptsDepth) {
      expect(p.z).toBeGreaterThanOrEqual(30 - 1e-6)
      expect(p.z).toBeLessThanOrEqual(40 + 1e-6)
    }

    const rng2 = createRng(123)
    // Тот же прямоугольник с устаревшим ключом height должен работать так же
    const ptsHeight = placePoints(
      { type: 'uniform', area: { kind: 'rect', x: -50, z: 30, width: 100, height: 10 } as any },
      20,
      rng2,
      { worldWidth, worldHeight }
    )
    expect(ptsHeight).toEqual(ptsDepth)
  })

  it('uniform + center band: координаты центрированы по миру (X/Z в допустимых диапазонах)', () => {
    const rng = createRng(2025)
    const W = 100
    const H = 80
    // Узкая центральная полоса вокруг (0,0): X ∈ [-10..+10], Z ∈ [-5..+5]
    const pts = placePoints(
      { type: 'uniform', area: { kind: 'rect', x: -10, z: -5, width: 20, depth: 10 } },
      30,
      rng,
      { worldWidth: W, worldHeight: H }
    )
    expect(pts.length).toBe(30)
    for (const p of pts) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(W / 2 + 1e-6)
      expect(Math.abs(p.z)).toBeLessThanOrEqual(H / 2 + 1e-6)
      expect(p.x).toBeGreaterThanOrEqual(-10 - 1e-6)
      expect(p.x).toBeLessThanOrEqual(10 + 1e-6)
      expect(p.z).toBeGreaterThanOrEqual(-5 - 1e-6)
      expect(p.z).toBeLessThanOrEqual(5 + 1e-6)
    }
  })
})
