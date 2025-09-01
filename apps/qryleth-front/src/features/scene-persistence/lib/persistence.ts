import { db } from '@/shared/lib/database'
import type { SceneData } from '@/entities/scene/types'

/**
 * Сохранить новую сцену в библиотеку. Возвращает UUID созданной сцены.
 */
export async function saveNewScene(name: string, data: SceneData, description?: string): Promise<string> {
  const uuid = await db.saveScene(name, data, description, undefined)
  return uuid
}

/**
 * Обновить существующую сцену по UUID. Возвращает UUID сцены (тот же).
 */
export async function updateExistingScene(uuid: string, name: string, data: SceneData, description?: string): Promise<string> {
  await db.updateScene(uuid, name, data, description, undefined)
  return uuid
}

