import { db, type SceneRecord, type ObjectRecord } from '@/shared/lib/database'

/**
 * Загрузить все сцены из локальной библиотеки.
 */
export async function loadScenes(): Promise<SceneRecord[]> {
  return db.getAllScenes()
}

/**
 * Загрузить все объекты из локальной библиотеки.
 */
export async function loadObjects(): Promise<ObjectRecord[]> {
  return db.getAllObjects()
}

