import * as THREE from 'three'

/**
 * Описание одного ответвления дерева (ветви/ствола) для генератора.
 * Содержит параметры геометрии и ориентации на данном уровне.
 */
export class Branch {
  origin: THREE.Vector3
  orientation: THREE.Euler
  length: number
  radius: number
  level: number
  sectionCount: number
  segmentCount: number

  /**
   * Создаёт описание ветви.
   * @param origin Точка начала ветви в мировых координатах
   * @param orientation Ориентация локальной оси Y ветви (Эйлер)
   * @param length Длина ветви
   * @param radius Радиус у основания ветви
   * @param level Уровень вложенности ветви (0 — ствол)
   * @param sectionCount Число секций по длине (колец)
   * @param segmentCount Число сегментов по окружности (разбиение кольца)
   */
  constructor(
    origin = new THREE.Vector3(),
    orientation = new THREE.Euler(),
    length = 0,
    radius = 0,
    level = 0,
    sectionCount = 0,
    segmentCount = 0,
  ) {
    this.origin = origin.clone()
    this.orientation = orientation.clone()
    this.length = length
    this.radius = radius
    this.level = level
    this.sectionCount = sectionCount
    this.segmentCount = segmentCount
  }
}

