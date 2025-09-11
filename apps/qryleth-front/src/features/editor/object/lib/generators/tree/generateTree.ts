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
 * Вычисляет минимальную дистанцию между двумя отрезками в 3D и
 * параметры u,v (0..1) ближайших точек на каждом из них.
 * Используется для оценки пересечений/слишком близких ветвей.
 */
function segmentDistance(
  a0: [number, number, number], a1: [number, number, number],
  b0: [number, number, number], b1: [number, number, number],
): { dist: number, u: number, v: number } {
  const ax = a0[0], ay = a0[1], az = a0[2]
  const bx = b0[0], by = b0[1], bz = b0[2]
  const u1x = a1[0] - ax, u1y = a1[1] - ay, u1z = a1[2] - az
  const u2x = b1[0] - bx, u2y = b1[1] - by, u2z = b1[2] - bz

  const rx = ax - bx, ry = ay - by, rz = az - bz
  const a = u1x*u1x + u1y*u1y + u1z*u1z
  const e = u2x*u2x + u2y*u2y + u2z*u2z
  const f = u2x*rx + u2y*ry + u2z*rz

  let s = 0, t = 0

  if (a <= 1e-9 && e <= 1e-9) {
    // Оба вырождены — расстояние между точками
    const dx = ax - bx, dy = ay - by, dz = az - bz
    return { dist: Math.hypot(dx, dy, dz), u: 0, v: 0 }
  }
  if (a <= 1e-9) {
    // Первый вырожден — проекция точки A на отрезок B
    t = Math.min(1, Math.max(0, f / e))
  } else {
    const c = u1x*rx + u1y*ry + u1z*rz
    if (e <= 1e-9) {
      // Второй вырожден — проекция точки B на отрезок A
      s = Math.min(1, Math.max(0, -c / a))
    } else {
      const b = u1x*u2x + u1y*u2y + u1z*u2z
      const denom = a*e - b*b
      if (denom !== 0) s = Math.min(1, Math.max(0, (b*f - c*e) / denom))
      else s = 0
      t = (b*s + f) / e
      if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)) }
      else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)) }
    }
  }

  const px = ax + u1x * s, py = ay + u1y * s, pz = az + u1z * s
  const qx = bx + u2x * t, qy = by + u2y * t, qz = bz + u2z * t
  const dx = px - qx, dy = py - qy, dz = pz - qz
  return { dist: Math.hypot(dx, dy, dz), u: s, v: t }
}

/**
 * Быстрая оценка штрафа за «вход в ствол»: дискретно сэмплируем путь ветки
 * и сравниваем радиальное расстояние до оси Y с радиусом ствола на той высоте.
 * Если точка попадает внутрь ствола — добавляем большой штраф.
 */
function trunkPathPenalty(
  trunkHeight: number,
  trunkRadius: number,
  base: [number, number, number],
  dir: [number, number, number],
  len: number,
  rad: number,
): number {
  let penalty = 0
  const steps = 8
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = base[0] + dir[0] * (t * len)
    const y = base[1] + dir[1] * (t * len)
    const z = base[2] + dir[2] * (t * len)
    if (y < 0 || y > trunkHeight) continue
    const distAxis = Math.hypot(x, z)
    const ratio = Math.min(Math.max(y / Math.max(1e-4, trunkHeight), 0), 1)
    const rAtY = Math.max(0.02, trunkRadius * (1 - 0.4 * ratio))
    const pen = (rAtY + rad) - distAxis
    if (pen > 0) penalty += pen * 1000 // большой штраф за вход внутрь
    else penalty += Math.max(0, -pen) * 0.1 // лёгкий штраф за близость
  }
  return penalty
}

/**
 * Эвристика «направления наружу»: штрафует направления, идущие не радиально
 * от оси ствола (в XZ‑плоскости). Чем меньше проекция на радиальный вектор, тем больше штраф.
 */
function outwardPenalty(base: [number,number,number], dir: [number,number,number]): number {
  const radial = normalize([base[0], 0, base[2]])
  const dirXZLen = Math.hypot(dir[0], dir[2])
  if (dirXZLen < 1e-6) return 10 // слишком вертикально — штраф
  const dirXZ: [number,number,number] = [dir[0]/dirXZLen, 0, dir[2]/dirXZLen]
  const d = radial[0]*dirXZ[0] + radial[2]*dirXZ[2]
  return (1 - Math.max(0, d)) * 2 // 0..2
}

/** Запись о размещённой ветви/сегменте для проверки коллизий. */
type PlacedSegment = { a: [number,number,number]; b: [number,number,number]; radius: number }

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
  // Реестр уже размещённых сегментов ветвей для проверки коллизий при подборе направлений
  const placed: PlacedSegment[] = []

  // 1) Ствол: N цилиндров, сужающихся кверху, с гладким переходом сегментов
  const segH = trunkHeight / Math.max(1, trunkSegments)
  const radiusAt = (y: number) => Math.max(0.02, trunkRadius * (1 - 0.4 * Math.min(Math.max(y / Math.max(0.0001, trunkHeight), 0), 1)))
  for (let i = 0; i < trunkSegments; i++) {
    const yBottom = segH * i
    const yTop = segH * (i + 1)
    const rBottomRaw = radiusAt(yBottom)
    const rTopRaw = radiusAt(yTop)

    // Обеспечиваем отсутствие ступенек: нижний радиус текущего сегмента = верхний предыдущего
    const prevTop = i > 0 ? radiusAt(segH * i) : rBottomRaw
    const rBottom = i > 0 ? prevTop : rBottomRaw
    const rTop = rTopRaw

    // Лёгкое взаимное перекрытие: нижняя часть сегмента утапливается в предыдущий
    const trunkEmbedFactor = params.embedFactor ?? 0.6
    const embedBottom = i > 0 ? Math.max(0.0, Math.min(1.0, trunkEmbedFactor)) * Math.min(rBottom, prevTop) : 0.0

    const height = (yTop - yBottom) + embedBottom
    const yCenter = (yBottom + yTop) / 2 - embedBottom / 2

    // «Воротник» у стыка: расширяем основание текущего сегмента, чтобы накрыть крышку предыдущего
    const collarFrac = i > 0 ? 0.18 : 0.0
    const collarScale = i > 0 && rBottom > 0 ? Math.max(1.0, prevTop / rBottom) : 1.0

    primitives.push({
      uuid: generateUUID(),
      type: 'trunk',
      name: `Ствол ${i + 1}`,
      geometry: {
        radiusTop: Math.max(0.02, rTop),
        radiusBottom: Math.max(0.02, rBottom),
        height,
        radialSegments: 10,
        collarFrac: collarFrac || undefined,
        collarScale: collarFrac > 0 ? collarScale : undefined,
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
    /** Сегмент‑родитель (для игнорирования коллизий у самой базы) */
    parentSeg?: PlacedSegment
  }

  const genBranches = ({ basePoint, level, parentAxis, parentRadius, dirHintAzimuth, parentSeg }: BranchArgs) => {
    if (level > branchLevels) return

    const count = Math.max(0, Math.round(branchesPerSegment + (rng() - 0.5) * 2 * randomness))
    for (let i = 0; i < count; i++) {
      // Подбор направления с учётом коллизий (см. цикл maxAttempts ниже)
      // Выбор лучшего направления из нескольких попыток (минимум пересечений)
      const maxAttempts = 12
      let best: null | {
        nDir: [number,number,number]
        baseInside: [number,number,number]
        embedDepth: number
        height: number
        center: [number,number,number]
        rotation: [number,number,number]
        len: number
        rad: number
        endPoint: [number,number,number]
        score: number
      } = null

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const a = normalize(parentAxis)
        const tmp: [number, number, number] = Math.abs(a[1]) < 0.99 ? [0,1,0] : [1,0,0]
        const b1v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), new THREE.Vector3(...tmp)).normalize()
        const b2v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), b1v).normalize()
        const b1: [number, number, number] = [b1v.x, b1v.y, b1v.z]
        const b2: [number, number, number] = [b2v.x, b2v.y, b2v.z]

        const alpha = randomTiltRad(branchAngleDeg, params.angleSpread ?? 1, rng)
        const theta = randRange(rng, 0, Math.PI * 2)
        const s = Math.sin(alpha)
        const c = Math.cos(alpha)
        const ortho: [number, number, number] = [
          b1[0] * Math.cos(theta) + b2[0] * Math.sin(theta),
          b1[1] * Math.cos(theta) + b2[1] * Math.sin(theta),
          b1[2] * Math.cos(theta) + b2[2] * Math.sin(theta),
        ]
        const dir: [number, number, number] = normalize([
          a[0] * c + ortho[0] * s,
          a[1] * c + ortho[1] * s,
          a[2] * c + ortho[2] * s,
        ])
        const nDir = normalize(dir)

        const parentAxisN = normalize(parentAxis)
        const dot = nDir[0]*parentAxisN[0] + nDir[1]*parentAxisN[1] + nDir[2]*parentAxisN[2]
        let perp: [number, number, number] = [
          nDir[0] - dot * parentAxisN[0],
          nDir[1] - dot * parentAxisN[1],
          nDir[2] - dot * parentAxisN[2],
        ]
        const perpLen = Math.hypot(perp[0], perp[1], perp[2])
        if (perpLen < 1e-6) {
          const tmp = Math.abs(parentAxisN[1]) < 0.99 ? [0,1,0] as [number,number,number] : [1,0,0] as [number,number,number]
          const cross = new THREE.Vector3().crossVectors(new THREE.Vector3(...parentAxisN), new THREE.Vector3(...tmp)).normalize()
          perp = [cross.x, cross.y, cross.z]
        } else {
          perp = [perp[0]/perpLen, perp[1]/perpLen, perp[2]/perpLen]
        }
        const len = branchLength * Math.pow(0.75, level - 1) * (1 - 0.3 * randomness + 0.6 * randomness * rng())
        const rad = Math.max(0.01, branchRadius * Math.pow(0.7, level - 1))
        const epsInside = Math.max(0.001, parentRadius * 0.03)
        const sinTheta = Math.max(1e-4, Math.sqrt(Math.max(0, 1 - dot * dot)))
        const embedMin = rad * Math.abs(dot) / sinTheta + 1e-3
        const embedFactor = params.embedFactor ?? 0.6
        const embedBase = Math.max(0, Math.min(1, embedFactor)) * Math.min(parentRadius, rad)
        const embedDepth = Math.max(embedBase, embedMin)
        const baseInside: [number, number, number] = [
          basePoint[0] + perp[0] * (parentRadius - epsInside),
          basePoint[1] + perp[1] * (parentRadius - epsInside),
          basePoint[2] + perp[2] * (parentRadius - epsInside),
        ]
        const height = len + embedDepth
        const center: [number, number, number] = [
          baseInside[0] + nDir[0] * ((len - embedDepth) / 2),
          baseInside[1] + nDir[1] * ((len - embedDepth) / 2),
          baseInside[2] + nDir[2] * ((len - embedDepth) / 2),
        ]
        const rotation = eulerFromDir(nDir)
        const endPoint: [number, number, number] = [
          baseInside[0] + nDir[0] * len,
          baseInside[1] + nDir[1] * len,
          baseInside[2] + nDir[2] * len,
        ]

        let score = 0
        score += trunkPathPenalty(trunkHeight, trunkRadius, baseInside, nDir, len, rad)
        for (const seg of placed) {
          if (parentSeg && seg === parentSeg) continue
          const { dist, u, v } = segmentDistance(baseInside, endPoint, seg.a, seg.b)
          const nearBase = u < 0.08 && v < 0.08
          if (nearBase) continue
          const clearance = dist - (rad + seg.radius)
          if (clearance < 0) score += (-clearance) * 500
          else score += Math.max(0, 0.05 - clearance) * 50
        }
        score += outwardPenalty(baseInside, nDir) * 5

        if (!best || score < best.score) best = { nDir, baseInside, embedDepth, height, center, rotation, len, rad, endPoint, score }
      }

      if (!best) continue
      const { nDir, baseInside, embedDepth, height, center, rotation, len, rad, endPoint } = best

      primitives.push({
        uuid: generateUUID(),
        type: 'branch',
        name: `Ветвь L${level}`,
        geometry: {
          radiusTop: rad * 0.8,
          radiusBottom: rad,
          height,
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

      // Регистрируем сегмент ветви для последующих проверок
      const currentSeg: PlacedSegment = { a: baseInside, b: endPoint, radius: rad }
      placed.push(currentSeg)

      // Если достигли максимального уровня — создаём листья на конце
      if (level === branchLevels) {

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
        // Иначе — ответвления следующего уровня из конца текущей ветви (видимой части)
        const nextBase: [number, number, number] = endPoint
        // Радиус родителя для следующего уровня — радиус вершины текущей ветки
        const parentRadiusNext = Math.max(0.005, rad * 0.8)
        // Для следующих уровней случай распределяем равномерно вокруг новой оси родителя
        genBranches({ basePoint: nextBase, level: level + 1, parentAxis: nDir, parentRadius: parentRadiusNext, parentSeg: currentSeg })
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
