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
 * Создаёт 3–5 контрольных точек кривой ветви с небольшим прогибом вниз и шумом.
 *
 * - Начальная точка совпадает с местом крепления ветви (baseInside).
 * - Основное направление ростка — вдоль nDir на длину len.
 * - Добавляется лёгкая «оседлость» вниз по миру (‑Y) и небольшой боковой шум в плоскости, перпендикулярной оси ветви.
 * - Количество точек подбирается динамически: 4 точки (0, ~0.3L, ~0.65L, L) дают мягкий изгиб.
 */
function buildBranchCurvePoints(
  baseInside: [number, number, number],
  nDir: [number, number, number],
  len: number,
  rng: () => number,
  bendBase?: number,
  bendJitter?: number,
): THREE.Vector3[] {
  // Ортонормальный базис вокруг оси ветви: o1, o2 — перпендикулярные nDir
  const axis = new THREE.Vector3(nDir[0], nDir[1], nDir[2]).normalize()
  const tmp = Math.abs(axis.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const o1 = new THREE.Vector3().crossVectors(axis, tmp).normalize()
  const o2 = new THREE.Vector3().crossVectors(axis, o1).normalize()

  // Коэффициент «провиса» вниз: сильнее для более горизонтальных ветвей
  const up = Math.max(0, Math.min(1, axis.y))
  const styr = Math.max(0, Math.min(1, bendBase ?? 0.5))
  // Базовая «оседлость» вниз масштабируется styr: 0 → 20% от базового, 1 → 200% от базового
  const droopBase = (1 - up) * 0.12 * (0.2 + 1.8 * styr)

  // Боковой шум в перпендикулярной плоскости: небольшой (до ~4% длины)
  const jitterLevel = Math.max(0, Math.min(1, bendJitter ?? 0.4))
  const lateralAmp = 0.04 * len * (0.2 + 1.8 * jitterLevel)
  const jitter = (amp: number) => {
    const a = (rng() * 2 - 1) * amp
    const b = (rng() * 2 - 1) * amp
    return new THREE.Vector3().addScaledVector(o1, a).addScaledVector(o2, b)
  }

  const P0 = new THREE.Vector3(baseInside[0], baseInside[1], baseInside[2])
  const P1 = new THREE.Vector3().copy(P0).addScaledVector(axis, 0.32 * len)
    .add(new THREE.Vector3(0, -droopBase * len * (0.25 + 0.5 * jitterLevel * rng()), 0))
    .add(jitter(lateralAmp * 0.25))
  const P2 = new THREE.Vector3().copy(P0).addScaledVector(axis, 0.66 * len)
    .add(new THREE.Vector3(0, -droopBase * len * (0.55 + 0.7 * jitterLevel * rng()), 0))
    .add(jitter(lateralAmp * 0.5))
  const P3 = new THREE.Vector3().copy(P0).addScaledVector(axis, 1.00 * len)
    .add(new THREE.Vector3(0, -droopBase * len * (0.85 + 0.3 * jitterLevel * rng()), 0))
    .add(jitter(lateralAmp * 0.3))

  return [P0, P1, P2, P3]
}

/**
 * Строит один общий mesh‑примитив трубки по кривой с лёгким сужением к кончику.
 *
 * Реализация:
 * - Кривая: THREE.CatmullRomCurve3 через заданные точки (не закрытая, непрерывная касательная).
 * - Сужение: трубка разбивается на 2–3 под‑секции с уменьшающимся радиусом; геометрии сшиваются в один буфер.
 * - UV: используем uv TubeGeometry и нормируем компоненту v по общей длине (для непрерывной коры).
 */
function buildTaperedTubeMesh(
  points: THREE.Vector3[],
  baseRadius: number,
  options?: { tubularSegments?: number; radialSegments?: number; taper?: (t: number) => number; collarFrac?: number; collarScale?: number; collarBulgeExtra?: number; vStart?: number; vScale?: number; uAngleOffset?: number; uRefRadius?: number; useParallelTransport?: boolean; refNormal?: [number,number,number] }
): { positions: number[]; normals: number[]; indices: number[]; uvs: number[]; endPoint: [number, number, number]; endTangent: [number, number, number]; endRadius: number } {
  const tubularSegments = Math.max(8, Math.min(96, options?.tubularSegments ?? 24))
  const radialSegments = Math.max(6, Math.min(24, options?.radialSegments ?? 8))
  const taper = options?.taper || ((t: number) => 1 - 0.35 * t) // линейное сужение к концу
  const collarFrac = Math.max(0, Math.min(1, options?.collarFrac ?? 0))
  // Разрешаем collarScale < 1 для сужения основания, если родитель тоньше
  const collarScale = Math.max(0.2, options?.collarScale ?? 1)
  // Дополнительная «высота» воротника (0..1): усиливает стартовый максимум, но профиль остаётся МОНОТОННО спадающим
  const collarBulgeExtra = Math.max(0, Math.min(1, options?.collarBulgeExtra ?? 0))

  // Единая Catmull‑Rom кривая по всем точкам
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
  // Кадры: по умолчанию используем параллельный транспорт для минимального кручения
  const usePT = options?.useParallelTransport ?? true
  const tangents: THREE.Vector3[] = []
  const normalsPT: THREE.Vector3[] = []
  const binormalsPT: THREE.Vector3[] = []
  for (let i = 0; i <= tubularSegments; i++) tangents.push(curve.getTangent(i / tubularSegments).normalize())
  if (usePT) {
    // Инициализация начальной нормали из refNormal (если задана) или из мирового up/x
    const t0 = tangents[0]
    let ref = options?.refNormal ? new THREE.Vector3(options.refNormal[0], options.refNormal[1], options.refNormal[2]) : (Math.abs(t0.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0))
    // Проецируем ref на плоскость, перпендикулярную t0
    ref = ref.sub(t0.clone().multiplyScalar(ref.dot(t0))).normalize()
    normalsPT[0] = ref.clone()
    binormalsPT[0] = new THREE.Vector3().crossVectors(t0, normalsPT[0]).normalize()
    for (let i = 1; i <= tubularSegments; i++) {
      const prevT = tangents[i-1]
      const currT = tangents[i]
      const q = new THREE.Quaternion().setFromUnitVectors(prevT.clone().normalize(), currT.clone().normalize())
      normalsPT[i] = normalsPT[i-1].clone().applyQuaternion(q).normalize()
      // Ре-ортонормировка
      binormalsPT[i] = new THREE.Vector3().crossVectors(currT, normalsPT[i]).normalize()
      normalsPT[i] = new THREE.Vector3().crossVectors(binormalsPT[i], currT).normalize()
    }
  }

  const ringCount = tubularSegments + 1
  const vertexCount = ringCount * (radialSegments + 1)
  const positions = new Array<number>(vertexCount * 3)
  // Временные нормали пересчитаем через BufferGeometry.computeVertexNormals()
  const normals = new Array<number>(vertexCount * 3)
  const uvs = new Array<number>(vertexCount * 2)
  const indices: number[] = []
  // Радиальные векторы для проверки ориентации нормалей (dot>0 — нормали наружу)
  const radialRef = new Array<number>(vertexCount * 3)
  const vStart = options?.vStart ?? 0
  const vScale = options?.vScale ?? 1
  const uOffset = options?.uAngleOffset ?? 0
  const uRefRadius = options?.uRefRadius

  // Предвычисляем центры и накопленную длину по дуге для равномерной плотности UV по V
  const centers: THREE.Vector3[] = new Array(ringCount)
  const cumLen: number[] = new Array(ringCount)
  let totalLen = 0
  for (let i = 0; i < ringCount; i++) {
    const t = i / tubularSegments
    const c = curve.getPoint(t)
    centers[i] = c
    if (i === 0) cumLen[i] = 0
    else {
      const prev = centers[i - 1]
      const dl = Math.hypot(c.x - prev.x, c.y - prev.y, c.z - prev.z)
      totalLen += dl
      cumLen[i] = totalLen
    }
  }
  const invTotalLen = totalLen > 1e-8 ? 1 / totalLen : 0

  // Генерация колец
  for (let i = 0; i < ringCount; i++) {
    const t = i / tubularSegments
    const center = centers[i]
    const normal = usePT ? normalsPT[i] : curve.computeFrenetFrames(tubularSegments, false).normals[i]
    const binormal = usePT ? binormalsPT[i] : curve.computeFrenetFrames(tubularSegments, false).binormals[i]
    // «Воротник» у основания: МОНОТОННОЕ уменьшение от стартового максимума к 1 на участке [0..collarFrac]
    let collar = 1
    if (collarFrac > 0 && t < collarFrac) {
      const k = t / Math.max(1e-4, collarFrac)
      // Применяем воротник только при collarScale>1 (если <1 — сужение уже учтено базовым радиусом)
      const startScale = collarScale > 1 ? collarScale * (1 + 0.5 * collarBulgeExtra) : 1
      // Плавный спад (smoothstep) от startScale к 1
      const s = k * k * (3 - 2 * k)
      collar = startScale * (1 - s) + 1 * s
    }
    const radius = Math.max(0.003, baseRadius * Math.max(0.05, taper(t)) * collar)
    for (let j = 0; j <= radialSegments; j++) {
      const uNorm = j / radialSegments
      const angle = uNorm * Math.PI * 2 + uOffset
      const cx = Math.cos(angle), sx = Math.sin(angle)
      const rx = normal.x * cx + binormal.x * sx
      const ry = normal.y * cx + binormal.y * sx
      const rz = normal.z * cx + binormal.z * sx

      const vx = center.x + radius * rx
      const vy = center.y + radius * ry
      const vz = center.z + radius * rz

      const idx = i * (radialSegments + 1) + j
      positions[3 * idx + 0] = vx
      positions[3 * idx + 1] = vy
      positions[3 * idx + 2] = vz
      // Нормаль — радиальный вектор без учёта taper (для гладкого освещения)
      // Сохраняем референс радиального направления для пост‑проверки ориентации
      radialRef[3 * idx + 0] = rx
      radialRef[3 * idx + 1] = ry
      radialRef[3 * idx + 2] = rz
      // U: по дуговой длине для согласования плотности с радиусом опоры
      if (uRefRadius && uRefRadius > 1e-6) {
        const s = (angle) * radius // дуговая длина при угле 'angle'
        const sRef = 2 * Math.PI * uRefRadius
        uvs[2 * idx + 0] = s / sRef
      } else {
        uvs[2 * idx + 0] = uNorm
      }
      // V: равномерно по дуговой длине для устранения растяжений на участках разной кривизны
      const vAlong = (cumLen[i] * invTotalLen)
      uvs[2 * idx + 1] = vStart + vAlong * vScale
    }
  }

  // Индексы между соседними кольцами
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j
      const b = (i + 1) * (radialSegments + 1) + j
      const c = (i + 1) * (radialSegments + 1) + (j + 1)
      const d = i * (radialSegments + 1) + (j + 1)
      indices.push(a, b, d)
      indices.push(b, c, d)
    }
  }

  // Крышки трубки: начало (t=0) и конец (t=1)
  // Начальный центр и нормаль наружу (вдоль -tangent)
  const startCenterIndex = (positions.length / 3) | 0
  const p0 = curve.getPoint(0)
  const t0 = tangents[0].clone().normalize()
  positions.push(p0.x, p0.y, p0.z)
  uvs.push(0.5, 0.5)
  // нормаль будет перерасчитана, но зададим приблизительно для правильного направления
  normals.push(-t0.x, -t0.y, -t0.z)
  const base0 = 0
  for (let j = 0; j < radialSegments; j++) {
    const a = base0 + j
    const b = base0 + (j + 1)
    // Оба порядка вершин: гарантируем видимость при любом глобальном развороте меша
    indices.push(startCenterIndex, b, a)
    indices.push(startCenterIndex, a, b)
  }

  // Конечный центр и нормаль наружу (вдоль +tangent)
  const endCenterIndex = (positions.length / 3) | 0
  const p1 = curve.getPoint(1)
  const t1 = tangents[tangents.length - 1].clone().normalize()
  positions.push(p1.x, p1.y, p1.z)
  uvs.push(0.5, 0.5)
  normals.push(t1.x, t1.y, t1.z)
  const baseN = tubularSegments * (radialSegments + 1)
  for (let j = 0; j < radialSegments; j++) {
    const a = baseN + j
    const b = baseN + (j + 1)
    // Оба порядка вершин
    indices.push(endCenterIndex, a, b)
    indices.push(endCenterIndex, b, a)
  }

  // Пересчёт нормалей по истинной геометрии — сглаживает освещение и учитывает taper
  const bg = new THREE.BufferGeometry()
  bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  bg.setIndex(indices)
  bg.computeVertexNormals()
  const nAttr = bg.getAttribute('normal') as THREE.BufferAttribute
  for (let i = 0; i < nAttr.count; i++) {
    normals[3*i+0] = nAttr.getX(i)
    normals[3*i+1] = nAttr.getY(i)
    normals[3*i+2] = nAttr.getZ(i)
  }
  // Проверка ориентации нормалей: если усреднённый dot < 0, переворачиваем все нормали
  let dotSum = 0
  for (let i = 0; i < vertexCount; i++) {
    const nx = normals[3*i], ny = normals[3*i+1], nz = normals[3*i+2]
    const rx = radialRef[3*i], ry = radialRef[3*i+1], rz = radialRef[3*i+2]
    dotSum += nx*rx + ny*ry + nz*rz
  }
  if (dotSum < 0) {
    // Инвертируем нормали и переворачиваем порядок вершин в каждом треугольнике (меняем ориентацию граней наружу)
    for (let i = 0; i < normals.length; i++) normals[i] = -normals[i]
    for (let k = 0; k < indices.length; k += 3) {
      const tmp = indices[k + 1]
      indices[k + 1] = indices[k + 2]
      indices[k + 2] = tmp
    }
  }
  bg.dispose()

  const endVec = curve.getPoint(1)
  const endPoint: [number, number, number] = [endVec.x, endVec.y, endVec.z]
  const endTanV = tangents[tangents.length - 1].clone().normalize()
  const endTangent: [number, number, number] = [endTanV.x, endTanV.y, endTanV.z]
  const endRadius = Math.max(0.003, baseRadius * Math.max(0.05, (options?.taper || ((t:number)=>1-0.35*t))(1)))
  return { positions, normals, indices, uvs, endPoint, endTangent, endRadius }
}

/**
 * Создаёт точки кривой ствола по высоте с лёгким боковым изгибом без «провиса» вниз.
 * Сила изгиба масштабируется параметром shearStrength (0..1) и randomness.
 */
function buildTrunkCurvePoints(
  height: number,
  shearStrength: number | undefined,
  rng: () => number,
  randomness: number | undefined,
): THREE.Vector3[] {
  const s = Math.max(0, Math.min(1, shearStrength ?? 0))
  const rnd = Math.max(0, Math.min(1, randomness ?? 0.3))
  const up = new THREE.Vector3(0, 1, 0)
  // Случайная ориентация бокового отклонения
  const phi = rng() * Math.PI * 2
  const side = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi))
  const side2 = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi))
  // Амплитуда бокового изгиба: до ~10% высоты при s=1, усиливаем рандомом
  const amp = height * (0.04 + 0.08 * s) * (0.7 + 0.6 * rnd)
  const jitter = (k: number) => side.clone().multiplyScalar(amp * k * (0.6 + 0.8 * (rng() - 0.5)))
    .add(side2.clone().multiplyScalar(amp * k * (rng() - 0.5) * 0.5))

  const P0 = new THREE.Vector3(0, 0, 0)
  const P1 = new THREE.Vector3().copy(P0).addScaledVector(up, height * 0.33).add(jitter(0.4))
  const P2 = new THREE.Vector3().copy(P0).addScaledVector(up, height * 0.66).add(jitter(0.8))
  const P3 = new THREE.Vector3().copy(P0).addScaledVector(up, height * 1.00).add(jitter(0.5))
  return [P0, P1, P2, P3]
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
// Находит ближайшую точку на полилинии (centers) и возвращает индекс сегмента и параметр t (0..1)
function nearestOnCenterline(centers: [number,number,number][], p: [number,number,number]): { seg: number; t: number; point: [number,number,number] } {
  let best: { seg: number; t: number; point: [number,number,number]; d2: number } | null = null
  for (let i = 0; i < centers.length - 1; i++) {
    const a = centers[i], b = centers[i+1]
    const ab: [number,number,number] = [b[0]-a[0], b[1]-a[1], b[2]-a[2]]
    const ap: [number,number,number] = [p[0]-a[0], p[1]-a[1], p[2]-a[2]]
    const ab2 = ab[0]*ab[0]+ab[1]*ab[1]+ab[2]*ab[2]
    const t = ab2 > 1e-8 ? Math.min(1, Math.max(0, (ap[0]*ab[0]+ap[1]*ab[1]+ap[2]*ab[2]) / ab2)) : 0
    const q: [number,number,number] = [a[0]+ab[0]*t, a[1]+ab[1]*t, a[2]+ab[2]*t]
    const dx = p[0]-q[0], dy = p[1]-q[1], dz = p[2]-q[2]
    const d2 = dx*dx + dy*dy + dz*dz
    if (!best || d2 < best.d2) best = { seg: i, t, point: q, d2 }
  }
  return { seg: best!.seg, t: best!.t, point: best!.point }
}

// Оценка штрафа входа ветви внутрь ствола по реальной осевой полилинии ствола
function trunkPathPenalty(
  trunkPath: { centers: [number,number,number][]; radii: number[] } | null,
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
    let rAt = 0.0
    if (trunkPath && trunkPath.centers.length >= 2) {
      const q = nearestOnCenterline(trunkPath.centers, [x,y,z])
      const r0 = trunkPath.radii[q.seg]
      const r1 = trunkPath.radii[q.seg+1] ?? r0
      rAt = Math.max(0.02, r0*(1-q.t) + r1*q.t)
    } else {
      if (y < 0 || y > trunkHeight) continue
      const ratio = Math.min(Math.max(y / Math.max(1e-4, trunkHeight), 0), 1)
      rAt = Math.max(0.02, trunkRadius * (1 - 0.4 * ratio))
    }
    // Радиальное расстояние до оси: если путь есть — до ближайшей точки q; иначе — до мировой оси
    const distAxis = trunkPath ? Math.hypot(x - (nearestOnCenterline(trunkPath.centers, [x,y,z]).point[0]), z - (nearestOnCenterline(trunkPath.centers, [x,y,z]).point[2])) : Math.hypot(x, z)
    const pen = (rAt + rad) - distAxis
    if (pen > 0) penalty += pen * 1000
    else penalty += Math.max(0, -pen) * 0.1
  }
  return penalty
}

/**
 * Эвристика «направления наружу»: штрафует направления, идущие не радиально
 * от оси ствола (в XZ‑плоскости). Чем меньше проекция на радиальный вектор, тем больше штраф.
 */
function outwardPenalty(base: [number,number,number], dir: [number,number,number], trunkPath?: { centers: [number,number,number][] }): number {
  let radial: [number,number,number]
  if (trunkPath && trunkPath.centers.length >= 1) {
    const q = nearestOnCenterline(trunkPath.centers, base)
    const v: [number,number,number] = [base[0]-q.point[0], 0, base[2]-q.point[2]]
    const vlen = Math.hypot(v[0], v[2])
    radial = vlen < 1e-6 ? [1,0,0] : [v[0]/vlen, 0, v[2]/vlen]
  } else {
    radial = normalize([base[0], 0, base[2]])
  }
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
    trunkShearStrength,
    trunkBranchLevels,
    trunkBranchesPerLevel,
    trunkBranchAngleDeg,
    trunkBranchChildHeightFactor,
    branchLevels,
    branchesPerSegment,
    branchTopBias,
    branchLength,
    branchRadius,
    branchRadiusFalloff,
    branchAngleDeg,
    randomness,
    leavesPerBranch,
    leafSize,
    branchTipTaper,
    barkMaterialUuid,
    leafMaterialUuid,
  } = params

  // Единая плотность текстуры коры (повторов на метр) для согласования UV
  const texD = Math.max(1e-6, (params as any).barkTexDensityPerMeter ?? 1)

  const primitives: GfxPrimitive[] = []
  // Реестр уже размещённых сегментов ветвей для проверки коллизий при подборе направлений
  const placed: PlacedSegment[] = []
  // ЕДИНЫЙ МЕШ для ствола и всех ветвей: аккумуляторы геометрии
  const unifiedPos: number[] = []
  const unifiedNor: number[] = []
  const unifiedUv: number[] = []
  const unifiedIdx: number[] = []
  function appendToUnified(geom: { positions: number[]; normals: number[]; uvs?: number[]; indices?: number[] }) {
    const base = Math.floor(unifiedPos.length / 3)
    unifiedPos.push(...geom.positions)
    unifiedNor.push(...geom.normals)
    if (geom.uvs) unifiedUv.push(...geom.uvs)
    const idx = geom.indices || []
    for (let i = 0; i < idx.length; i++) unifiedIdx.push(base + idx[i])
  }

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
   *
   * Поддерживает параметр «скоса» сегментов ствола: при ненулевой силе скоса
   * каждый сегмент получает собственное случайное боковое отклонение (азимут),
   * а ось сегмента наклоняется относительно базовой оси на угол, пропорциональный
   * силе скоса. Стыковка между соседними сегментами выполняется без зазоров за
   * счёт:
   * - согласования верхнего радиуса предыдущего сегмента с нижним радиусом текущего,
   * - небольшого перекрытия (embed) вниз и «воротника» у основания.
   */
  function generateTrunkChain(options: {
    basePoint: [number, number, number]
    axis: [number, number, number]
    totalHeight: number
    segments: number
    baseRadius: number
    namePrefix: string
    emitPrimitives?: boolean
    collectPath?: boolean
    /** Доп. заглубление первого сегмента вниз (для бесшовного стыка к родителю) */
    rootEmbedDepth?: number
    /** Включить «воротник» у самого первого сегмента (для плавного перехода в родителя) */
    baseCollarFrac?: number
    baseCollarScale?: number
  }): { attachments: { point: [number,number,number]; axis: [number,number,number]; radius: number }[], endPoint: [number,number,number], endRadius: number, path?: { centers: [number,number,number][], radii: number[], tangents: [number,number,number][] } } {
    const attachments: { point: [number,number,number]; axis: [number,number,number]; radius: number }[] = []
    const aBase = normalize(options.axis)
    const segHLocal = options.totalHeight / Math.max(1, options.segments)
    // Предварительно вычислим ортонормированный базис вокруг базовой оси aBase
    const tmp: [number, number, number] = Math.abs(aBase[1]) < 0.99 ? [0,1,0] : [1,0,0]
    const b1v = new THREE.Vector3().crossVectors(new THREE.Vector3(...aBase), new THREE.Vector3(...tmp)).normalize()
    const b2v = new THREE.Vector3().crossVectors(new THREE.Vector3(...aBase), b1v).normalize()
    const b1: [number, number, number] = [b1v.x, b1v.y, b1v.z]
    const b2: [number, number, number] = [b2v.x, b2v.y, b2v.z]

    // Точка низа текущего сегмента (для первого — basePoint), далее — верх предыдущего
    let segA: [number, number, number] = [options.basePoint[0], options.basePoint[1], options.basePoint[2]]
    const centers: [number,number,number][] = []
    const radii: number[] = []
    const tangents: [number,number,number][] = []
    // Добавляем начальное кольцо
    centers.push([segA[0], segA[1], segA[2]])
    radii.push(radiusAt01(options.baseRadius, 0))
    tangents.push(aBase)
    // Итоговая сила скоса и максимальный угол наклона сегмента (в рад)
    const shear01 = Math.max(0, Math.min(1, trunkShearStrength ?? 0))
    const maxTiltRad = degToRad(35) * shear01

    let prevAxis: [number, number, number] | null = null
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

      // Вычисляем ось текущего сегмента с учётом «скоса»
      // При нулевом скосе остаётся базовая ось, при максимальном — сильный наклон в случайном азимуте
      let segAxis: [number, number, number]
      if (maxTiltRad > 1e-6) {
        const theta = randRange(rng, 0, Math.PI * 2)
        // Лёгкая вариация величины наклона (чтобы не были все одинаковые по силе)
        const alpha = Math.max(0, Math.min(Math.PI / 2 - 0.05, maxTiltRad * (0.8 + 0.4 * rng())))
        const s = Math.sin(alpha), c = Math.cos(alpha)
        const ortho: [number, number, number] = [
          b1[0] * Math.cos(theta) + b2[0] * Math.sin(theta),
          b1[1] * Math.cos(theta) + b2[1] * Math.sin(theta),
          b1[2] * Math.cos(theta) + b2[2] * Math.sin(theta),
        ]
        segAxis = normalize([
          aBase[0] * c + ortho[0] * s,
          aBase[1] * c + ortho[1] * s,
          aBase[2] * c + ortho[2] * s,
        ])
      } else {
        segAxis = aBase
      }

      // Верх текущего сегмента (видимая часть) — на длину segHLocal вдоль оси сегмента
      const segB: [number, number, number] = [
        segA[0] + segAxis[0] * segHLocal,
        segA[1] + segAxis[1] * segHLocal,
        segA[2] + segAxis[2] * segHLocal,
      ]

      // Минимально необходимое перекрытие для скрытия круглой грани при наклоне
      let embedExtra = 0
      if (i > 0 && prevAxis) {
        const dot = Math.max(-1, Math.min(1, segAxis[0]*prevAxis[0] + segAxis[1]*prevAxis[1] + segAxis[2]*prevAxis[2]))
        const ang = Math.acos(Math.abs(dot)) // 0..pi/2
        // Чем больше угол между сегментами, тем больше перекрытие требуется
        const ang01 = Math.min(1, ang / (Math.PI * 0.5))
        // 0.05..0.35 радиусов: достаточно, чтобы край диска не выглядывал
        embedExtra = Math.max(0.0, rBottom * (0.05 + 0.30 * ang01))
      }
      let embedBottom = 0
      if (i > 0) {
        const baseEmbed = Math.max(0.0, Math.min(1.0, trunkEmbedFactorLocal)) * Math.min(rBottom, prevTop)
        embedBottom = Math.max(baseEmbed, embedExtra)
      } else if (options.rootEmbedDepth && options.rootEmbedDepth > 0) {
        embedBottom = options.rootEmbedDepth
      }

      const height = segHLocal + embedBottom
      // Центр сегмента: середина видимой части минус половина перекрытия вдоль оси сегмента
      const center: [number, number, number] = [
        (segA[0] + segB[0]) * 0.5 - segAxis[0] * (embedBottom * 0.5),
        (segA[1] + segB[1]) * 0.5 - segAxis[1] * (embedBottom * 0.5),
        (segA[2] + segB[2]) * 0.5 - segAxis[2] * (embedBottom * 0.5),
      ]
      const rotation = eulerFromDir(segAxis)

      // «Воротник» у стыка: расширяем основание текущего сегмента, чтобы накрыть крышку предыдущего
      const collarFrac = i > 0 ? 0.25 : (options.baseCollarFrac ?? 0.0)
      // Немного «перекрываем» по радиусу, чтобы гарантированно накрыть верх предыдущего сегмента даже при сильном наклоне
      let collarScale = (i === 0 && (options.baseCollarFrac ?? 0) > 0) ? Math.max(1.0, options.baseCollarScale ?? 1.1) : 1.0
      if (i > 0 && rBottom > 0) {
        const baseScale = Math.max(1.0, prevTop / rBottom)
        // Усиливаем с ростом угла между сегментами
        if (prevAxis) {
          const dot = Math.max(-1, Math.min(1, segAxis[0]*prevAxis[0] + segAxis[1]*prevAxis[1] + segAxis[2]*prevAxis[2]))
          const ang = Math.acos(Math.abs(dot))
          const ang01 = Math.min(1, ang / (Math.PI * 0.5))
          collarScale = baseScale * (1.02 + 0.20 * ang01)
        } else {
          collarScale = baseScale * 1.02
        }
        // Ограничим сверху, чтобы не было перетяжек
        collarScale = Math.min(collarScale, 1.8)
      }

      if (options.emitPrimitives !== false) primitives.push({
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
          capBottom: i === 0, // нижняя крышка только у самого первого сегмента
          capTop: i === options.segments - 1, // верхняя крышка только у самого верхнего
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
      placed.push({ a: segA, b: segB, radius: Math.max(rBottom, rTop) })

      // Точка крепления ветви: верхняя грань сегмента
      attachments.push({ point: segB, axis: segAxis, radius: Math.max(0.02, rTop) })

      // Переходим к следующему сегменту: его низ — наша текущая вершина
      prevAxis = segAxis
      segA = segB
      // Заполняем путь для сборки единого меша
      centers.push([segA[0], segA[1], segA[2]])
      radii.push(rTop)
      tangents.push(segAxis)
    }
    // Конечная точка цепочки — вершина последнего сегмента
    const endPoint: [number,number,number] = segA
    const endRadius = radiusAt01(options.baseRadius, 1)
    const path = options.collectPath ? { centers, radii, tangents } : undefined
    return { attachments, endPoint, endRadius, path }
  }

  // Генерируем основной вертикальный ствол
  // Для основного ствола собираем только путь без отдельных цилиндров — ниже соберём единый меш
  const mainTrunk = generateTrunkChain({
    basePoint: [0,0,0],
    axis: [0,1,0],
    totalHeight: trunkHeight,
    segments: trunkSegments,
    baseRadius: trunkRadius,
    namePrefix: 'Ствол',
    emitPrimitives: false,
    collectPath: true,
  })

  // Опционально: разветвления ствола (1..N уровней)
  const tbLevels = Math.max(0, Math.round(trunkBranchLevels ?? 0))
  const tbPerLevel = Math.max(1, Math.round(trunkBranchesPerLevel ?? 2))
  const tbAngle = degToRad(trunkBranchAngleDeg ?? 20)
  const tbHeightFactor = Math.max(0.3, Math.min(0.95, trunkBranchChildHeightFactor ?? 0.7))

  // Список всех точек крепления веток (по всем стволам)
  const trunkAttachments: { point: [number,number,number]; axis: [number,number,number]; radius: number }[] = []

  // Сборка единого меша ствола: та же трубка по кривой, что и для ветвей
  {
    const curvePts = buildTrunkCurvePoints(trunkHeight, trunkShearStrength, rng, randomness)
    const taper = Math.max(0, Math.min(0.95, trunkTaperFactor ?? 0.4))
    const tube = buildTaperedTubeMesh(curvePts, trunkRadius, {
      tubularSegments: Math.max(12, trunkSegments * 4),
      radialSegments: 18,
      taper: (t) => 1 - taper * t,
      collarFrac: 0,
      collarScale: 1,
      // Единая плотность по UV: repeats = длина(м) * texD
      vStart: 0,
      vScale: trunkHeight * texD,
      // U: классическая угловая развёртка без метрического пересчёта — стабильна по окружности
      // Зафиксируем начальную ориентацию U=0 для ствола вдоль мировой оси X
      refNormal: [1, 0, 0],
    })
    appendToUnified({ positions: tube.positions, normals: tube.normals, indices: tube.indices, uvs: tube.uvs })

    // Синхронизация точек крепления веток с новой кривой ствола:
    // берём вершины сегментов (верх каждой из trunkSegments частей) и используем
    // локальную касательную и радиус ствола на этой высоте
    const curve = new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', 0.5)
    const segs = Math.max(1, trunkSegments)
    for (let i = 0; i < segs; i++) {
      const t = (i + 1) / segs
      const p = curve.getPoint(t)
      const tan = curve.getTangent(t).normalize()
      const r = Math.max(0.02, radiusAt01(trunkRadius, t))
      trunkAttachments.push({
        point: [p.x, p.y, p.z],
        axis: [tan.x, tan.y, tan.z],
        radius: r,
      })
    }
  }

  type TrunkNode = { base: [number,number,number]; axis: [number,number,number]; height: number; radius: number; segments: number; endPoint: [number,number,number]; endAxis: [number,number,number] }
  const mainEndAxis: [number,number,number] = mainTrunk.path ? normalize(mainTrunk.path.tangents[mainTrunk.path.tangents.length - 1]) : [0,1,0]
  let currentLevel: TrunkNode[] = [{ base: [0,0,0], axis: [0,1,0], height: trunkHeight, radius: trunkRadius, segments: trunkSegments, endPoint: mainTrunk.endPoint, endAxis: mainEndAxis }]
  for (let lvl = 0; lvl < tbLevels; lvl++) {
    const nextLevel: TrunkNode[] = []
    for (const node of currentLevel) {
      // Стартовать ответвления с ВЕРШИНЫ данного ствола (по фактической траектории)
      const startPoint: [number,number,number] = node.endPoint
      // Локальный ортонормированный базис вокруг КАСАТЕЛЬНОЙ в вершине
      const a = normalize(node.endAxis)
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
          collectPath: true,
          // Лёгкое заглубление первого сегмента + воротник на базе для бесшовного перехода
          rootEmbedDepth: Math.min(childRadius * 0.35, segH * 0.6),
          baseCollarFrac: 0.22,
          baseCollarScale: 1.25,
        })
        trunkAttachments.push(...child.attachments)
        const childEndAxis: [number,number,number] = child.path ? normalize(child.path.tangents[child.path.tangents.length - 1]) : childAxis
        nextLevel.push({ base: startPoint, axis: childAxis, height: childHeight, radius: childRadius, segments: childSegs, endPoint: child.endPoint, endAxis: childEndAxis })
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
    /** Присоединение к КОНЦУ родителя: требует дополнительного осевого заглубления */
    attachToParentTip?: boolean
    /** Если задано — родительская кривая (Catmull-Rom) и параметры для вычисления локального радиуса вдоль неё */
    parentCurvePts?: THREE.Vector3[]
    parentBaseRadius?: number
    parentCollarScale?: number
    parentTipTaper?: number
    /** Доля, которую избегаем от базы родителя (0..0.8) */
    avoidBaseFrac?: number
    /** Биас к концу родителя (0..1) при выборе точки крепления */
    tipBias?: number
  }

  const genBranches = ({ basePoint, level, parentAxis, parentRadius, dirHintAzimuth, parentSeg, countScale, attachToParentTip, parentCurvePts, parentBaseRadius, parentCollarScale, parentTipTaper, avoidBaseFrac, tipBias }: BranchArgs) => {
    if (level > branchLevels) return

    const scale = countScale == null ? 1 : Math.max(0, countScale)
    const baseCount = branchesPerSegment * scale
    const jitter = Math.max(0, Math.min(1, params.branchCountJitter ?? 0))
    const expected = baseCount
    const delta = Math.round(expected * jitter * ((rng() * 2) - 1))
    const count = Math.max(0, Math.round(expected) + delta)
    // Чтобы ветки одного узла не «смотрели» все в одну сторону,
    // вводим штраф за схожесть азимута относительно оси родителя.
    const siblingOrthoDirs: THREE.Vector3[] = []
    // Локальный список баз дочерних ветвей для пост‑анализа (необходим для добавления «продолжения»)
    const childBases: [number,number,number][] = []
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
        // Локальные параметры крепления: по умолчанию — как пришло в аргументах
        let basePointLoc = basePoint
        let parentAxisN = normalize(parentAxis)
        let parentRadiusLoc = parentRadius
        let attachToTip = !!attachToParentTip
        // Если есть кривая родителя — выбираем якорь случайно вдоль неё (с биасом к концу и избеганием базы)
        if (parentCurvePts && parentCurvePts.length >= 2 && parentBaseRadius && parentTipTaper != null) {
          const curve = new THREE.CatmullRomCurve3(parentCurvePts, false, 'catmullrom', 0.5)
          const tipB = Math.max(0, Math.min(1, tipBias ?? (params.branchChildTipBias ?? 0.5)))
          const minT = Math.max(0, Math.min(0.8, avoidBaseFrac ?? 0.1))
          const powK = 1 + 4 * tipB
          const u = rng()
          const tAttach = minT + (1 - minT) * (1 - Math.pow(1 - u, powK))
          const anchor = curve.getPoint(tAttach)
          const tangent = curve.getTangent(tAttach).normalize()
          basePointLoc = [anchor.x, anchor.y, anchor.z]
          parentAxisN = [tangent.x, tangent.y, tangent.z]
          const collarFracLocal = Math.max(0, Math.min(0.6, params.branchCollarFrac ?? 0.22))
          const collarK = tAttach < collarFracLocal && parentCollarScale ? (parentCollarScale * (1 - tAttach / collarFracLocal) + 1 * (tAttach / collarFracLocal)) : 1
          parentRadiusLoc = Math.max(0.005, parentBaseRadius * (1 - Math.max(0, Math.min(0.95, parentTipTaper)) * tAttach) * collarK)
          attachToTip = tAttach > 0.98
        }
        const a = normalize(parentAxisN)
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
        const falloff = Math.max(0.4, Math.min(0.95, params.branchRadiusFalloff ?? 0.7))
        const radBase = Math.max(0.01, branchRadius * Math.pow(falloff, level - 1))
        // Радиус у основания дочерней ветви не должен превышать радиус родителя в точке сочленения
        const parentLimit = Math.max(0.005, parentRadiusLoc - Math.max(0.002, parentRadiusLoc * 0.02))
        const rad = Math.max(0.005, Math.min(radBase, parentLimit))
        // Толщина воротника у основания не должна превышать радиус родителя: r0 <= parentRadius - margin
        const margin = Math.max(0.002, parentRadiusLoc * 0.02)
        const r0 = Math.min(rad * 1.15, Math.max(0.005, parentRadiusLoc - margin))
        // Допускаем уменьшение основания (collarScale < 1), если родитель тоньше
        const collarScaleLocal = Math.max(0.2, Math.min(1.8, r0 / Math.max(1e-3, rad)))
        // Радиальное заглубление центра базы внутрь родителя так, чтобы круглая грань воротника была внутри
        const epsInside = Math.max(0.001, parentRadius * 0.02)
        const depthRadial = attachToParentTip ? 0 : Math.max(0, parentRadius - (epsInside + r0))
        const axialEmbed = attachToParentTip ? r0 : 0
        const baseInside: [number, number, number] = [
          basePointLoc[0] + perp[0] * depthRadial - parentAxisN[0] * axialEmbed,
          basePointLoc[1] + perp[1] * depthRadial - parentAxisN[1] * axialEmbed,
          basePointLoc[2] + perp[2] * depthRadial - parentAxisN[2] * axialEmbed,
        ]
        const endPoint: [number, number, number] = [
          baseInside[0] + nDir[0] * len,
          baseInside[1] + nDir[1] * len,
          baseInside[2] + nDir[2] * len,
        ]

        let score = 0
        // В штрафе за вхождение в ствол пропускаем начальный участок, соответствующий заглублению: сдвигаем старт вперёд
        const shift = Math.max(axialEmbed, Math.min(len * 0.25, r0 * 1.2))
        const baseForPenalty: [number, number, number] = [
          baseInside[0] + nDir[0] * shift,
          baseInside[1] + nDir[1] * shift,
          baseInside[2] + nDir[2] * shift,
        ]
        score += trunkPathPenalty(mainTrunk.path ?? null, trunkHeight, trunkRadius, baseForPenalty, nDir, Math.max(0.01, len - shift), rad)
        for (const seg of placed) {
          if (parentSeg && seg === parentSeg) continue
          const { dist, u, v } = segmentDistance(baseInside, endPoint, seg.a, seg.b)
          const nearBase = u < 0.08 && v < 0.08
          if (nearBase) continue
          const clearance = dist - (rad + seg.radius)
          if (clearance < 0) score += (-clearance) * 500
          else score += Math.max(0, 0.05 - clearance) * 50
        }
        score += outwardPenalty(baseInside, nDir, mainTrunk.path ? { centers: mainTrunk.path.centers } : undefined) * 5
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

        if (!best || score < best.score) best = { nDir, baseInside, len, rad, endPoint, score, perpOrtho: perp, collarScale: collarScaleLocal }
      }

      if (!best) continue
      const { nDir, baseInside, len, rad, endPoint, perpOrtho, collarScale } = best

      // Генерируем изогнутую трубку по кривой (Catmull-Rom) с лёгким сужением к концу
      // 1) Кривая
      const curvePts = buildBranchCurvePoints(baseInside, nDir, len, rng, params.branchBendBase, params.branchBendJitter)
      // 2) Сборка трубки из 2–3 секций с убывающим радиусом
      // Параметры воротника для бесшовного стыка с родителем
      const tipTaper = Math.max(0, Math.min(0.95, branchTipTaper ?? 0.35))
      // Параметры воротника применяем ТОЛЬКО для сочленения со стволом (когда parentCurvePts отсутствует)
      const isTrunkParent = !parentCurvePts
      const collarBulge = isTrunkParent ? Math.max(0, Math.min(1, params.branchCollarSize ?? 0.6)) : 0
      const collarFrac = isTrunkParent ? Math.max(0, Math.min(0.6, params.branchCollarFrac ?? 0.22)) : 0
      // Ограничиваем стартовое расширение воротника с учётом ТЕКУЩЕГО радиуса ствола на высоте:
      // rad * startScale <= (parentRadius - margin). С учётом дополнительного усиления bulge.
      let collarScaleUse = 1
      if (isTrunkParent) {
        const margin = Math.max(0.002, parentRadius * 0.02)
        const maxStartScale = Math.max(0.2, (parentRadius - margin) / Math.max(1e-3, rad))
        const bulgeFactor = (1 + 0.5 * collarBulge)
        const allowedScale = maxStartScale / Math.max(1e-3, bulgeFactor)
        collarScaleUse = Math.min(collarScale, allowedScale)
        if (!isFinite(collarScaleUse) || collarScaleUse <= 0) collarScaleUse = 1
      } else {
        collarScaleUse = 1
      }
      // Начальная нормаль для параллельного транспорта: радиальное направление в точке крепления
      const refNormalVec = new THREE.Vector3(perpOrtho[0], perpOrtho[1], perpOrtho[2]).normalize()
      const tube = buildTaperedTubeMesh(curvePts, rad, {
        tubularSegments: 20,
        radialSegments: 10,
        collarFrac,
        collarScale: collarScaleUse,
        collarBulgeExtra: collarBulge,
        taper: (t) => 1 - tipTaper * t,
        // Согласование UV по V с местом крепления на стволе
        vStart: isTrunkParent && mainTrunk.path ? (() => { const q = nearestOnCenterline(mainTrunk.path.centers, baseInside); const total = Math.max(1, mainTrunk.path.centers.length - 1); return Math.max(0, Math.min(1, (q.seg + q.t) / total)) })() : 0,
        // Единая плотность по V: repeats = len * texD, но минимум 1 повтор
        vScale: Math.max(1, len * texD),
        // Фиксируем исходную ориентацию «U=0» через refNormal, чтобы исключить кручение по окружности вдоль длины
        refNormal: [refNormalVec.x, refNormalVec.y, refNormalVec.z],
        // Единая плотность по U с минимальным 1 повтором вокруг основания
        uRefRadius: (rad / Math.max(1, 2 * Math.PI * rad * texD)),
      })

      // Добавляем геометрию ветви в единый меш
      appendToUnified({ positions: tube.positions, normals: tube.normals, indices: tube.indices, uvs: tube.uvs })

      // Регистрируем сегмент ветви для последующих проверок
      const curvedEnd: [number, number, number] = tube.endPoint
      const currentSeg: PlacedSegment = { a: baseInside, b: curvedEnd, radius: rad }
      placed.push(currentSeg)
      // Добавляем выбранное ортонормальное направление для штрафа схожести следующих веток
      siblingOrthoDirs.push(new THREE.Vector3(perpOrtho[0], perpOrtho[1], perpOrtho[2]))
      // Регистрируем базу дочерней ветви
      childBases.push(baseInside)

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
              // Для изогнутой ветви берём точку на кривой вместо прямой интерполяции
              ...(() => { const p = new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', 0.5).getPoint(Math.min(1, Math.max(0, tj))); return [p.x, p.y, p.z] as [number, number, number] })(),
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
              // Базис плоскости листа: локальная ось +Y — радиально наружу от ветки (от anchor наружу)
              const y = radial.clone().normalize()
              const axisVec = new THREE.Vector3(...axisN)
              const tangent = new THREE.Vector3().crossVectors(axisVec, y).normalize()
              // Наклон листа к оси ветви на заданный угол (без случайного знака)
              const theta = degToRad((params.leafTiltDeg ?? 25))
              // Наклон «наружу»: меняем направление вращения вокруг касательной, чтобы лист не давил внутрь ветки
              const z = axisVec.clone().multiplyScalar(Math.cos(theta)).add(tangent.clone().multiplyScalar(-Math.sin(theta))).normalize()
              const x = new THREE.Vector3().crossVectors(y, z).normalize()
              const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z), 'XYZ')
              leafEuler = [e.x, e.y, e.z]
              // Не смещаем позицию: привязку anchor делает рендерер
            } else {
              const roll = (rng() - 0.5) * Math.PI
              leafEuler = eulerFromDir(nDir)
              leafEuler[2] += roll
            }

            // Выбор спрайта: один указанный или случайный из списка
            let texName: string | undefined = undefined
            if ((params.leafShape || 'billboard') === 'texture') {
              if (params.useAllLeafSprites && Array.isArray(params.leafSpriteNames) && params.leafSpriteNames.length > 0) {
                const names = params.leafSpriteNames
                const idx = Math.floor(rng() * names.length) % names.length
                texName = names[idx]
              } else {
                texName = params.leafTextureSpriteName || undefined
              }
            }
            primitives.push({
              uuid: generateUUID(),
              type: 'leaf',
              name: 'Лист',
              geometry: { radius: leafRadius, shape: params.leafShape || 'billboard', texSpriteName: texName as any },
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
          // На конце ветви — размещаем на поверхности торца/трубки, а не в воздухе
          const leaves = Math.max(0, Math.round(leavesPerBranch))
          for (let j = 0; j < leaves; j++) {
            const axisN = normalize(tube.endTangent as any)
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
              curvedEnd[0] + radial.x * radialDist,
              curvedEnd[1] + radial.y * radialDist,
              curvedEnd[2] + radial.z * radialDist,
            ]
              const isTexture = (params.leafShape || 'billboard') === 'texture'
              let leafEuler: [number, number, number]
              const leafRadius = Math.max(0.01, leafSize * (0.7 + 0.6 * rng()))
              if (isTexture) {
                const y = radial.clone().normalize()
                const axisVec = new THREE.Vector3(...axisN)
                const tangent = new THREE.Vector3().crossVectors(axisVec, y).normalize()
                const theta = degToRad((params.leafTiltDeg ?? 25))
                // Наклон «наружу»: меняем знак синуса
                const z = axisVec.clone().multiplyScalar(Math.cos(theta)).add(tangent.clone().multiplyScalar(-Math.sin(theta))).normalize()
                const x = new THREE.Vector3().crossVectors(y, z).normalize()
                const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z), 'XYZ')
                leafEuler = [e.x, e.y, e.z]
              } else {
                const roll = (rng() - 0.5) * Math.PI
                leafEuler = eulerFromDir(nDir)
                leafEuler[2] += roll
              }
              let texName2: string | undefined = undefined
              if ((params.leafShape || 'billboard') === 'texture') {
                if (params.useAllLeafSprites && Array.isArray(params.leafSpriteNames) && params.leafSpriteNames.length > 0) {
                  const names = params.leafSpriteNames
                  const idx = Math.floor(rng() * names.length) % names.length
                  texName2 = names[idx]
                } else {
                  texName2 = params.leafTextureSpriteName || undefined
                }
              }
              primitives.push({
                uuid: generateUUID(),
                type: 'leaf',
                name: 'Лист',
                geometry: { radius: leafRadius, shape: params.leafShape || 'billboard', texSpriteName: texName2 as any },
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
        // Выбираем точку крепления дочерней ветки на ТЕКУЩЕЙ кривой с биасом к концу
        // Передаём в генератор следующего уровня полную информацию о кривой родителя,
        // чтобы для КАЖДОЙ дочерней ветви выбирать свою точку крепления вдоль кривой
        const tipTaper = Math.max(0, Math.min(0.95, branchTipTaper ?? 0.35))
        genBranches({
          basePoint: curvedEnd,
          level: level + 1,
          parentAxis: tube.endTangent,
          parentRadius: tube.endRadius,
          parentSeg: currentSeg,
          // Кривая и параметры радиуса вдоль неё
          parentCurvePts: curvePts,
          parentBaseRadius: rad,
          parentCollarScale: collarScale,
          parentTipTaper: tipTaper,
          avoidBaseFrac: Math.max(0, Math.min(0.5, (params.branchChildAvoidBaseFrac as any) ?? 0.1)),
          tipBias: Math.max(0, Math.min(1, params.branchChildTipBias ?? 0.5))
        } as any)
      }
    }
    // Пост‑обработка: если это дочерние для ветки (есть кривая родителя), убеждаемся, что у самого
    // кончика родителя есть как минимум две дочерние. Если меньше — добавляем «продолжение».
    if (parentCurvePts && parentCurvePts.length >= 2 && parentBaseRadius && parentTipTaper != null) {
      const curve = new THREE.CatmullRomCurve3(parentCurvePts, false, 'catmullrom', 0.5)
      const endPoint = curve.getPoint(1)
      // Оценим, сколько баз оказалось у кончика (t ≳ 0.98)
      let tipCount = 0
      const samples = 32
      for (const b of childBases) {
        // Грубая аппроксимация t через выбор ближайшей из 32 точек
        let bestT = 0, bestD = Infinity
        for (let s = 0; s <= samples; s++) {
          const t = s / samples
          const p = curve.getPoint(t)
          const d = Math.hypot(b[0]-p.x, b[1]-p.y, b[2]-p.z)
          if (d < bestD) { bestD = d; bestT = t }
        }
        if (bestT > 0.98) tipCount++
      }
      if (tipCount < 2) {
        // Добавляем одну дополнительную ветку‑продолжение
        const tTip = 1
        const anchor = endPoint
        const tangent = curve.getTangent(tTip).normalize()
        const parentRadiusLoc = Math.max(0.005, parentBaseRadius * (1 - Math.max(0, Math.min(0.95, parentTipTaper)) * tTip))
        const aN: [number,number,number] = [tangent.x, tangent.y, tangent.z]
        // Радиус дочерней и воротник у основания — с ограничением толщины родителя
        const falloff = Math.max(0.4, Math.min(0.95, params.branchRadiusFalloff ?? 0.7))
        const radBase = Math.max(0.01, branchRadius * Math.pow(falloff, level - 1))
        const parentLimit = Math.max(0.005, parentRadiusLoc - Math.max(0.002, parentRadiusLoc * 0.02))
        const rad = Math.max(0.005, Math.min(radBase, parentLimit))
        const margin = Math.max(0.002, parentRadiusLoc * 0.02)
        const r0 = Math.min(rad * 1.10, Math.max(0.005, parentRadiusLoc - margin))
        const collarScaleLocal = Math.max(0.2, Math.min(1.8, r0 / Math.max(1e-3, rad)))
        const axialEmbed = r0
        const baseInside: [number,number,number] = [anchor.x - aN[0]*axialEmbed, anchor.y - aN[1]*axialEmbed, anchor.z - aN[2]*axialEmbed]
        const j = Math.max(0, Math.min(1, params.branchLengthJitter ?? randomness))
        const len = branchLength * Math.pow(0.75, level - 1) * (1 - 0.3 * j + 0.6 * j * rng())
        const tipTaper = Math.max(0, Math.min(0.95, branchTipTaper ?? 0.35))
        const curvePts = buildBranchCurvePoints(baseInside, aN, len, rng)
        // Для «ветка→ветка» воротник отключаем: используем старую схему без видимого утолщения
        const tube = buildTaperedTubeMesh(curvePts, rad, { tubularSegments: 20, radialSegments: 10, collarFrac: 0, collarScale: 1, taper: (t)=>1 - tipTaper*t })
        appendToUnified({ positions: tube.positions, normals: tube.normals, indices: tube.indices, uvs: tube.uvs })
        const curvedEnd: [number,number,number] = tube.endPoint
        placed.push({ a: baseInside, b: curvedEnd, radius: rad })
        // Рекурсия на следующий уровень
        if (level < branchLevels) {
          const nextBase: [number, number, number] = curvedEnd
          const parentRadiusNext = Math.max(0.005, tube.endRadius)
          genBranches({
            basePoint: nextBase,
            level: level + 1,
            parentAxis: tube.endTangent,
            parentRadius: parentRadiusNext,
            parentSeg: undefined,
            parentCurvePts: curvePts,
            parentBaseRadius: rad,
            parentCollarScale: collarScaleLocal,
            parentTipTaper: tipTaper,
            avoidBaseFrac: Math.max(0, Math.min(0.5, params.branchChildAvoidBaseFrac ?? 0.1)),
            tipBias: Math.max(0, Math.min(1, params.branchChildTipBias ?? 0.5)),
          })
        }
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
      genBranches({ basePoint: att.point, level: 1, parentAxis: att.axis, parentRadius: att.radius, countScale: topWeight, attachToParentTip: false })
    }
  }

  // 3) Финальный единый меш (ствол + все ветви)
  if (unifiedPos.length > 0) {
    primitives.push({
      uuid: generateUUID(),
      type: 'mesh',
      name: 'Дерево: ствол+ветви (единый меш)',
      geometry: { positions: unifiedPos, normals: unifiedNor, indices: unifiedIdx, uvs: unifiedUv },
      objectMaterialUuid: barkMaterialUuid,
      visible: true,
      transform: { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] },
    } as any)
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
