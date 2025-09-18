import * as THREE from 'three'
import { smoothstep } from '@/shared/lib/math/number'

export type TaperFn = (t: number) => number

/**
 * Строит геометрию сужающейся трубки по заданной кривой.
 * Возвращает сырой буфер позиций/нормалей/индексов/UV, а также параметры конца трубки
 * (точка, тангенс, конечный радиус и сохранённое последнее кольцо для стыковки).
 */
export function buildTaperedTubeMesh(
  points: THREE.Vector3[],
  baseRadius: number,
  options?: {
    tubularSegments?: number
    radialSegments?: number
    taper?: TaperFn
    collarFrac?: number
    collarScale?: number
    collarBulgeExtra?: number
    vStart?: number
    vScale?: number
    uAngleOffset?: number
    uRefRadius?: number
    useParallelTransport?: boolean
    refNormal?: [number, number, number]
    capStart?: boolean
    capEnd?: boolean
    overrideStartRingPositions?: number[]
    overrideStartRingUVs?: number[]
  }
): { positions: number[]; normals: number[]; indices: number[]; uvs: number[]; endPoint: [number, number, number]; endTangent: [number, number, number]; endRadius: number; endRingPositions: number[]; endRingUVs: number[] } {
  const tubularSegments = options?.tubularSegments ?? 8
  const radialSegments = options?.radialSegments ?? 10
  const taper: TaperFn = options?.taper ?? ((t: number) => 1 - 0.35 * t)
  const collarFrac = options?.collarFrac ?? 0
  const collarScale = options?.collarScale ?? 1
  const collarBulgeExtra = options?.collarBulgeExtra ?? 0

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
  const ringCount = tubularSegments + 1
  const vertexCount = ringCount * (radialSegments + 1)
  const positions = new Array<number>(vertexCount * 3).fill(0)
  const uvs = new Array<number>(vertexCount * 2).fill(0)
  const normals = new Array<number>(vertexCount * 3).fill(0)
  const radialRef = new Array<number>(vertexCount * 3).fill(0)
  const indices: number[] = []

  // Фреймы на кривой
  const computePT = !!options?.useParallelTransport
  let tangents: THREE.Vector3[] = []
  let normalsPT: THREE.Vector3[] = []
  let binormalsPT: THREE.Vector3[] = []
  if (computePT) {
    const N = tubularSegments
    tangents = new Array(N + 1)
    normalsPT = new Array(N + 1)
    binormalsPT = new Array(N + 1)
    const delta = 1 / N
    let frenetFrame = new THREE.Vector3(0, 0, 1)
    for (let i = 0; i <= N; i++) {
      const t = i * delta
      const tan = curve.getTangent(t).normalize()
      tangents[i] = tan.clone()
      if (i === 0) {
        const n0 = Math.abs(tan.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
        normalsPT[i] = new THREE.Vector3().crossVectors(tan, n0).normalize()
      } else {
        const v = normalsPT[i - 1].clone()
        const axis = new THREE.Vector3().crossVectors(tangents[i - 1], tan)
        const s = axis.length()
        if (s > 1e-8) {
          axis.normalize()
          const ang = Math.asin(Math.max(-1, Math.min(1, s)))
          const q = new THREE.Quaternion().setFromAxisAngle(axis, ang)
          normalsPT[i] = v.applyQuaternion(q).normalize()
        } else {
          normalsPT[i] = v
        }
      }
      binormalsPT[i] = new THREE.Vector3().crossVectors(tan, normalsPT[i]).normalize()
    }
  } else {
    const fr = curve.computeFrenetFrames(tubularSegments, false)
    tangents = fr.tangents
    normalsPT = fr.normals
    binormalsPT = fr.binormals
  }

  const vStart = options?.vStart ?? 0
  const vScale = options?.vScale ?? 1
  const uOffset = options?.uAngleOffset ?? 0

  // Центры и накопленная длина по дуге для равномерного UV по V
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
    const normal = normalsPT[i]
    const binormal = binormalsPT[i]
    // «Воротник» у основания: монотонное уменьшение от стартового максимума к 1 на участке [0..collarFrac]
    let collar = 1
    if (collarFrac > 0 && t < collarFrac) {
      const k = t / Math.max(1e-4, collarFrac)
      const startScale = collarScale > 1 ? collarScale * (1 + 0.5 * collarBulgeExtra) : 1
      const s = smoothstep(k)
      collar = startScale * (1 - s) + 1 * s
    }
    const radius = Math.max(0.003, baseRadius * Math.max(0.05, taper(t)) * collar)
    for (let j = 0; j <= radialSegments; j++) {
      const idx = i * (radialSegments + 1) + j
      if (i === 0 && options?.overrideStartRingPositions && options.overrideStartRingPositions.length >= (radialSegments + 1) * 3) {
        const ox = options.overrideStartRingPositions[3 * j + 0]
        const oy = options.overrideStartRingPositions[3 * j + 1]
        const oz = options.overrideStartRingPositions[3 * j + 2]
        positions[3 * idx + 0] = ox
        positions[3 * idx + 1] = oy
        positions[3 * idx + 2] = oz
        const dx = ox - center.x, dy = oy - center.y, dz = oz - center.z
        const invr = 1 / Math.max(1e-6, Math.hypot(dx, dy, dz))
        radialRef[3 * idx + 0] = dx * invr
        radialRef[3 * idx + 1] = dy * invr
        radialRef[3 * idx + 2] = dz * invr
        if (options.overrideStartRingUVs && options.overrideStartRingUVs.length >= (radialSegments + 1) * 2) {
          uvs[2 * idx + 0] = options.overrideStartRingUVs[2 * j + 0]
          uvs[2 * idx + 1] = options.overrideStartRingUVs[2 * j + 1]
        } else {
          const uNorm0 = j / radialSegments
          uvs[2 * idx + 0] = uNorm0
          const vAlong0 = (cumLen[i] * invTotalLen)
          uvs[2 * idx + 1] = vStart + vAlong0 * vScale
        }
      } else {
        const uNorm = j / radialSegments
        const angle = uNorm * Math.PI * 2 + uOffset
        const cx = Math.cos(angle), sx = Math.sin(angle)
        const rx = normal.x * cx + binormal.x * sx
        const ry = normal.y * cx + binormal.y * sx
        const rz = normal.z * cx + binormal.z * sx

        const vx = center.x + radius * rx
        const vy = center.y + radius * ry
        const vz = center.z + radius * rz

        positions[3 * idx + 0] = vx
        positions[3 * idx + 1] = vy
        positions[3 * idx + 2] = vz
        radialRef[3 * idx + 0] = rx
        radialRef[3 * idx + 1] = ry
        radialRef[3 * idx + 2] = rz
        uvs[2 * idx + 0] = uNorm
        const vAlong = (cumLen[i] * invTotalLen)
        uvs[2 * idx + 1] = vStart + vAlong * vScale
      }
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

  // Крышки трубки: начало/конец
  if (options?.capStart !== false) {
    const startCenterIndex = (positions.length / 3) | 0
    const p0 = curve.getPoint(0)
    const t0 = tangents[0].clone().normalize()
    positions.push(p0.x, p0.y, p0.z)
    uvs.push(0.5, 0.5)
    normals.push(-t0.x, -t0.y, -t0.z)
    const base0 = 0
    for (let j = 0; j < radialSegments; j++) {
      const a = base0 + j
      const b = base0 + (j + 1)
      indices.push(startCenterIndex, b, a)
      indices.push(startCenterIndex, a, b)
    }
  }

  if (options?.capEnd !== false) {
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
      indices.push(endCenterIndex, a, b)
      indices.push(endCenterIndex, b, a)
    }
  }

  // Пересчёт нормалей по реальной геометрии
  const bg = new THREE.BufferGeometry()
  bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  bg.setIndex(indices)
  bg.computeVertexNormals()
  const nAttr = bg.getAttribute('normal') as THREE.BufferAttribute
  for (let i = 0; i < nAttr.count; i++) {
    normals[3 * i + 0] = nAttr.getX(i)
    normals[3 * i + 1] = nAttr.getY(i)
    normals[3 * i + 2] = nAttr.getZ(i)
  }
  // Гарантируем правильную ориентацию нормалей
  let dotSum = 0
  for (let i = 0; i < (positions.length / 3); i++) {
    const nx = normals[3 * i], ny = normals[3 * i + 1], nz = normals[3 * i + 2]
    const rx = (i < radialRef.length / 3) ? radialRef[3 * i] : 0
    const ry = (i < radialRef.length / 3) ? radialRef[3 * i + 1] : 0
    const rz = (i < radialRef.length / 3) ? radialRef[3 * i + 2] : 0
    dotSum += nx * rx + ny * ry + nz * rz
  }
  if (dotSum < 0) {
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
  const endRingPositions: number[] = []
  const endRingUVs: number[] = []
  const baseLast = (ringCount - 1) * (radialSegments + 1)
  for (let j = 0; j <= radialSegments; j++) {
    endRingPositions.push(
      positions[3 * (baseLast + j) + 0],
      positions[3 * (baseLast + j) + 1],
      positions[3 * (baseLast + j) + 2],
    )
    endRingUVs.push(
      uvs[2 * (baseLast + j) + 0],
      uvs[2 * (baseLast + j) + 1],
    )
  }
  const endRadius = Math.max(0.003, baseRadius * Math.max(0.05, (options?.taper || ((t: number) => 1 - 0.35 * t))(1)))
  return { positions, normals, indices, uvs, endPoint, endTangent, endRadius, endRingPositions, endRingUVs }
}

