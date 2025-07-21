import type { Vector3 } from './vector3'
import type { Transform } from './transform'
import type { GfxObject } from '@/entities/object'
import type { SceneObject, SceneObjectInstance, SceneLayer } from '@/entities/scene/types.ts'
import type {LightingSettings} from "@/entities/lighting";

export type { Vector3, Transform, GfxObject }

export interface BaseObject {
  uuid: string
  name: string
  description?: string
  thumbnail?: string
  createdAt: Date
  updatedAt: Date
}

export interface SceneData {
  objects: SceneObject[]
  objectInstances: SceneObjectInstance[]
  layers: SceneLayer[]
  lighting: LightingSettings
}
