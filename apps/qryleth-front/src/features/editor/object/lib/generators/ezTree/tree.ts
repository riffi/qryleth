import * as THREE from 'three'
import { RNG } from './rng'
import { Branch } from './branch'
import { Billboard, TreeType } from './enums'
import TreeOptions from './options'

/**
 * Генератор дерева в духе ez-tree. Создаёт массивы вершин/нормалей/индексов/UV для ветвей и листвы.
 * Адаптирован для ObjectEditor: материалы и текстуры не создаются, только геометрия.
 */
export class Tree {
  rng!: RNG
  options: TreeOptions

  branches = { verts: [] as number[], normals: [] as number[], indices: [] as number[], uvs: [] as number[] }
  leaves = { verts: [] as number[], normals: [] as number[], indices: [] as number[], uvs: [] as number[] }
  /**
   * Экземпляры листьев для генерации примитивов 'leaf' в ObjectEditor:
   * позиция + ориентация + итоговый размер (для радиуса билборда).
   */
  leavesInstances: { position: THREE.Vector3; orientation: THREE.Euler; size: number }[] = []

  private branchQueue: Branch[] = []

  /**
   * @param options Параметры генерации дерева
   */
  constructor(options = new TreeOptions()) {
    this.options = options
  }

  /**
   * Сгенерировать новое дерево согласно текущим опциям.
   * Полностью пересоздаёт внутренние массивы геометрии.
   */
  generate() {
    this.branches = { verts: [], normals: [], indices: [], uvs: [] }
    this.leaves = { verts: [], normals: [], indices: [], uvs: [] }
    this.leavesInstances = []
    this.branchQueue = []
    this.rng = new RNG(this.options.seed)

    // Корневой ствол (level 0)
    this.branchQueue.push(
      new Branch(
        new THREE.Vector3(0, 0, 0),
        new THREE.Euler(0, 0, 0),
        this.options.branch.length[0],
        this.options.branch.radius[0],
        0,
        this.options.branch.sections[0],
        this.options.branch.segments[0],
      ),
    )

    while (this.branchQueue.length > 0) {
      const b = this.branchQueue.shift()!
      this.generateBranch(b)
    }
  }

  /**
   * Генерирует геометрию для одной ветви (включая секции, сегменты, индексы) и порождает дочерние ветви/листья.
   * @param branch Параметры текущей ветви
   */
  private generateBranch(branch: Branch) {
    const indexOffset = this.branches.verts.length / 3
    let sectionOrientation = branch.orientation.clone()
    let sectionOrigin = branch.origin.clone()

    // Длина секции как в ez-tree: без дополнительного деления на (levels-1)
    // (иначе ствол получается короче и визуально толще у основания)
    const sectionLength = branch.length / branch.sectionCount

    const sections: { origin: THREE.Vector3; orientation: THREE.Euler; radius: number }[] = []

    for (let i = 0; i <= branch.sectionCount; i++) {
      let sectionRadius = branch.radius
      if (i === branch.sectionCount && branch.level === this.options.branch.levels) {
        sectionRadius = 0.001
      } else if (this.options.type === TreeType.Evergreen) {
        // Как в ez-tree для хвойных: радиус линейно убывает к 0 вдоль секций.
        sectionRadius *= 1 - (i / branch.sectionCount)
      } else {
        // Для лиственных — управляемый taper из пресета.
        sectionRadius *= 1 - (this.options.branch.taper[branch.level] || 0) * (i / branch.sectionCount)
      }

      let first: { vertex: THREE.Vector3; normal: THREE.Vector3; uv: THREE.Vector2 } | null = null
      for (let j = 0; j < branch.segmentCount; j++) {
        const angle = (2 * Math.PI * j) / branch.segmentCount
        const local = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
        const vertex = local.clone().multiplyScalar(sectionRadius).applyEuler(sectionOrientation).add(sectionOrigin)
        const normal = local.clone().applyEuler(sectionOrientation).normalize()
        const uv = new THREE.Vector2(j / branch.segmentCount, i % 2 === 0 ? 0 : 1)

        this.branches.verts.push(vertex.x, vertex.y, vertex.z)
        this.branches.normals.push(normal.x, normal.y, normal.z)
        this.branches.uvs.push(uv.x, uv.y)
        if (j === 0) first = { vertex, normal, uv }
      }
      if (first) {
        // Дублируем первый сегмент для непрерывной UV-развёртки
        this.branches.verts.push(first.vertex.x, first.vertex.y, first.vertex.z)
        this.branches.normals.push(first.normal.x, first.normal.y, first.normal.z)
        this.branches.uvs.push(1, first.uv.y)
      }

      // Сохраняем параметры секции для последующей интерполяции дочерних ветвей
      sections.push({ origin: sectionOrigin.clone(), orientation: sectionOrientation.clone(), radius: sectionRadius })

      // Смещаем точку начала следующей секции вдоль локальной Y
      sectionOrigin = sectionOrigin.add(new THREE.Vector3(0, sectionLength, 0).applyEuler(sectionOrientation))

      // Случайный «крен» (gnarliness) и сила роста (force)
      // Для соответствия ez-tree:
      // - У лиственных (Deciduous) допускаем кривизну даже для ствола (level 0), что важно для Ash Small.
      // - У хвойных (Evergreen) не искажаем ствол, применяем крен только на уровнях > 0.
      const gnBase = (this.options.branch.gnarliness[branch.level] || 0)
      const allowGnarliness = this.options.type === TreeType.Deciduous || branch.level > 0
      if (allowGnarliness && gnBase !== 0) {
        const gn = Math.max(1, 1 / Math.sqrt(Math.max(1e-4, sectionRadius))) * gnBase
        sectionOrientation.x += this.rng.range(gn, -gn)
        sectionOrientation.z += this.rng.range(gn, -gn)
      }

      const qSection = new THREE.Quaternion().setFromEuler(sectionOrientation)
      const qTwist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.options.branch.twist[branch.level] || 0)
      qSection.multiply(qTwist)

      // Направление «силы роста»: учитываем знак strength.
      // Отрицательный strength трактуем как стремление к противоположному направлению.
      let strength = this.options.branch.force.strength || 0
      const forceDir = new THREE.Vector3().copy(this.options.branch.force.direction as any)
      if (forceDir.lengthSq() === 0) forceDir.set(0, 1, 0)
      forceDir.normalize()
      if (strength < 0) {
        strength = -strength
        forceDir.multiplyScalar(-1)
      }
      const qForce = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), forceDir)

      // Применение силы:
      // - У лиственных разрешаем на уровне 0 (ствол может изгибаться — Ash Small).
      // - У хвойных запрещаем на уровне 0 (ствол должен оставаться прямым — Pine Medium).
      const allowForce = this.options.type === TreeType.Deciduous || branch.level > 0
      const step = strength / Math.max(1e-4, sectionRadius)
      if (allowForce && step > 0) qSection.rotateTowards(qForce, step)
      sectionOrientation.setFromQuaternion(qSection)
    }

    // Индексы для трубки (цилиндра без крышек)
    this.generateBranchIndices(indexOffset, branch)

    // Терминальная ветвь для лиственных — рост из конца родителя
    if (this.options.type === TreeType.Deciduous) {
      const last = sections[sections.length - 1]
      if (branch.level < this.options.branch.levels) {
        this.branchQueue.push(
          new Branch(
            last.origin,
            last.orientation,
            this.options.branch.length[branch.level + 1] || 1,
            last.radius,
            branch.level + 1,
            branch.sectionCount,
            branch.segmentCount,
          ),
        )
      } else {
        this.generateLeaf(last.origin, last.orientation)
      }
    }

    if (branch.level === this.options.branch.levels) {
      this.generateLeaves(sections)
    } else if (branch.level < this.options.branch.levels) {
      this.generateChildBranches(this.options.branch.children[branch.level] || 0, branch.level + 1, sections)
    }
  }

  /**
   * Порождает дочерние ветви из заданного набора секций родителя.
   * @param count Число дочерних ветвей
   * @param level Уровень дочерних ветвей
   * @param sections Секции родителя для интерполяции позиции/радиуса/ориентации
   */
  private generateChildBranches(count: number, level: number, sections: { origin: THREE.Vector3; orientation: THREE.Euler; radius: number }[]) {
    const radialOffset = this.rng.next()
    for (let i = 0; i < count; i++) {
      const startMin = this.options.branch.start[level] ?? 0
      const childStart = this.rng.range(1.0, startMin)
      const idx = Math.floor(childStart * (sections.length - 1))
      const a = sections[idx]
      const b = idx === sections.length - 1 ? a : sections[idx + 1]
      const alpha = ((childStart - idx / (sections.length - 1)) / (1 / (sections.length - 1))) || 0

      const origin = new THREE.Vector3().lerpVectors(a.origin, b.origin, alpha)
      // Радиус дочерней ветви: как в ez-tree — масштабируем пресетный радиус
      // уровнем локального радиуса родителя в точке ответвления.
      const baseRadius = (this.options.branch.radius[level] || 0.5) * (((1 - alpha) * a.radius) + alpha * b.radius)

      const qA = new THREE.Quaternion().setFromEuler(a.orientation)
      const qB = new THREE.Quaternion().setFromEuler(b.orientation)
      const parentOri = new THREE.Euler().setFromQuaternion(qB.slerp(qA, alpha))

      const radial = 2.0 * Math.PI * (radialOffset + i / Math.max(1, count))
      const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (this.options.branch.angle[level] || 45) / (180 / Math.PI))
      const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), radial)
      const q3 = new THREE.Quaternion().setFromEuler(parentOri)
      const ori = new THREE.Euler().setFromQuaternion(q3.multiply(q2.multiply(q1)))

      const len = this.options.branch.length[level] || 1
      const sectionsCount = this.options.branch.sections[level] || 6
      const segmentsCount = this.options.branch.segments[level] || 4

      this.branchQueue.push(new Branch(origin, ori, len, baseRadius, level, sectionsCount, segmentsCount))
    }
  }

  /**
   * Создаёт набор листвы вдоль последнего уровня ветвей на основе секций.
   * @param sections Секции родителя
   */
  private generateLeaves(sections: { origin: THREE.Vector3; orientation: THREE.Euler; radius: number }[]) {
    const count = this.options.leaves.count
    if (count <= 0) return

    const radialOffset = this.rng.next()
    for (let i = 0; i < count; i++) {
      const t = this.rng.next() * (1 - (this.options.leaves.start || 0)) + (this.options.leaves.start || 0)
      const idx = Math.min(sections.length - 1, Math.floor(t * (sections.length - 1)))
      const a = sections[idx]
      const b = idx === sections.length - 1 ? a : sections[idx + 1]
      const alpha = ((t - idx / (sections.length - 1)) / (1 / (sections.length - 1))) || 0
      const origin = new THREE.Vector3().lerpVectors(a.origin, b.origin, alpha)

      const qA = new THREE.Quaternion().setFromEuler(a.orientation)
      const qB = new THREE.Quaternion().setFromEuler(b.orientation)
      const parentOri = new THREE.Euler().setFromQuaternion(qB.slerp(qA, alpha))

      const radial = 2.0 * Math.PI * (radialOffset + i / Math.max(1, count))
      const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (this.options.leaves.angle || 0) / (180 / Math.PI))
      const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), radial)
      const q3 = new THREE.Quaternion().setFromEuler(parentOri)
      const ori = new THREE.Euler().setFromQuaternion(q3.multiply(q2.multiply(q1)))

      this.generateLeaf(origin, ori)
    }
  }

  /**
   * Добавляет один «лист» в геометрию листвы как прямоугольный билборд (или пару перпендикулярных, если Double).
   * @param origin Центр основания листа
   * @param orientation Ориентация листа
   */
  private generateLeaf(origin: THREE.Vector3, orientation: THREE.Euler) {
    let i = this.leaves.verts.length / 3
    const size = this.options.leaves.size * (1 + this.rng.range(this.options.leaves.sizeVariance, -this.options.leaves.sizeVariance))
    const W = size
    const L = size

    const createQuad = (rotY: number) => {
      const v = [
        new THREE.Vector3(-W / 2, L, 0),
        new THREE.Vector3(-W / 2, 0, 0),
        new THREE.Vector3(W / 2, 0, 0),
        new THREE.Vector3(W / 2, L, 0),
      ].map((p) => p.applyEuler(new THREE.Euler(0, rotY, 0)).applyEuler(orientation).add(origin))

      const n = new THREE.Vector3(0, 0, 1).applyEuler(orientation)
      this.leaves.verts.push(v[0].x, v[0].y, v[0].z, v[1].x, v[1].y, v[1].z, v[2].x, v[2].y, v[2].z, v[3].x, v[3].y, v[3].z)
      this.leaves.normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z)
      this.leaves.uvs.push(0, 1, 0, 0, 1, 0, 1, 1)
      this.leaves.indices.push(i, i + 1, i + 2, i, i + 2, i + 3)
      i += 4
    }

    createQuad(0)
    if (this.options.leaves.billboard === Billboard.Double) createQuad(Math.PI / 2)

    // Записываем экземпляр для билборд‑рендера в ObjectEditor
    this.leavesInstances.push({ position: origin.clone(), orientation: orientation.clone(), size })
  }

  /**
   * Генерирует индексный буфер для цилиндрической оболочки ветви без торцевых крышек.
   * @param indexOffset Смещение индексов относительно текущего буфера
   * @param branch Текущая ветвь
   */
  private generateBranchIndices(indexOffset: number, branch: Branch) {
    const N = branch.segmentCount + 1
    for (let i = 0; i < branch.sectionCount; i++) {
      for (let j = 0; j < branch.segmentCount; j++) {
        const v1 = indexOffset + i * N + j
        const v2 = indexOffset + i * N + (j + 1)
        const v3 = v1 + N
        const v4 = v2 + N
        this.branches.indices.push(v1, v3, v2, v2, v3, v4)
      }
    }
  }
}
