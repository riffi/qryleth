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
 * Вычисляет требуемый угол «кручения» (roll) вокруг оси axisN, чтобы нормаль плоскости листа
 * (которая при нулевом roll совпадает с мировым +Z, повёрнутым на ось через eulerFromDir)
 * совпала с заданным радиальным направлением radial.
 * Используется только для листьев с shape = 'texture', чтобы все прикреплялись одной стороной.
 */
function computeRollToAlignNormal(axisN: [number, number, number], radial: THREE.Vector3): number {
  const axis = new THREE.Vector3(axisN[0], axisN[1], axisN[2]).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis)
  // Нормаль плоскости при нулевом кручении (для PlaneGeometry(1,1) — исходная нормаль +Z)
  const normal0 = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize()
  const target = radial.clone().normalize()
  // Проекция на плоскость, перпендикулярную оси — исключаем компоненту вдоль оси
  const proj = (v: THREE.Vector3) => v.clone().sub(axis.clone().multiplyScalar(v.dot(axis)))
  const a = proj(normal0).normalize()
  const b = proj(target).normalize()
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1)
  let angle = Math.acos(dot)
  const cross = new THREE.Vector3().crossVectors(a, b)
  const sign = Math.sign(cross.dot(axis)) || 1
  angle *= sign
  return angle
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
    trunkTaperFactor,
    trunkBranchLevels,
    trunkBranchesPerLevel,
    trunkBranchAngleDeg,
    trunkBranchChildHeightFactor,
    branchLevels,
    branchesPerSegment,
    branchTopBias,
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

  // 1) Ствол(ы): один вертикальный + опциональные разветвления, с плавными стыками
  const segH = trunkHeight / Math.max(1, trunkSegments)
  const taper = trunkTaperFactor ?? 0.4
  /**
   * Функция радиуса ствола на расстоянии s [0..1] вдоль его высоты с учётом taper.
   */
  const radiusAt01 = (rBase: number, s01: number) => Math.max(0.02, rBase * (1 - Math.max(0, Math.min(1, taper)) * s01))

  /**
   * Генерирует цепочку сегментов ствола вдоль произвольного направления axis.
   * Добавляет примитивы в общий список, регистрирует сегменты в placed для коллизий,
   * а также возвращает массив точек крепления ветвей (верхние грани сегментов).
   */
  function generateTrunkChain(options: {
    basePoint: [number, number, number]
    axis: [number, number, number]
    totalHeight: number
    segments: number
    baseRadius: number
    namePrefix: string
  }): { attachments: { point: [number,number,number]; axis: [number,number,number]; radius: number }[], endPoint: [number,number,number], endRadius: number } {
    const attachments: { point: [number,number,number]; axis: [number,number,number]; radius: number }[] = []
    const a = normalize(options.axis)
    const segHLocal = options.totalHeight / Math.max(1, options.segments)
    for (let i = 0; i < options.segments; i++) {
      const sBottom = i / Math.max(1, options.segments)
      const sTop = (i + 1) / Math.max(1, options.segments)
      const rBottomRaw = radiusAt01(options.baseRadius, sBottom)
      const rTopRaw = radiusAt01(options.baseRadius, sTop)

      // Стыки: нижний радиус текущего = верхний предыдущего
      const prevTop = i > 0 ? radiusAt01(options.baseRadius, sBottom) : rBottomRaw
      const rBottom = i > 0 ? prevTop : rBottomRaw
      const rTop = rTopRaw

      // Перекрытие вниз
      const trunkEmbedFactorLocal = params.embedFactor ?? 0.6
      const embedBottom = i > 0 ? Math.max(0.0, Math.min(1.0, trunkEmbedFactorLocal)) * Math.min(rBottom, prevTop) : 0.0

      const height = segHLocal + embedBottom
      // Центр сегмента: базовая точка + ось * (i*segH + segH/2 - embedBottom/2)
      const tCenter = i * segHLocal + segHLocal / 2 - embedBottom / 2
      const center: [number,number,number] = [
        options.basePoint[0] + a[0] * tCenter,
        options.basePoint[1] + a[1] * tCenter,
        options.basePoint[2] + a[2] * tCenter,
      ]
      const rotation = eulerFromDir(a)

      // «Воротник» у стыка: расширяем основание текущего сегмента, чтобы накрыть крышку предыдущего
      const collarFrac = i > 0 ? 0.18 : 0.0
      const collarScale = i > 0 && rBottom > 0 ? Math.max(1.0, prevTop / rBottom) : 1.0

      primitives.push({
        uuid: generateUUID(),
        type: 'trunk',
        name: `${options.namePrefix} ${i + 1}`,
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
          position: center,
          rotation,
          scale: [1, 1, 1],
        },
      })

      // Регистрируем сегмент как препятствие (для избегания пересечений веток)
      const segA: [number,number,number] = [
        options.basePoint[0] + a[0] * (i * segHLocal),
        options.basePoint[1] + a[1] * (i * segHLocal),
        options.basePoint[2] + a[2] * (i * segHLocal),
      ]
      const segB: [number,number,number] = [
        options.basePoint[0] + a[0] * ((i + 1) * segHLocal),
        options.basePoint[1] + a[1] * ((i + 1) * segHLocal),
        options.basePoint[2] + a[2] * ((i + 1) * segHLocal),
      ]
      placed.push({ a: segA, b: segB, radius: Math.max(rBottom, rTop) })

      // Точка крепления ветви: верхняя грань сегмента
      attachments.push({ point: segB, axis: a, radius: Math.max(0.02, rTop) })
    }

    const endPoint: [number,number,number] = [
      options.basePoint[0] + a[0] * options.totalHeight,
      options.basePoint[1] + a[1] * options.totalHeight,
      options.basePoint[2] + a[2] * options.totalHeight,
    ]
    const endRadius = radiusAt01(options.baseRadius, 1)
    return { attachments, endPoint, endRadius }
  }

  // Генерируем основной вертикальный ствол
  const mainTrunk = generateTrunkChain({
    basePoint: [0,0,0],
    axis: [0,1,0],
    totalHeight: trunkHeight,
    segments: trunkSegments,
    baseRadius: trunkRadius,
    namePrefix: 'Ствол',
  })

  // Опционально: разветвления ствола (1..N уровней)
  const tbLevels = Math.max(0, Math.round(trunkBranchLevels ?? 0))
  const tbPerLevel = Math.max(1, Math.round(trunkBranchesPerLevel ?? 2))
  const tbAngle = degToRad(trunkBranchAngleDeg ?? 20)
  const tbHeightFactor = Math.max(0.3, Math.min(0.95, trunkBranchChildHeightFactor ?? 0.7))

  // Список всех точек крепления веток (по всем стволам)
  const trunkAttachments: { point: [number,number,number]; axis: [number,number,number]; radius: number }[] = [...mainTrunk.attachments]

  type TrunkNode = { base: [number,number,number]; axis: [number,number,number]; height: number; radius: number; segments: number }
  let currentLevel: TrunkNode[] = [{ base: [0,0,0], axis: [0,1,0], height: trunkHeight, radius: trunkRadius, segments: trunkSegments }]
  for (let lvl = 0; lvl < tbLevels; lvl++) {
    const nextLevel: TrunkNode[] = []
    for (const node of currentLevel) {
      // Стартовать ответвления с вершины данного ствола
      const startPoint: [number,number,number] = [
        node.base[0] + node.axis[0] * node.height,
        node.base[1] + node.axis[1] * node.height,
        node.base[2] + node.axis[2] * node.height,
      ]
      // Локальный ортонормированный базис вокруг оси
      const a = normalize(node.axis)
      const tmp: [number, number, number] = Math.abs(a[1]) < 0.99 ? [0,1,0] : [1,0,0]
      const b1v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), new THREE.Vector3(...tmp)).normalize()
      const b2v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), b1v).normalize()
      const b1: [number, number, number] = [b1v.x, b1v.y, b1v.z]
      const b2: [number, number, number] = [b2v.x, b2v.y, b2v.z]

      // Случайная фаза распределения по азимуту и лёгкий джиттер между ответвлениями
      const phase = randRange(rng, 0, Math.PI * 2)
      for (let k = 0; k < tbPerLevel; k++) {
        const step = (2 * Math.PI) / tbPerLevel
        const jitter = step * 0.25 * (rng() * 2 - 1) * Math.min(1, Math.max(0, randomness))
        const theta = phase + step * k + jitter
        // Наклон дочернего ствола: базовый угол с вариацией ±30% * randomness
        const alphaVar = 1 + 0.3 * (rng() * 2 - 1) * Math.min(1, Math.max(0, randomness))
        const alpha = Math.max(0, Math.min(Math.PI / 2 - 0.05, tbAngle * alphaVar))
        const s = Math.sin(alpha)
        const c = Math.cos(alpha)
        const ortho: [number, number, number] = [
          b1[0] * Math.cos(theta) + b2[0] * Math.sin(theta),
          b1[1] * Math.cos(theta) + b2[1] * Math.sin(theta),
          b1[2] * Math.cos(theta) + b2[2] * Math.sin(theta),
        ]
        const childAxis: [number,number,number] = normalize([
          a[0] * c + ortho[0] * s,
          a[1] * c + ortho[1] * s,
          a[2] * c + ortho[2] * s,
        ])
        // Высота дочернего ствола с вариацией ±25% * randomness
        const hVar = 1 + 0.25 * (rng() * 2 - 1) * Math.min(1, Math.max(0, randomness))
        const childHeightRaw = node.height * tbHeightFactor * hVar
        const childHeight = Math.max(node.height * 0.3, Math.min(node.height, childHeightRaw))
        // Базовый радиус дочернего ствола должен соответствовать верхнему радиусу родителя,
        // чтобы в месте разветвления не было утолщения/ступеньки при сильном сужении taper.
        const parentEndRadius = radiusAt01(node.radius, 1)
        const childRadius = Math.max(0.02, parentEndRadius)
        // Лёгкая вариация числа сегментов дочернего ствола (±1)
        const baseSegs = Math.round(node.segments * tbHeightFactor)
        const segJitter = (rng() < 0.5 ? -1 : 1)
        const childSegs = Math.max(2, baseSegs + (rng() < Math.min(1, Math.max(0, randomness)) ? segJitter : 0))
        const child = generateTrunkChain({
          basePoint: startPoint,
          axis: childAxis,
          totalHeight: childHeight,
          segments: childSegs,
          baseRadius: childRadius,
          namePrefix: `Ствол L${lvl+1}`,
        })
        trunkAttachments.push(...child.attachments)
        nextLevel.push({ base: startPoint, axis: childAxis, height: childHeight, radius: childRadius, segments: childSegs })
      }
    }
    currentLevel = nextLevel
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
    /** Масштаб локального количества ветвей (для биаса к верху) */
    countScale?: number
  }

  const genBranches = ({ basePoint, level, parentAxis, parentRadius, dirHintAzimuth, parentSeg, countScale }: BranchArgs) => {
    if (level > branchLevels) return

    const scale = countScale == null ? 1 : Math.max(0, countScale)
    const baseCount = branchesPerSegment * scale
    const count = Math.max(0, Math.round(baseCount + (rng() - 0.5) * 2 * randomness))
    // Чтобы ветки одного узла не «смотрели» все в одну сторону,
    // вводим штраф за схожесть азимута относительно оси родителя.
    const siblingOrthoDirs: THREE.Vector3[] = []
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
        perpOrtho: [number,number,number]
      } = null

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const a = normalize(parentAxis)
        const tmp: [number, number, number] = Math.abs(a[1]) < 0.99 ? [0,1,0] : [1,0,0]
        const b1v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), new THREE.Vector3(...tmp)).normalize()
        const b2v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), b1v).normalize()
        const b1: [number, number, number] = [b1v.x, b1v.y, b1v.z]
        const b2: [number, number, number] = [b2v.x, b2v.y, b2v.z]

        const baseAngleDeg = (level === 1)
          ? (params.branchAngleDegFirst ?? branchAngleDeg)
          : (params.branchAngleDegNext ?? branchAngleDeg)
        const alpha = randomTiltRad(baseAngleDeg, params.angleSpread ?? 1, rng)
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
        const j = Math.max(0, Math.min(1, params.branchLengthJitter ?? randomness))
        const len = branchLength * Math.pow(0.75, level - 1) * (1 - 0.3 * j + 0.6 * j * rng())
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
        // Стремление вверх: штрафуем направления с малой/отрицательной Y‑составляющей
        const upBias = Math.max(0, Math.min(1, params.branchUpBias ?? 0))
        if (upBias > 0) {
          const upY = nDir[1]
          let upPenalty = 0
          if (upY < 0) upPenalty += (-upY) * 400 * upBias // сильный штраф за «вниз»
          upPenalty += (1 - Math.max(0, upY)) * 30 * upBias // мягкий штраф за недостаточную «вверх»
          score += upPenalty
        }

        // Штраф за схожесть с уже выбранными ветками данного узла: раздвигаем по азимуту
        if (siblingOrthoDirs.length > 0) {
          const cand = new THREE.Vector3(perp[0], perp[1], perp[2])
          let simPenalty = 0
          for (const v of siblingOrthoDirs) {
            const d = Math.max(-1, Math.min(1, v.dot(cand))) // косинус между ортонормальными направлениями (вокруг оси)
            const closeness = (d + 1) * 0.5 // 0..1
            // усиливаем штраф при близости, мягко при отдалении
            simPenalty += Math.pow(closeness, 4) * 40
          }
          score += simPenalty
        }

        if (!best || score < best.score) best = { nDir, baseInside, embedDepth, height, center, rotation, len, rad, endPoint, score, perpOrtho: perp }
      }

      if (!best) continue
      const { nDir, baseInside, embedDepth, height, center, rotation, len, rad, endPoint, perpOrtho } = best

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
      // Добавляем выбранное ортонормальное направление для штрафа схожести следующих веток
      siblingOrthoDirs.push(new THREE.Vector3(perpOrtho[0], perpOrtho[1], perpOrtho[2]))

      // Если достигли максимального уровня — создаём листья согласно схеме размещения
      if (level === branchLevels) {
        const placement = params.leafPlacement || 'end'
        if (placement === 'along') {
          const density = Math.max(0.5, params.leavesPerMeter ?? 6)
          const countAlong = Math.max(1, Math.round(density * len))
          // Распределяем листья вдоль последней части ветви (например, 30%..100%)
          const tStart = 0.3
          for (let j = 0; j < countAlong; j++) {
            const tj = tStart + (1 - tStart) * ((j + rng() * 0.3) / countAlong)
            // Точка на оси ветви
            const axisPoint: [number, number, number] = [
              baseInside[0] + nDir[0] * (tj * len),
              baseInside[1] + nDir[1] * (tj * len),
              baseInside[2] + nDir[2] * (tj * len),
            ]
            // Радиальное направление и смещение РОВНО на поверхность ветки (rad + eps)
            const axisN = normalize(nDir)
            const tmp: [number, number, number] = Math.abs(axisN[1]) < 0.99 ? [0,1,0] : [1,0,0]
            const o1 = new THREE.Vector3().crossVectors(new THREE.Vector3(...axisN), new THREE.Vector3(...tmp)).normalize()
            const o2 = new THREE.Vector3().crossVectors(new THREE.Vector3(...axisN), o1).normalize()
            const aJ = rng() * Math.PI * 2
            const radial = new THREE.Vector3(
              o1.x * Math.cos(aJ) + o2.x * Math.sin(aJ),
              o1.y * Math.cos(aJ) + o2.y * Math.sin(aJ),
              o1.z * Math.cos(aJ) + o2.z * Math.sin(aJ),
            )
            const eps = Math.max(0.003, rad * 0.08)
            const radialDist = rad + eps
            const pos: [number, number, number] = [
              axisPoint[0] + radial.x * radialDist,
              axisPoint[1] + radial.y * radialDist,
              axisPoint[2] + radial.z * radialDist,
            ]
            // Небольшой тангенциальный джиттер вдоль касательного направления, чтобы избежать строгого кольца
            const tangent = new THREE.Vector3().crossVectors(new THREE.Vector3(...axisN), radial).normalize()
            const tShift = (rng() - 0.5) * Math.min(rad * 0.3, 0.02 * len)
            pos[0] += tangent.x * tShift
            pos[1] += tangent.y * tShift
            pos[2] += tangent.z * tShift

            // Готовим ориентацию/смещение для листа
            const isTexture = (params.leafShape || 'billboard') === 'texture'
            let leafEuler: [number, number, number]
            // Радиус текущего листа (детерминированный для разброса) — используем и для сдвига центра
            const leafRadius = Math.max(0.01, leafSize * (0.7 + 0.6 * rng()))
            if (isTexture) {
              // Новый базис: локальная ось Y идёт по радиусу наружу (лист тянется от ветки наружу)
              const y = radial.clone().normalize()
              const axisVec = new THREE.Vector3(...axisN)
              const tangent = new THREE.Vector3().crossVectors(axisVec, y).normalize()
              // Под углом к ветке: нормаль плоскости как смесь оси ветви и тангенса
              const angDeg = 20 + 15 * rng()
              const angSign = rng() < 0.5 ? -1 : 1
              const theta = degToRad(angDeg * angSign)
              const z = axisVec.clone().multiplyScalar(Math.cos(theta)).add(tangent.clone().multiplyScalar(Math.sin(theta))).normalize()
              const x = new THREE.Vector3().crossVectors(y, z).normalize()
              // Начальный поворот: вращаем геометрию в плоскости вокруг нормали z
              const rotDeg = (params.leafTextureRotationDeg ?? 0) % 360
              const qSpin = new THREE.Quaternion().setFromAxisAngle(z, degToRad(rotDeg))
              const x2 = x.clone().applyQuaternion(qSpin)
              const y2 = y.clone().applyQuaternion(qSpin)
              const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x2, y2, z), 'XYZ')
              leafEuler = [e.x, e.y, e.z]
              // Сдвигаем центр на половину высоты вдоль +Y, чтобы нижний край (-Y) касался поверхности ветки
              const offset = y2.clone().multiplyScalar(leafRadius * 0.5)
              pos[0] += offset.x; pos[1] += offset.y; pos[2] += offset.z
            } else {
              const roll = (rng() - 0.5) * Math.PI
              leafEuler = eulerFromDir(nDir)
              leafEuler[2] += roll
            }

            primitives.push({
              uuid: generateUUID(),
              type: 'leaf',
              name: 'Лист',
              geometry: { radius: leafRadius, shape: params.leafShape || 'billboard', texRotationDeg: (params.leafShape === 'texture' ? (params.leafTextureRotationDeg ?? 0) : undefined) as any, texSpriteName: (params.leafShape === 'texture' ? (params.leafTextureSpriteName || undefined) : undefined) as any },
              objectMaterialUuid: leafMaterialUuid,
              visible: true,
              transform: {
                position: pos,
                rotation: leafEuler,
                scale: [1, 1, 1],
              },
            })
          }
        } else {
          // На конце ветви — размещаем на поверхности торца/цилиндра, а не в воздухе
          const leaves = Math.max(0, Math.round(leavesPerBranch))
          for (let j = 0; j < leaves; j++) {
            const axisN = normalize(nDir)
            const tmp: [number, number, number] = Math.abs(axisN[1]) < 0.99 ? [0,1,0] : [1,0,0]
            const o1 = new THREE.Vector3().crossVectors(new THREE.Vector3(...axisN), new THREE.Vector3(...tmp)).normalize()
            const o2 = new THREE.Vector3().crossVectors(new THREE.Vector3(...axisN), o1).normalize()
            const aJ = rng() * Math.PI * 2
            const radial = new THREE.Vector3(
              o1.x * Math.cos(aJ) + o2.x * Math.sin(aJ),
              o1.y * Math.cos(aJ) + o2.y * Math.sin(aJ),
              o1.z * Math.cos(aJ) + o2.z * Math.sin(aJ),
            )
            const eps = Math.max(0.003, rad * 0.08)
            const radialDist = rad + eps
            const pos: [number, number, number] = [
              endPoint[0] + radial.x * radialDist,
              endPoint[1] + radial.y * radialDist,
              endPoint[2] + radial.z * radialDist,
            ]
              const isTexture = (params.leafShape || 'billboard') === 'texture'
              let leafEuler: [number, number, number]
              const leafRadius = Math.max(0.01, leafSize * (0.7 + 0.6 * rng()))
              if (isTexture) {
                const y = radial.clone().normalize()
                const axisVec = new THREE.Vector3(...axisN)
                const tangent = new THREE.Vector3().crossVectors(axisVec, y).normalize()
                const angDeg = 20 + 15 * rng()
                const angSign = rng() < 0.5 ? -1 : 1
                const theta = degToRad(angDeg * angSign)
                const z = axisVec.clone().multiplyScalar(Math.cos(theta)).add(tangent.clone().multiplyScalar(Math.sin(theta))).normalize()
                const x = new THREE.Vector3().crossVectors(y, z).normalize()
                const rotDeg = (params.leafTextureRotationDeg ?? 0) % 360
                const qSpin = new THREE.Quaternion().setFromAxisAngle(z, degToRad(rotDeg))
                const x2 = x.clone().applyQuaternion(qSpin)
                const y2 = y.clone().applyQuaternion(qSpin)
                const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x2, y2, z), 'XYZ')
                leafEuler = [e.x, e.y, e.z]
                const offset = y2.clone().multiplyScalar(leafRadius * 0.5)
                pos[0] += offset.x; pos[1] += offset.y; pos[2] += offset.z
              } else {
                const roll = (rng() - 0.5) * Math.PI
                leafEuler = eulerFromDir(nDir)
                leafEuler[2] += roll
              }
              primitives.push({
                uuid: generateUUID(),
                type: 'leaf',
                name: 'Лист',
                geometry: { radius: leafRadius, shape: params.leafShape || 'billboard', texRotationDeg: (params.leafShape === 'texture' ? (params.leafTextureRotationDeg ?? 0) : undefined) as any, texSpriteName: (params.leafShape === 'texture' ? (params.leafTextureSpriteName || undefined) : undefined) as any },
                objectMaterialUuid: leafMaterialUuid,
                visible: true,
                transform: {
                  position: pos,
                  rotation: leafEuler,
                  scale: [1, 1, 1],
                },
              })
          }
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

  // 2) Размещаем ветви по всем стволам: используем точки верхних граней сегментов
  if (branchLevels > 0) {
    // Подготовим нормировку высоты для биаса к верху по Y
    let minY = Infinity, maxY = -Infinity
    for (const att of trunkAttachments) {
      if (att.point[1] < minY) minY = att.point[1]
      if (att.point[1] > maxY) maxY = att.point[1]
    }
    const span = Math.max(1e-4, maxY - minY)
    const bias = Math.min(1, Math.max(0, branchTopBias ?? 0))
    for (const att of trunkAttachments) {
      const h01 = (att.point[1] - minY) / span
      // Вес: при 0 — равномерно (1), при 1 — квадратичная концентрация к верху (0..1 -> 0..1^2)
      const topWeight = (1 - bias) * 1 + bias * (h01 * h01)
      genBranches({ basePoint: att.point, level: 1, parentAxis: att.axis, parentRadius: att.radius, countScale: topWeight })
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
