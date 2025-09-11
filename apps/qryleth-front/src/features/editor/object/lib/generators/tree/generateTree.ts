import type { GfxPrimitive } from '@/entities/primitive'
import type { CreateGfxMaterial } from '@/entities/material'
import { generateUUID } from '@/shared/lib/uuid'
import { degToRad } from '@/shared/lib/math/number'
import type { TreeGeneratorParams, TreeGeneratorResult } from './types'
import * as THREE from 'three'

/**
 * Простейший детерминированный ГПСЧ (Mulberry32) для процедурной генерации.
 * При одном и том же сид‑значении выдаёт одинаковую последовательность.
 */
function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Возвращает случайное число в диапазоне [min, max), детерминированно для сидов.
 */
function randRange(rng: () => number, min: number, max: number) {
  return min + (max - min) * rng()
}

/**
 * Нормализует угол в радианы, добавляя небольшой случайный разброс.
 */
function randomTiltRad(baseDeg: number, spread: number, rng: () => number) {
  const s = Math.max(0, Math.min(1, spread))
  const jitter = (rng() * 2 - 1) * s * 0.5 * baseDeg
  return degToRad(baseDeg + jitter)
}

/**
 * Генерирует позицию цилиндра вдоль направления ветви, чтобы центр цилиндра
 * располагался посередине ветви.
 */
function cylinderCenterAt(base: [number, number, number], dir: [number, number, number], length: number) {
  const half = length / 2
  return [
    base[0] + dir[0] * half,
    base[1] + dir[1] * half,
    base[2] + dir[2] * half,
  ] as [number, number, number]
}

/**
 * Вычисляет эйлеровы углы (в радианах) для поворота вектора оси Y (0,1,0)
 * в заданное нормализованное направление dir. Упрощённая аппроксимация через yaw/pitch.
 */
function eulerFromDir(dir: [number, number, number]): [number, number, number] {
  // Используем корректное выравнивание: вращаем ось Y в направление dir через кватернион.
  const vFrom = new THREE.Vector3(0, 1, 0)
  const vTo = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(vFrom, vTo)
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
  return [e.x, e.y, e.z]
}

/**
 * Нормализует 3D‑вектор. Если длина близка к нулю — возвращает ось Y.
 */
function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2])
  if (len < 1e-6) return [0, 1, 0]
  return [v[0] / len, v[1] / len, v[2] / len]
}

/**
 * Генерация примитивов простого дерева: сегментированный ствол, ветви‑цилиндры
 * с 1–2 уровнями ветвления и листьями‑сферами на концах ветвей.
 * Каждый примитив снабжается UUID, базовыми трансформациями и привязкой к
 * материалам объекта (objectMaterialUuid), которые создаются вызвавшей стороной.
 */
export function generateTree(params: TreeGeneratorParams & {
  /** UUID материала коры (будет присвоен стволу и ветвям) */
  barkMaterialUuid: string
  /** UUID материала листвы (будет присвоен листьям) */
  leafMaterialUuid: string
}): GfxPrimitive[] {
  const rng = mulberry32(params.seed)
  const {
    trunkHeight,
    trunkRadius,
    trunkSegments,
    branchLevels,
    branchesPerSegment,
    branchLength,
    branchRadius,
    branchAngleDeg,
    randomness,
    leavesPerBranch,
    leafSize,
    barkMaterialUuid,
    leafMaterialUuid,
  } = params

  const primitives: GfxPrimitive[] = []

  // 1) Ствол: N цилиндров, сужающихся кверху
  const segH = trunkHeight / Math.max(1, trunkSegments)
  for (let i = 0; i < trunkSegments; i++) {
    const t = i / Math.max(1, trunkSegments - 1)
    const rBottom = trunkRadius * (1 - 0.4 * t)
    const rTop = trunkRadius * (1 - 0.4 * (t + 1 / trunkSegments))
    const yCenter = segH * i + segH / 2

    primitives.push({
      uuid: generateUUID(),
      type: 'trunk',
      name: `Ствол ${i + 1}`,
      geometry: {
        radiusTop: Math.max(0.02, rTop),
        radiusBottom: Math.max(0.02, rBottom),
        height: segH,
        radialSegments: 10,
      },
      objectMaterialUuid: barkMaterialUuid,
      visible: true,
      transform: {
        position: [0, yCenter, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    })
  }

  // Функция генерации ветвей рекурсивно
  type BranchArgs = {
    basePoint: [number, number, number]
    level: number
    /** Ось родительского цилиндра, для прижатия к его поверхности */
    parentAxis: [number, number, number]
    /** Радиус родительского цилиндра в точке присоединения */
    parentRadius: number
    dirHintAzimuth?: number // предпочтительное направление по азимуту, радианы
  }

  const genBranches = ({ basePoint, level, parentAxis, parentRadius, dirHintAzimuth }: BranchArgs) => {
    if (level > branchLevels) return

    const count = Math.max(0, Math.round(branchesPerSegment + (rng() - 0.5) * 2 * randomness))
    for (let i = 0; i < count; i++) {
      // Формируем локальный ортонормированный базис вокруг оси родителя
      const a = normalize(parentAxis)
      const tmp: [number, number, number] = Math.abs(a[1]) < 0.99 ? [0,1,0] : [1,0,0]
      const b1v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), new THREE.Vector3(...tmp)).normalize()
      const b2v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), b1v).normalize()

      const b1: [number, number, number] = [b1v.x, b1v.y, b1v.z]
      const b2: [number, number, number] = [b2v.x, b2v.y, b2v.z]

      // Угол отклонения от оси родителя и азимут вокруг неё
      const alpha = randomTiltRad(branchAngleDeg, params.angleSpread ?? 1, rng) // угол наклона от вертикали
      // Азимут — случайный равномерный по [0..2π] (как раньше)
      const theta = randRange(rng, 0, Math.PI * 2)
      const s = Math.sin(alpha)
      const c = Math.cos(alpha)
      const ortho: [number, number, number] = [
        b1[0] * Math.cos(theta) + b2[0] * Math.sin(theta),
        b1[1] * Math.cos(theta) + b2[1] * Math.sin(theta),
        b1[2] * Math.cos(theta) + b2[2] * Math.sin(theta),
      ]
      // Направление относительно оси родителя: dir = a*c + ortho*s
      const dir: [number, number, number] = normalize([
        a[0] * c + ortho[0] * s,
        a[1] * c + ortho[1] * s,
        a[2] * c + ortho[2] * s,
      ])
      const nDir = normalize(dir)

      // Смещаем базовую точку на поверхность родительского цилиндра (ствол или ветка):
      // берём компоненту направления, перпендикулярную оси родителя, и отступаем на parentRadius.
      const parentAxisN = normalize(parentAxis)
      const dot = nDir[0]*parentAxisN[0] + nDir[1]*parentAxisN[1] + nDir[2]*parentAxisN[2]
      // перпендикулярная составляющая
      let perp: [number, number, number] = [
        nDir[0] - dot * parentAxisN[0],
        nDir[1] - dot * parentAxisN[1],
        nDir[2] - dot * parentAxisN[2],
      ]
      const perpLen = Math.hypot(perp[0], perp[1], perp[2])
      if (perpLen < 1e-6) {
        // Выбираем любой ортонормальный вектор к оси родителя
        const tmp = Math.abs(parentAxisN[1]) < 0.99 ? [0,1,0] as [number,number,number] : [1,0,0] as [number,number,number]
        const cross = new THREE.Vector3().crossVectors(new THREE.Vector3(...parentAxisN), new THREE.Vector3(...tmp)).normalize()
        perp = [cross.x, cross.y, cross.z]
      } else {
        perp = [perp[0]/perpLen, perp[1]/perpLen, perp[2]/perpLen]
      }
      const eps = 1e-3
      const baseFromParentSurface: [number, number, number] = [
        basePoint[0] + perp[0] * (parentRadius + eps),
        basePoint[1] + perp[1] * (parentRadius + eps),
        basePoint[2] + perp[2] * (parentRadius + eps),
      ]

      // Длина и радиус зависят от уровня (тоньше/короче выше по уровню)
      const len = branchLength * Math.pow(0.75, level - 1) * (1 - 0.3 * randomness + 0.6 * randomness * rng())
      const rad = Math.max(0.01, branchRadius * Math.pow(0.7, level - 1))

      // Поворот цилиндра под направление и позиция его центра
      const rotation = eulerFromDir(nDir)
      const center = cylinderCenterAt(baseFromParentSurface, nDir, len)

      primitives.push({
        uuid: generateUUID(),
        type: 'branch',
        name: `Ветвь L${level}`,
        geometry: {
          radiusTop: rad * 0.8,
          radiusBottom: rad,
          height: len,
          radialSegments: 8,
        },
        objectMaterialUuid: barkMaterialUuid,
        visible: true,
        transform: {
          position: center,
          rotation,
          scale: [1, 1, 1],
        },
      })

      // Если достигли максимального уровня — создаём листья на конце
      if (level === branchLevels) {
        const endPoint: [number, number, number] = [
          baseFromParentSurface[0] + nDir[0] * len,
          baseFromParentSurface[1] + nDir[1] * len,
          baseFromParentSurface[2] + nDir[2] * len,
        ]

        const leaves = Math.max(0, Math.round(leavesPerBranch))
        for (let j = 0; j < leaves; j++) {
          const jitter: [number, number, number] = [
            (rng() - 0.5) * 0.2 * len,
            (rng() - 0.2) * 0.2 * len,
            (rng() - 0.5) * 0.2 * len,
          ]
          // Дополнительный "ролл" листа вокруг собственной нормали
          const roll = (rng() - 0.5) * Math.PI
          const leafEuler = eulerFromDir(nDir)
          leafEuler[2] += roll

          primitives.push({
            uuid: generateUUID(),
            type: 'leaf',
            name: 'Лист',
            geometry: { radius: Math.max(0.01, leafSize * (0.7 + 0.6 * rng())), shape: params.leafShape || 'billboard' },
            objectMaterialUuid: leafMaterialUuid,
            visible: true,
            transform: {
              position: [
                endPoint[0] + jitter[0],
                endPoint[1] + jitter[1],
                endPoint[2] + jitter[2],
              ],
              rotation: leafEuler,
              scale: [1, 1, 1],
            },
          })
        }
      } else {
        // Иначе — ответвления следующего уровня из конца текущей ветви
        const nextBase: [number, number, number] = [
          baseFromParentSurface[0] + nDir[0] * len,
          baseFromParentSurface[1] + nDir[1] * len,
          baseFromParentSurface[2] + nDir[2] * len,
        ]
        // Радиус родителя для следующего уровня — радиус вершины текущей ветки
        const parentRadiusNext = Math.max(0.005, rad * 0.8)
        // Для следующих уровней случай распределяем равномерно вокруг новой оси родителя
        genBranches({ basePoint: nextBase, level: level + 1, parentAxis: nDir, parentRadius: parentRadiusNext })
      }
    }
  }

  // 2) Размещаем ветви по высоте ствола: для каждого сегмента точка отбора — верхняя грань
  if (branchLevels > 0) {
    for (let si = 1; si < trunkSegments; si++) {
      const y = segH * si
      const basePoint: [number, number, number] = [0, y, 0]
      // Радиус ствола на данной высоте
      const ratio = Math.min(Math.max(y / trunkHeight, 0), 1)
      const rAtY = Math.max(0.02, trunkRadius * (1 - 0.4 * ratio))
      genBranches({ basePoint, level: 1, parentAxis: [0,1,0], parentRadius: rAtY })
    }
  }

  return primitives
}

/**
 * Фабрика материалов по умолчанию для дерева: «Кора» и «Листья».
 * Возвращает массив CreateGfxMaterial без UUID — UUID присваивается при добавлении в стор.
 */
export function createDefaultTreeMaterials(options?: {
  barkColor?: string
  leafColor?: string
}): CreateGfxMaterial[] {
  return [
    {
      name: 'Кора',
      type: 'dielectric',
      isGlobal: false,
      properties: {
        color: options?.barkColor ?? '#8B5A2B',
        roughness: 0.9,
        metalness: 0.0,
      },
    },
    {
      name: 'Листья',
      type: 'dielectric',
      isGlobal: false,
      properties: {
        color: options?.leafColor ?? '#2E8B57',
        roughness: 0.7,
        metalness: 0.0,
      },
    },
  ]
}
