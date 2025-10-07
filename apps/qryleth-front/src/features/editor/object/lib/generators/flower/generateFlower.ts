import type { GfxPrimitive } from '@/entities/primitive'
import type { CreateGfxMaterial } from '@/entities/material'
import type { FlowerGeneratorParams, FlowerMaterialUuids } from './types'
import { generateUUID } from '@/shared/lib/uuid'
import * as THREE from 'three'
import { buildTaperedTubeMesh } from '../tree/internal/tube'

/**
 * Простейший детерминированный PRNG (mulberry32) без зависимостей.
 * Возвращает функцию генерации псевдослучайных значений в диапазоне [0..1).
 */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Создаёт набор материалов по умолчанию для цветка: Листья, Стебель, Сферы, Лепестки.
 * Цвета можно переопределить через опции. UUID присваиваются при добавлении в стор.
 */
export function createDefaultFlowerMaterials(options?: {
  leavesColor?: string
  stemColor?: string
  sphereColor?: string
  petalColor?: string
}): CreateGfxMaterial[] {
  return [
    {
      name: 'Листья',
      type: 'dielectric',
      isGlobal: false,
      properties: { color: options?.leavesColor ?? '#2e8b57', roughness: 0.9, metalness: 0.0, side: 'double' as any },
    },
    {
      name: 'Стебли',
      type: 'dielectric',
      isGlobal: false,
      properties: { color: options?.stemColor ?? '#3a9d5d', roughness: 0.9, metalness: 0.0 },
    },
    {
      name: 'Цветочные сферы',
      type: 'dielectric',
      isGlobal: false,
      properties: { color: options?.sphereColor ?? '#ffd27a', roughness: 0.6, metalness: 0.0 },
    },
    {
      name: 'Лепестки',
      type: 'dielectric',
      isGlobal: false,
      properties: { color: options?.petalColor ?? '#ffffff', roughness: 0.85, metalness: 0.0, side: 'double' as any },
    },
  ]
}

/**
 * Добавляет в буферы ещё одну трубку (стебель) и возвращает конечную точку и касательную.
 * Служебный метод для компактности и переиспользования кода в generateFlower().
 */
function appendStemTube(
  rng: () => number,
  base: THREE.Vector3,
  height: number,
  bend: number,
  baseRadius: number,
  tubularSegments: number,
  positions: number[],
  normals: number[],
  indices: number[],
): { endPoint: THREE.Vector3; endTangent: THREE.Vector3 } {
  const yaw = rng() * Math.PI * 2
  const sway = (rng() * 2 - 1) * 0.6
  const mid1 = base.clone().add(new THREE.Vector3(Math.cos(yaw) * height * 0.25 * bend, height * 0.35, Math.sin(yaw) * height * 0.25 * bend))
  const mid2 = base.clone().add(new THREE.Vector3(Math.cos(yaw + sway) * height * 0.35 * bend, height * 0.75, Math.sin(yaw + sway) * height * 0.35 * bend))
  const top = base.clone().add(new THREE.Vector3(0, height, 0))
  const pts = [base, mid1, mid2, top]
  const tube = buildTaperedTubeMesh(pts, baseRadius, {
    tubularSegments,
    radialSegments: 10,
    taper: (t) => 1 - 0.6 * t,
    capStart: true,
    capEnd: true,
  })

  const indexShift = positions.length / 3
  positions.push(...tube.positions)
  normals.push(...tube.normals)
  for (let i = 0; i < tube.indices.length; i++) indices.push(tube.indices[i] + indexShift)

  return {
    endPoint: new THREE.Vector3(tube.endPoint[0], tube.endPoint[1], tube.endPoint[2]),
    endTangent: new THREE.Vector3(tube.endTangent[0], tube.endTangent[1], tube.endTangent[2]).normalize(),
  }
}

/**
 * Генерирует плоские ленты‑«клинки» (для листьев/лепестков) и дописывает их в общие буферы.
 * Метод повторяет логику травы: каждая лента создаётся сегментами с изгибом.
 */
function appendRibbonBlades(
  rng: () => number,
  count: number,
  options: {
    baseAreaRadius: number
    baseY: number
    length: number
    halfWidth: number
    taper: number
    bend: number
    segments: number
  },
  target: { positions: number[]; normals: number[]; indices: number[] },
) {
  const { baseAreaRadius, baseY, length, halfWidth, taper, bend, segments } = options

  const positions = target.positions
  const normals = target.normals
  const indices = target.indices

  function quad(i0: number, i1: number, i2: number, i3: number) { indices.push(i0, i2, i1, i2, i3, i1) }

  for (let b = 0; b < count; b++) {
    const ang = rng() * Math.PI * 2
    const rad = baseAreaRadius * Math.sqrt(rng())
    const baseX = Math.cos(ang) * rad
    const baseZ = Math.sin(ang) * rad

    const h = Math.max(0.02, length)
    const bendYaw = ang // ориентируем изгиб в сторону разлёта
    const bendSide = (rng() * 2 - 1) * 0.25

    const baseIndex = Math.floor(positions.length / 3)
    const centers: { x: number; y: number; z: number }[] = []
    const rights: { x: number; y: number; z: number }[] = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const y = baseY + h * t
      const bendAmount = bend * h * (t * t)
      const dx = Math.cos(bendYaw) * bendAmount + Math.sin(bendYaw) * bendSide * (t * h * 0.2)
      const dz = Math.sin(bendYaw) * bendAmount - Math.cos(bendYaw) * bendSide * (t * h * 0.2)
      const w = halfWidth * (1 - taper * t)
      const rightX = -Math.sin(bendYaw)
      const rightZ = Math.cos(bendYaw)
      const xC = baseX + dx
      const zC = baseZ + dz
      const xL = xC - rightX * w
      const zL = zC - rightZ * w
      const xR = xC + rightX * w
      const zR = zC + rightZ * w
      positions.push(xL, y, zL)
      positions.push(xR, y, zR)
      centers.push({ x: xC, y, z: zC })
      rights.push({ x: xR - xL, y: 0, z: zR - zL })
    }
    for (let i = 0; i <= segments; i++) {
      const cPrev = centers[Math.max(0, i - 1)]
      const cNext = centers[Math.min(segments, i + 1)]
      let tx = cNext.x - cPrev.x
      let ty = cNext.y - cPrev.y
      let tz = cNext.z - cPrev.z
      const lenT = Math.hypot(tx, ty, tz) || 1
      tx /= lenT; ty /= lenT; tz /= lenT
      let rx = rights[i].x, ry = rights[i].y, rz = rights[i].z
      const lenR = Math.hypot(rx, ry, rz) || 1
      rx /= lenR; ry /= lenR; rz /= lenR
      let nx = ry * tz - rz * ty
      let ny = rz * tx - rx * tz
      let nz = rx * ty - ry * tx
      const lenN = Math.hypot(nx, ny, nz) || 1
      nx /= lenN; ny /= lenN; nz /= lenN
      normals.push(nx, ny, nz)
      normals.push(nx, ny, nz)
    }
    for (let i = 0; i < segments; i++) {
      const row0 = baseIndex + i * 2
      const row1 = baseIndex + (i + 1) * 2
      quad(row0, row0 + 1, row1, row1 + 1)
    }
  }
}

/**
 * Генератор цветов для ObjectEditor.
 * Возвращает набор примитивов: единый mesh стеблей, единый mesh листьев, отдельные сферы и единый mesh лепестков.
 * Материалы назначаются через UUID материалов объекта.
 */
export function generateFlower(
  params: FlowerGeneratorParams & FlowerMaterialUuids
): GfxPrimitive[] {
  const rng = mulberry32(params.seed >>> 0)

  // Нормализуем параметры с безопасными диапазонами
  const stems = Math.max(1, Math.floor(params.stems))
  const stemHeightBase = Math.max(0.1, params.stemHeight)
  const hJ = Math.max(0, Math.min(1, params.stemHeightJitter ?? 0.3))
  const stemRadius = Math.max(0.002, params.stemRadius)
  const stemSegments = Math.max(4, Math.floor(params.stemSegments ?? 10))
  const stemBend = Math.max(0, Math.min(1, params.stemBend ?? 0.5))
  const baseSpread = Math.max(0, params.stemBaseSpread)

  const leaves = Math.max(0, Math.floor(params.leaves))
  const leafLength = Math.max(0.05, params.leafLength)
  const leafHalfWidth = Math.max(0.001, params.leafHalfWidth)
  const leafTaper = Math.max(0, Math.min(1, params.leafTaper ?? 0.8))
  const leafBend = Math.max(0, Math.min(1, params.leafBend ?? 0.5))

  const headType = params.headType
  const headRadius = Math.max(0.01, params.headRadius)
  const petals = Math.max(0, Math.floor(params.petals ?? 12))
  const petalLength = Math.max(0.02, params.petalLength ?? headRadius * 1.2)
  const petalHalfWidth = Math.max(0.002, params.petalHalfWidth ?? petalLength * 0.15)
  const petalTaper = Math.max(0, Math.min(1, params.petalTaper ?? 0.9))
  const petalBend = Math.max(0, Math.min(1, params.petalBend ?? 0.3))
  const bellSpheres = Math.max(1, Math.floor(params.bellSpheres ?? 4))
  const hydrangeaSpheres = Math.max(4, Math.floor(params.hydrangeaSpheres ?? 20))

  const primitives: GfxPrimitive[] = []

  // 1) Стебли: единый mesh (трубки) с радиусом у основания и сужением
  const stemPos: number[] = []
  const stemNrm: number[] = []
  const stemIdx: number[] = []
  const stemTips: { p: THREE.Vector3; t: THREE.Vector3 }[] = []
  for (let i = 0; i < stems; i++) {
    const a = rng() * Math.PI * 2
    const r = baseSpread * Math.sqrt(rng())
    const base = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)
    const h = stemHeightBase * (1 + (rng() * 2 - 1) * hJ * 0.5)
    const res = appendStemTube(rng, base, h, stemBend, stemRadius, stemSegments, stemPos, stemNrm, stemIdx)
    stemTips.push({ p: res.endPoint, t: res.endTangent })
  }
  if (stemPos.length) {
    primitives.push({
      uuid: generateUUID(),
      type: 'mesh',
      name: 'Стебли',
      geometry: { positions: stemPos, normals: stemNrm, indices: stemIdx },
      objectMaterialUuid: params.stemMaterialUuid,
      visible: true,
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    } as any)
  }

  // 2) Листья у основания: единый mesh лент, похожих на травинки
  if (leaves > 0) {
    const leafPos: number[] = []
    const leafNrm: number[] = []
    const leafIdx: number[] = []
    appendRibbonBlades(rng, leaves, {
      baseAreaRadius: Math.max(baseSpread * 0.6, 0.02),
      baseY: 0,
      length: leafLength,
      halfWidth: leafHalfWidth,
      taper: leafTaper,
      bend: leafBend,
      segments: 6,
    }, { positions: leafPos, normals: leafNrm, indices: leafIdx })
    if (leafPos.length) {
      primitives.push({
        uuid: generateUUID(),
        type: 'mesh',
        name: 'Листья',
        geometry: { positions: leafPos, normals: leafNrm, indices: leafIdx },
        objectMaterialUuid: params.leavesMaterialUuid,
        visible: true,
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      } as any)
    }
  }

  // 3) Головки: в зависимости от типа
  // 3.1) Ромашка: сплюснутая сфера и лепестки по кольцу
  if (headType === 'daisy') {
    // Вспомогательная функция: добавить один ориентированный лепесток, выходящий под 90° от стебля
    const petalPositions: number[] = []
    const petalNormals: number[] = []
    const petalIndices: number[] = []

    function appendOrientedPetal(base: THREE.Vector3, stemTangent: THREE.Vector3, phi: number) {
      // Базис плоскости, перпендикулярной стеблю в точке крепления
      const t = stemTangent.clone().normalize()
      const ref = Math.abs(t.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      const n1 = new THREE.Vector3().crossVectors(t, ref).normalize()
      const n2 = new THREE.Vector3().crossVectors(t, n1).normalize()
      // Радиальный вектор лепестка в этой плоскости (направление роста лепестка)
      const u = n1.clone().multiplyScalar(Math.cos(phi)).add(n2.clone().multiplyScalar(Math.sin(phi))).normalize()
      // Поперечное направление ширины лепестка в плоскости (перпендикулярно u и t)
      const right = new THREE.Vector3().crossVectors(u, t).normalize()

      const segments = 6
      const baseIndex = petalPositions.length / 3
      for (let i = 0; i <= segments; i++) {
        const s = i / segments
        const w = petalHalfWidth * (1 - petalTaper * s)
        // Лёгкий изгиб вдоль стебля для живости
        const bendAmt = petalBend * petalLength * (s * s)
        const center = base.clone().add(u.clone().multiplyScalar(petalLength * s)).add(t.clone().multiplyScalar(bendAmt))
        const left = center.clone().sub(right.clone().multiplyScalar(w))
        const rght = center.clone().add(right.clone().multiplyScalar(w))
        petalPositions.push(left.x, left.y, left.z)
        petalPositions.push(rght.x, rght.y, rght.z)
        // Нормаль постоянная вдоль лепестка: ориентируем нормально к плоскости (right x u)
        const n = new THREE.Vector3().crossVectors(right, u).normalize()
        petalNormals.push(n.x, n.y, n.z)
        petalNormals.push(n.x, n.y, n.z)
      }
      for (let i = 0; i < segments; i++) {
        const r0 = baseIndex + i * 2
        const r1 = baseIndex + (i + 1) * 2
        petalIndices.push(r0, r0 + 1, r1, r1, r0 + 1, r1 + 1)
      }
    }

    for (const tip of stemTips) {
      // Сердцевина: сплюснутая по Y сфера
      primitives.push({
        uuid: generateUUID(),
        type: 'sphere',
        name: 'Цветок: сердцевина',
        geometry: { radius: headRadius },
        objectMaterialUuid: params.sphereMaterialUuid,
        visible: true,
        transform: { position: [tip.p.x, tip.p.y, tip.p.z], rotation: [0, 0, 0], scale: [1, 0.5, 1] },
      } as any)

      // Точно нижняя точка этой «сферы» вдоль -t с учётом сплющивания по Y
      const t = tip.t.clone().normalize()
      const invScale = new THREE.Vector3(1, 2, 1) // inverse of scale [1,0.5,1]
      const denom = Math.sqrt(
        Math.pow(invScale.x * t.x, 2) +
        Math.pow(invScale.y * t.y, 2) +
        Math.pow(invScale.z * t.z, 2)
      ) || 1
      const radiusAlongT = headRadius / denom
      const basePoint = tip.p.clone().add(t.clone().multiplyScalar(-radiusAlongT))

      const perRing = Math.max(3, petals)
      for (let k = 0; k < perRing; k++) {
        const phi = (k / perRing) * Math.PI * 2
        appendOrientedPetal(basePoint, t, phi)
      }
    }

    if (petalPositions.length) {
      primitives.push({
        uuid: generateUUID(),
        type: 'mesh',
        name: 'Лепестки',
        geometry: { positions: petalPositions, normals: petalNormals, indices: petalIndices },
        objectMaterialUuid: params.petalMaterialUuid,
        visible: true,
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      } as any)
    }
  }

  // 3.2) Колокольчик: несколько сфер у кончика и венчик лепестков, смотрящих вверх
  if (headType === 'bell') {
    const petalPos: number[] = []
    const petalNrm: number[] = []
    const petalIdx: number[] = []
    for (const tip of stemTips) {
      // Сферы: небольшой пучок
      for (let i = 0; i < bellSpheres; i++) {
        const ang = rng() * Math.PI * 2
        const rr = headRadius * 0.6 * Math.sqrt(rng())
        const px = tip.p.x + Math.cos(ang) * rr
        const pz = tip.p.z + Math.sin(ang) * rr
        const py = tip.p.y + (rng() * 2 - 1) * headRadius * 0.2
        primitives.push({
          uuid: generateUUID(),
          type: 'sphere',
          name: 'Цветок: шарик',
          geometry: { radius: headRadius * (0.8 + 0.4 * rng()) },
          objectMaterialUuid: params.sphereMaterialUuid,
          visible: true,
          transform: { position: [px, py, pz], rotation: [0, 0, 0], scale: [1, 1, 1] },
        } as any)
      }

      // Лепестки — по кольцу вокруг конца стебля, ориентированы «вверх» (по Y), упрощённо
      const perRing = Math.max(3, petals)
      const ringR = headRadius * 0.9
      for (let k = 0; k < perRing; k++) {
        const phi = (k / perRing) * Math.PI * 2
        const cx = tip.p.x + Math.cos(phi) * ringR
        const cz = tip.p.z + Math.sin(phi) * ringR
        const cy = tip.p.y
        const tmp = { positions: [] as number[], normals: [] as number[], indices: [] as number[] }
        appendRibbonBlades(rng, 1, {
          baseAreaRadius: 0.0001,
          baseY: cy,
          length: petalLength,
          halfWidth: petalHalfWidth,
          taper: petalTaper,
          bend: petalBend,
          segments: 6,
        }, tmp)
        for (let i = 0; i < tmp.positions.length; i += 3) {
          tmp.positions[i + 0] += cx
          tmp.positions[i + 2] += cz
        }
        const shift = petalPos.length / 3
        petalPos.push(...tmp.positions)
        petalNrm.push(...tmp.normals)
        petalIdx.push(...tmp.indices.map(ii => ii + shift))
      }
    }
    if (petalPos.length) {
      primitives.push({
        uuid: generateUUID(),
        type: 'mesh',
        name: 'Лепестки',
        geometry: { positions: petalPos, normals: petalNrm, indices: petalIdx },
        objectMaterialUuid: params.petalMaterialUuid,
        visible: true,
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      } as any)
    }
  }

  // 3.3) Гортензия: облако сфер с небольшим рандомом радиуса и яркости
  if (headType === 'hydrangea') {
    for (const tip of stemTips) {
      for (let i = 0; i < hydrangeaSpheres; i++) {
        const ang = rng() * Math.PI * 2
        const elev = (rng() - 0.5) * Math.PI * 0.5
        const rr = headRadius * (0.5 + 0.6 * Math.pow(rng(), 0.7))
        const px = tip.p.x + Math.cos(ang) * Math.cos(elev) * rr
        const pz = tip.p.z + Math.sin(ang) * Math.cos(elev) * rr
        const py = tip.p.y + Math.sin(elev) * rr
        const rad = headRadius * (0.3 + 0.7 * rng())
        // Упрощённый «tint по яркости»: используем лёгкую эмиссию и масштаб, чтобы создать вариативность «яркости» бутонов
        const shade = 0.85 + 0.3 * rng()
        primitives.push({
          uuid: generateUUID(),
          type: 'sphere',
          name: 'Гортензия: бутон',
          geometry: { radius: rad },
          objectMaterialUuid: params.sphereMaterialUuid,
          visible: true,
          transform: { position: [px, py, pz], rotation: [0, 0, 0], scale: [shade, shade, shade] },
        } as any)
      }
    }
  }

  return primitives
}
