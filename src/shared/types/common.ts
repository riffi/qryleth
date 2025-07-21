import type { Vector3 } from './vector3'
import type { Transform } from './transform'
import type { GfxObject } from '@/entities/object'

export type { Vector3, Transform, GfxObject }

export interface BaseObject {
  uuid: string
  name: string
  description?: string
  thumbnail?: string
  createdAt: Date
  updatedAt: Date
}


