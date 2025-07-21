/**
 * UI события для взаимодействия со сценой
 * 
 * События, которые происходят при взаимодействии пользователя
 * с 3D сценой и объектами
 */

import type { Vector3 } from '../core'
import type { Object3D } from 'three'

// Scene interaction events
export interface SceneClickEvent {
  objectUuid?: string
  instanceId?: string
  objectInstanceIndex?: number
  point: Vector3
  object?: Object3D
}

export interface SceneHoverEvent {
  objectUuid?: string
  instanceId?: string
  objectInstanceIndex?: number
  point: Vector3
  object?: Object3D
}

// Transform events
export interface ObjectTransformEvent {
  objectUuid: string
  instanceId?: string
  transform: {
    position?: Vector3
    rotation?: Vector3
    scale?: Vector3
  }
}

export interface PrimitiveTransformEvent {
  objectUuid: string
  primitiveIndex: number
  transform: {
    position?: Vector3
    rotation?: Vector3
    scale?: Vector3
  }
}