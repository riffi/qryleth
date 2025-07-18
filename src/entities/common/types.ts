// Common vector types


// Common object properties
export interface BaseObject {
  name: string
  description?: string
  thumbnail?: string
  uuid: string
  createdAt: Date
  updatedAt: Date
}

// Common spatial properties
export interface Transform {
  position: Vector3
  rotation: Vector3
  scale: Vector3
}

// Common visibility properties
export interface Visible {
  visible: boolean
}

// Status types
export type SceneStatus = 'draft' | 'saved' | 'modified'

// Common instance properties
export interface ObjectInstance extends Transform, Visible {
  id: string
}

// Scene reference
export interface SceneReference {
  uuid?: string
  name: string
  status: SceneStatus
}
