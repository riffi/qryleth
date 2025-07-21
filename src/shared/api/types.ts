/**
 * API и Database типы
 * 
 * Типы для взаимодействия с внешними API и базой данных:
 * - Database record interfaces
 * - API request/response types
 * - External service types
 */

import type { GfxObject } from '@/entities/object'
import type { SceneData } from '@/entities/scene/types'
import type { OpenAISettingsConnection } from '../lib/openAISettings'

// Base database record interface
export interface BaseDbRecord {
  id?: number
  uuid: string
  name: string
  description?: string
  thumbnail?: string
  createdAt: Date
  updatedAt: Date
}

// Database record types
export interface SceneRecord extends BaseDbRecord {
  sceneData: SceneData
}

export interface ObjectRecord extends BaseDbRecord {
  objectData: GfxObject
}

export interface ConnectionRecord {
  id?: number
  connectionId: string
  name: string
  provider: string
  url: string
  model: string
  apiKey: string
  createdAt: Date
  updatedAt: Date
}

export interface SettingsRecord {
  id?: number
  key: string
  value: string
  updatedAt: Date
}

// Re-export external service types
export type { OpenAISettingsConnection } from '../lib/openAISettings'