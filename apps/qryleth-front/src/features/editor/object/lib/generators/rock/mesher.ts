import { BufferAttribute, BufferGeometry } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { marchingCubes } from 'isosurface'
import type { RockGeneratorParams } from './types'

// Простой кэш геометрий по ключу параметров, чтобы не перестраивать лишний раз
const geometryCache = new Map<string, BufferGeometry>()

function cacheKey(params: RockGeneratorParams): string {
  const { seed, size, resolution, recipe, macro } = params
  const cuts = macro?.cuts?.map(c => `${c.normal.join(',')}:${c.offset}`).join(';') ?? ''
  const prog = macro?.program?.map(p => `${p.kind}:${p.amount}:${p.band.y0}-${p.band.y1}:${p.band.feather ?? 0}:${p.axis ?? 'x'}`).join('|') ?? ''
  const macroKey = macro
    ? `|mb:${macro.baseBlend ?? ''}|sk:${macro.smoothK ?? ''}|tp:${macro.taper ?? ''}|tw:${macro.twist ?? ''}|bd:${macro.bend ?? ''}|ct:${cuts}|pg:${prog}|rz:${macro.randomizeFromSeed ? 1 : 0}|pc:${macro.piecesCount ?? 1}|ps:${macro.piecesSpread ?? 0}|pj:${macro.piecesScaleJitter ?? 0}|pk:${macro.piecesSmoothK ?? 0.12}|po:${macro.piecesOp ?? 'union'}`
    : ''
  return `${seed}|${size.join(',')}|${resolution}|${recipe}${macroKey}`
}

// Лаплас‑сглаживание для смягчения поверхности
function laplacianSmooth(geometry: BufferGeometry, iterations = 1, factor = 0.5) {
  const positions = geometry.attributes.position as BufferAttribute | undefined
  const index = geometry.index
  if (!positions || !index) return
  const neighbors = new Map<number, Set<number>>()
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2)
    if (!neighbors.has(a)) neighbors.set(a, new Set())
    if (!neighbors.has(b)) neighbors.set(b, new Set())
    if (!neighbors.has(c)) neighbors.set(c, new Set())
    neighbors.get(a)!.add(b); neighbors.get(a)!.add(c)
    neighbors.get(b)!.add(a); neighbors.get(b)!.add(c)
    neighbors.get(c)!.add(a); neighbors.get(c)!.add(b)
  }
  const temp = new Float32Array(positions.count * 3)
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < positions.count * 3; i++) temp[i] = (positions.array as any)[i]
    for (let i = 0; i < positions.count; i++) {
      const neighs = neighbors.get(i)
      if (!neighs || !neighs.size) continue
      let ax = 0, ay = 0, az = 0
      for (const n of neighs) { ax += temp[n * 3]; ay += temp[n * 3 + 1]; az += temp[n * 3 + 2] }
      ax /= neighs.size; ay /= neighs.size; az /= neighs.size
      ;(positions.array as any)[i * 3] = temp[i * 3] * (1 - factor) + ax * factor
      ;(positions.array as any)[i * 3 + 1] = temp[i * 3 + 1] * (1 - factor) + ay * factor
      ;(positions.array as any)[i * 3 + 2] = temp[i * 3 + 2] * (1 - factor) + az * factor
    }
  }
  positions.needsUpdate = true
}

// Проекция вершин обратно на поверхность SDF для улучшения нормалей
function projectVerticesToSurface(
  geometry: BufferGeometry,
  sdf: (x: number, y: number, z: number) => number,
  stepSize: number,
  iterations = 3,
  relax = 0.85,
) {
  const positions = geometry.attributes.position as BufferAttribute | undefined
  if (!positions) return
  const array = positions.array as Float32Array
  const count = positions.count
  const eps = Math.max(stepSize * 0.5, 1e-4)
  const maxCorrection = Math.max(stepSize * 2, 1e-3)
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      const x = array[ix], y = array[ix + 1], z = array[ix + 2]
      const dist = sdf(x, y, z)
      if (!Number.isFinite(dist)) continue
      const gx = (sdf(x + eps, y, z) - sdf(x - eps, y, z)) / (2 * eps)
      const gy = (sdf(x, y + eps, z) - sdf(x, y - eps, z)) / (2 * eps)
      const gz = (sdf(x, y, z + eps) - sdf(x, y, z - eps)) / (2 * eps)
      const length = Math.hypot(gx, gy, gz)
      if (length < 1e-6) continue
      const inv = 1 / length
      const corr = Math.max(-maxCorrection, Math.min(maxCorrection, dist * relax))
      array[ix] -= gx * inv * corr
      array[ix + 1] -= gy * inv * corr
      array[ix + 2] -= gz * inv * corr
    }
  }
  positions.needsUpdate = true
}

// Исправление ориентации треугольников по градиенту SDF
function ensureOutwardWinding(geometry: BufferGeometry, sdf: (x: number, y: number, z: number) => number, step: number) {
  const index = geometry.index
  const posAttr = geometry.attributes.position as BufferAttribute | undefined
  if (!index || !posAttr) return
  const idx = index.array as any
  const pos = posAttr.array as Float32Array
  const triCount = index.count / 3
  const eps = Math.max(step * 0.5, 1e-4)
  for (let t = 0; t < triCount; t++) {
    const i0 = index.getX(t * 3), i1 = index.getX(t * 3 + 1), i2 = index.getX(t * 3 + 2)
    const a0 = i0 * 3, a1 = i1 * 3, a2 = i2 * 3
    const ax = pos[a0], ay = pos[a0 + 1], az = pos[a0 + 2]
    const bx = pos[a1], by = pos[a1 + 1], bz = pos[a1 + 2]
    const cx = pos[a2], cy = pos[a2 + 1], cz = pos[a2 + 2]
    const mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3, mz = (az + bz + cz) / 3
    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const gx = (sdf(mx + eps, my, mz) - sdf(mx - eps, my, mz)) / (2 * eps)
    const gy = (sdf(mx, my + eps, mz) - sdf(mx, my - eps, mz)) / (2 * eps)
    const gz = (sdf(mx, my, mz + eps) - sdf(mx, my, mz - eps)) / (2 * eps)
    const dot = nx * gx + ny * gy + nz * gz
    if (dot < 0) { idx[t * 3 + 1] = i2; idx[t * 3 + 2] = i1 }
  }
  index.needsUpdate = true
}

export function buildRockGeometry(params: RockGeneratorParams & { sdf: (x: number, y: number, z: number) => number }): BufferGeometry {
  const key = cacheKey(params)
  const cached = geometryCache.get(key)
  if (cached) return cached

  const { resolution, size, sdf } = params

  // Запас границ для учёта варпов / мульти-кусочности
  const spread = params.macro?.piecesSpread ?? 0
  const scaleJitter = params.macro?.piecesScaleJitter ?? 0
  const taper = Math.abs(params.macro?.taper ?? 0)
  const bend = Math.abs(params.macro?.bend ?? 0)
  const twist = Math.abs(params.macro?.twist ?? 0)
  const progMax = Math.max(0, ...(params.macro?.program?.map(s => Math.abs(s.amount)) ?? [0]))
  const warpAmp = Math.min(1.0, taper * 0.6 + bend * 0.3 + (twist / Math.PI) * 0.3 + progMax * 0.2)
  const padFactor = Math.min(1.2, spread * 1.25 + scaleJitter * 0.5 + warpAmp)
  const sampleSpacing0 = Math.max(size[0], size[1], size[2]) / Math.max(1, resolution - 1)
  const bounds: [[number, number, number], [number, number, number]] = [
    [-size[0] / 2 - size[0] * padFactor - sampleSpacing0 * 2,
     -size[1] / 2 - size[1] * padFactor - sampleSpacing0 * 2,
     -size[2] / 2 - size[2] * padFactor - sampleSpacing0 * 2],
    [ size[0] / 2 + size[0] * padFactor + sampleSpacing0 * 2,
      size[1] / 2 + size[1] * padFactor + sampleSpacing0 * 2,
      size[2] / 2 + size[2] * padFactor + sampleSpacing0 * 2]
  ]

  const mesh = marchingCubes([resolution, resolution, resolution], sdf, bounds)
  if (!mesh.cells || mesh.cells.length === 0) {
    return new BufferGeometry()
  }

  const positions = new Float32Array(mesh.positions.length * 3)
  const indices = new Uint32Array(mesh.cells.length * 3)
  for (let i = 0; i < mesh.positions.length; i++) {
    const pos = mesh.positions[i]
    positions[i * 3 + 0] = pos[0]
    positions[i * 3 + 1] = pos[1]
    positions[i * 3 + 2] = pos[2]
  }
  for (let i = 0; i < mesh.cells.length; i++) {
    const cell = mesh.cells[i]
    indices[i * 3 + 0] = cell[0]
    indices[i * 3 + 1] = cell[1]
    indices[i * 3 + 2] = cell[2]
  }

  let geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setIndex(new BufferAttribute(indices, 1))

  geometry = mergeVertices(geometry)

  // Смягчение и проекция для корректного шейдинга
  laplacianSmooth(geometry, 3, 0.95)
  const sampleSpacing = Math.max(size[0], size[1], size[2]) / Math.max(1, resolution - 1)
  projectVerticesToSurface(geometry, sdf, sampleSpacing)
  ensureOutwardWinding(geometry, sdf, sampleSpacing)

  // Простейшие сферические UV + uv2
  geometry.computeBoundingBox()
  const posAttr2 = geometry.getAttribute('position') as BufferAttribute | undefined
  const bbox = geometry.boundingBox
  if (posAttr2 && bbox) {
    const cx = (bbox.min.x + bbox.max.x) / 2
    const cy = (bbox.min.y + bbox.max.y) / 2
    const cz = (bbox.min.z + bbox.max.z) / 2
    const uvs = new Float32Array(posAttr2.count * 2)
    for (let i = 0; i < posAttr2.count; i++) {
      const x = posAttr2.getX(i) - cx
      const y = posAttr2.getY(i) - cy
      const z = posAttr2.getZ(i) - cz
      const r = Math.hypot(x, y, z) || 1
      let u = 0.5 + Math.atan2(z, x) / (2 * Math.PI)
      if (u < 0) u += 1
      if (u >= 1) u -= 1
      const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, y / r))) / Math.PI
      uvs[i * 2 + 0] = u
      uvs[i * 2 + 1] = v
    }
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
    geometry.setAttribute('uv2', new BufferAttribute(uvs.slice(0), 2))
  }

  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  geometryCache.set(key, geometry)
  return geometry
}

