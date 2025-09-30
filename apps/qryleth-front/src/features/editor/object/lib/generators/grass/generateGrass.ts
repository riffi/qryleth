import type { GfxPrimitive } from '@/entities/primitive'
import type { CreateGfxMaterial } from '@/entities/material'
import type { GrassGeneratorParams } from './types'
import { generateUUID } from '@/shared/lib/uuid'

/**
 * Простая детерминированная PRNG (mulberry32), чтобы не тянуть зависимости.
 * Возвращает функцию-генератор псевдослучайных чисел [0..1).
 */
function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Фабрика материала по умолчанию для травы: «Трава» (однотонный, двусторонний).
 * Возвращает массив CreateGfxMaterial без UUID — UUID присваивается при добавлении в стор.
 */
export function createDefaultGrassMaterials(options?: { color?: string }): CreateGfxMaterial[] {
  return [
    {
      name: 'Трава',
      type: 'dielectric',
      isGlobal: false,
      properties: {
        color: options?.color ?? '#2E8B57',
        roughness: 0.9,
        metalness: 0.0,
        side: 'double' as any,
      },
    },
  ]
}

/**
 * Генерирует единый 'mesh' примитив пучка травы из N плоских лент.
 * Ленты создаются сегментами по высоте с плавным изгибом и сужением к вершине.
 * Материал назначается через objectMaterialUuid (UUID материала травы).
 */
export function generateGrass(params: GrassGeneratorParams & { grassMaterialUuid: string }): GfxPrimitive[] {
  const rng = mulberry32(params.seed >>> 0)
  const blades = Math.max(1, Math.floor(params.blades))
  const segments = Math.max(2, Math.floor(params.segments ?? 6))
  const baseH = Math.max(0.05, params.bladeHeight)
  const hj = Math.max(0, Math.min(1, params.bladeHeightJitter ?? 0.3))
  const halfW = Math.max(0.001, params.bladeHalfWidth)
  const taper = Math.max(0, Math.min(1, params.bladeTaper ?? 1))
  const bend = Math.max(0, Math.min(1, params.bendStrength ?? 0.5))
  const radius = Math.max(0, params.clumpRadius)

  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []

  // Вспомогательная функция: добавляет два треугольника (квад) между четырьмя вершинами v00, v01, v10, v11
  function quad(i0: number, i1: number, i2: number, i3: number) {
    // треугольники: (i0,i2,i1) и (i2,i3,i1)
    indices.push(i0, i2, i1, i2, i3, i1)
  }

  // Для каждой травинки создаём плоскую ленту из (segments) отрезков (segments+1 колец)
  for (let b = 0; b < blades; b++) {
    // Случайное основание в круге радиуса clumpRadius
    const ang = rng() * Math.PI * 2
    const rad = radius * Math.sqrt(rng())
    const baseX = Math.cos(ang) * rad
    const baseZ = Math.sin(ang) * rad
    const baseY = 0

    // Высота с джиттером
    const h = baseH * (1 + (rng() * 2 - 1) * hj * 0.35)
    // Случайный азимут изгиба
    const bendYaw = rng() * Math.PI * 2
    // Лёгкое случайное отклонение «вбок» при изгибе усилит натуральность
    const bendSide = (rng() * 2 - 1) * 0.3

    // Предвычисление вершин ленты: на каждый сегмент по 2 точки (левая/правая)
    // Параметр t∈[0..1] — высотная координата
    const baseIndex = Math.floor(positions.length / 3)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      // Кривизна: парабола вверх с отклонением в плоскости направления bendYaw
      // Вертикальная компонента
      const y = baseY + h * t
      // Горизонтальное отклонение кончика: ~bend*h (линейно по t, с лёгкой параболой)
      const bendAmount = bend * h * (t * t)
      const dx = Math.cos(bendYaw) * bendAmount + Math.sin(bendYaw) * bendSide * (t * h * 0.2)
      const dz = Math.sin(bendYaw) * bendAmount - Math.cos(bendYaw) * bendSide * (t * h * 0.2)
      // Ширина ленты по высоте
      const w = halfW * (1 - taper * t)
      // Локальная «правая» ось ленты: орт в плоскости XZ перпендикулярно направлению изгиба
      const rightX = -Math.sin(bendYaw)
      const rightZ = Math.cos(bendYaw)
      // Две точки (левая и правая) относительно центральной линии
      const xL = baseX + dx - rightX * w
      const zL = baseZ + dz - rightZ * w
      const xR = baseX + dx + rightX * w
      const zR = baseZ + dz + rightZ * w
      positions.push(xL, y, zL)
      positions.push(xR, y, zR)

      // Нормали: плоская лента — берём нормаль перпендикулярно плоскости ленты (две стороны будем отрисовывать за счёт материала side=Double)
      // Для устойчивости используем аппроксимацию: нормаль вбок от «right» и вверх (чтобы было базовое нормал‑освещение)
      const nx = 0
      const ny = 1
      const nz = 0
      normals.push(nx, ny, nz)
      normals.push(nx, ny, nz)
    }

    // Соединяем сегменты квадрами
    for (let i = 0; i < segments; i++) {
      const row0 = baseIndex + i * 2
      const row1 = baseIndex + (i + 1) * 2
      quad(row0, row0 + 1, row1, row1 + 1)
    }
  }

  const primitives: GfxPrimitive[] = []
  if (positions.length > 0) {
    primitives.push({
      uuid: generateUUID(),
      type: 'mesh',
      name: 'Пучок травы',
      geometry: { positions, normals, indices },
      objectMaterialUuid: params.grassMaterialUuid,
      visible: true,
      transform: { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] },
    } as any)
  }

  return primitives
}

