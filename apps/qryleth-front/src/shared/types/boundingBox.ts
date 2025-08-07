import type { Vector3 } from './vector3'

/**
 * Bounding Box - прямоугольный параллелепипед, ограничивающий объект в 3D пространстве
 * Используется для оптимизации операций коллизии, пространственных запросов и размещения объектов
 */
export interface BoundingBox {
  /** Минимальные координаты по осям X, Y, Z */
  min: Vector3
  /** Максимальные координаты по осям X, Y, Z */
  max: Vector3
}

/**
 * Центр и размеры bounding box - альтернативное представление
 */
export interface BoundingBoxDimensions {
  /** Центр bounding box */
  center: Vector3
  /** Размеры по осям X, Y, Z */
  size: Vector3
}