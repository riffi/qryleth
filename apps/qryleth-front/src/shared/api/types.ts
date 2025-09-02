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
  /**
   * Дублированные теги записи библиотеки для быстрого поиска/индексации.
   * Поле хранится отдельно от objectData.tags и индексируется в Dexie.
   */
  tags?: string[]
  /**
   * Полные данные графического объекта (включая дублирующее поле tags).
   */
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
  /**
   * Признак активного подключения (1 – текущее, 0 – нет)
   */
  isActive: number
  createdAt: Date
  updatedAt: Date
}

// Re-export external service types
export type { OpenAISettingsConnection } from '../lib/openAISettings'
