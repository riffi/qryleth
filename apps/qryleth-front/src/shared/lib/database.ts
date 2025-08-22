import Dexie, {type Table } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import type {OpenAISettingsConnection} from './openAISettings'
import type {SceneData} from "@/entities/scene/types.ts";
import type {GfxObject} from "@/entities/object";
import type {ConnectionRecord, ObjectRecord, SceneRecord} from '../api';

export interface ScriptRecord {
  id?: number
  uuid: string
  name: string
  description?: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface TerrainAssetRecord {
  id?: number
  /** Уникальный идентификатор asset'а для ссылки из GfxHeightmapParams */
  assetId: string
  /** Имя файла для отображения в UI */
  fileName: string
  /** Размеры изображения в пикселях */
  width: number
  height: number
  /** Размер файла в байтах */
  fileSize: number
  /** Двоичные данные PNG файла */
  blob: Blob
  /**
   * Хэш массива высот (SHA-256 по байтам Float32Array), служит для дедупликации ассетов.
   *
   * Если два исходных PNG после нормализации (ресайз ≤200 и извлечения яркости) дают
   * одинаковое поле высот, их heightsHash совпадает. При загрузке нового PNG сначала
   * считается heightsHash и выполняется поиск по нему. Если совпадение найдено, новый
   * ассет не создаётся — переиспользуется существующий.
   */
  heightsHash?: string
  /**
   * Массив высот, извлечённых из PNG heightmap.
   * 
   * Замечание по хранению: IndexedDB/Dexie не сохраняет непосредственно типизированные
   * массивы, но корректно сохраняет `ArrayBuffer`. Поэтому при записи используется
   * `Float32Array.buffer`, а при чтении мы создаём новый `Float32Array` поверх
   * сохранённого буфера. Поле является опциональным для обратной совместимости.
   */
  heightsBuffer?: ArrayBuffer
  /** Ширина карты высот (в элементах массива высот), соответствует ширине канваса после масштабирования */
  heightsWidth?: number
  /** Высота карты высот (в элементах массива высот), соответствует высоте канваса после масштабирования */
  heightsHeight?: number
  /** Дата создания записи */
  createdAt: Date
  /** Дата последнего обновления */
  updatedAt: Date
}


// Database class
export class SceneLibraryDB extends Dexie {
  scenes!: Table<SceneRecord>
  objects!: Table<ObjectRecord>
  connections!: Table<ConnectionRecord>
  scripts!: Table<ScriptRecord>
  terrainAssets!: Table<TerrainAssetRecord>

  constructor() {
    super('SceneLibraryDB')

    this.version(1).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
    })

    this.version(2).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
      connections: '++id, connectionId, name, createdAt, updatedAt',
      settings: '++id, key, updatedAt'
    })

    this.version(3).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
      connections: '++id, connectionId, name, createdAt, updatedAt, isActive'
    })

    this.version(4).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
      connections: '++id, connectionId, name, createdAt, updatedAt, isActive',
      scripts: '++id, uuid, name, createdAt, updatedAt'
    })

    this.version(5).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
      connections: '++id, connectionId, name, createdAt, updatedAt, isActive',
      scripts: '++id, uuid, name, createdAt, updatedAt',
      terrainAssets: '++id, assetId, fileName, createdAt, updatedAt'
    })

    // Версия 6: добавлен индекс по heightsHash для быстрого поиска дубликатов
    this.version(6).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
      connections: '++id, connectionId, name, createdAt, updatedAt, isActive',
      scripts: '++id, uuid, name, createdAt, updatedAt',
      terrainAssets: '++id, assetId, heightsHash, fileName, createdAt, updatedAt'
    })

    // Примечание: добавление новых полей (heightsBuffer/heightsWidth/heightsHeight)
    // не требует изменения индексов, поэтому версия схемы может оставаться прежней.
    // Если в будущем понадобятся индексы по этим полям — потребуется повысить версию
    // и объявить соответствующие индексы в строке stores.
  }

  /**
   * Проверяет готовность базы данных
   */
  async isReady(): Promise<boolean> {
    try {
      await this.open()
      return true
    } catch (error) {
      console.error('Database not ready:', error)
      return false
    }
  }

  // Scene methods
  async saveScene(name: string, sceneData: SceneData, description?: string, thumbnail?: string): Promise<string> {
    const uuid = uuidv4()
    const now = new Date()

    await this.scenes.add({
      uuid,
      name,
      description,
      thumbnail,
      sceneData,
      createdAt: now,
      updatedAt: now
    })

    return uuid
  }

  async updateScene(uuid: string, name: string, sceneData: SceneData, description?: string, thumbnail?: string): Promise<void> {
    await this.scenes.where('uuid').equals(uuid).modify({
      name,
      description,
      thumbnail,
      sceneData,
      updatedAt: new Date()
    })
  }

  async getScene(uuid: string): Promise<SceneRecord | undefined> {
    return this.scenes.where('uuid').equals(uuid).first();
  }

  async getAllScenes(): Promise<SceneRecord[]> {
    return this.scenes.orderBy('updatedAt').reverse().toArray();
  }

  async deleteScene(uuid: string): Promise<void> {
    await this.scenes.where('uuid').equals(uuid).delete()
  }

  async saveObject(
    name: string,
    objectData: GfxObject,
    description?: string,
    thumbnail?: string
  ): Promise<string> {
    if (!name.trim()) {
      const error = new Error('Name is required')
      error.name = 'ValidationError'
      throw error
    }

    const existing = await this.objects.where('name').equals(name).first()
    if (existing) {
      const error = new Error('Object name must be unique')
      error.name = 'DuplicateNameError'
      throw error
    }

    const uuid = uuidv4()
    const now = new Date()

    try {
      await this.objects.add({
        uuid,
        name,
        description,
        thumbnail,
        objectData,
        createdAt: now,
        updatedAt: now
      })
    } catch (e) {
      console.error('Error saving object to DB', e)
      throw e
    }

    return uuid
  }

  async updateObject(
    uuid: string,
    updates: Partial<ObjectRecord>
  ): Promise<void> {
    if (updates.name) {
      const existing = await this.objects.where('name').equals(updates.name).first()
      if (existing && existing.uuid !== uuid) {
        const error = new Error('Object name must be unique')
        error.name = 'DuplicateNameError'
        throw error
      }
    }

    try {
      // Проверяем, существует ли объект
      const existingObject = await this.objects.where('uuid').equals(uuid).first()
      if (!existingObject) {
        throw new Error(`Object with UUID ${uuid} not found`)
      }
      
      // Обновляем объект
      await this.objects.where('uuid').equals(uuid).modify({
        ...updates,
        updatedAt: new Date()
      })
    } catch (e) {
      console.error('Error updating object in DB', e)
      throw e
    }
  }

  async getObject(uuid: string): Promise<ObjectRecord | undefined> {
    return this.objects.where('uuid').equals(uuid).first();
  }

  async getAllObjects(): Promise<ObjectRecord[]> {
    return this.objects.orderBy('updatedAt').reverse().toArray();
  }

  async deleteObject(uuid: string): Promise<void> {
    await this.objects.where('uuid').equals(uuid).delete()
  }


  // Connection methods

  /**
   * Сохраняет новое подключение к провайдеру LLM.
   * Все новые подключения создаются неактивными.
   */
  async saveConnection(connection: OpenAISettingsConnection): Promise<void> {
    const now = new Date()

    await this.connections.put({
      connectionId: connection.id,
      name: connection.name,
      provider: connection.provider,
      url: connection.url,
      model: connection.model,
      apiKey: connection.apiKey,
      isActive: 0,
      createdAt: now,
      updatedAt: now
    })
  }

  async getAllConnections(): Promise<OpenAISettingsConnection[]> {
    const records = await this.connections.orderBy('updatedAt').reverse().toArray()
    return records.map(record => ({
      id: record.connectionId,
      name: record.name,
      provider: record.provider as OpenAISettingsConnection['provider'],
      url: record.url,
      model: record.model,
      apiKey: record.apiKey
    }))
  }

  async getConnection(connectionId: string): Promise<OpenAISettingsConnection | undefined> {
    const record = await this.connections.where('connectionId').equals(connectionId).first()
    if (!record) return undefined

    return {
      id: record.connectionId,
      name: record.name,
      provider: record.provider as OpenAISettingsConnection['provider'],
      url: record.url,
      model: record.model,
      apiKey: record.apiKey
    }
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.connections.where('connectionId').equals(connectionId).delete()
  }

  async updateConnection(connection: OpenAISettingsConnection): Promise<void> {
    await this.connections.where('connectionId').equals(connection.id).modify({
      name: connection.name,
      provider: connection.provider,
      url: connection.url,
      model: connection.model,
      apiKey: connection.apiKey,
      updatedAt: new Date()
    })
  }

  // Active connection helpers
  /**
   * Возвращает идентификатор активного подключения.
   */
  async getActiveConnectionId(): Promise<string | undefined> {
    const record = await this.connections.where('isActive').equals(1).first()
    return record?.connectionId
  }

  /**
   * Делает выбранное подключение активным и снимает флаг со всех остальных.
   */
  async setActiveConnectionId(connectionId: string): Promise<void> {
    await this.transaction('rw', this.connections, async () => {
      await this.connections.toCollection().modify({ isActive: 0 })
      await this.connections
        .where('connectionId')
        .equals(connectionId)
        .modify({ isActive: 1 })
    })
  }

  // Script methods
  async saveScript(name: string, content: string, description?: string): Promise<string> {
    if (!name.trim()) {
      const error = new Error('Script name is required')
      error.name = 'ValidationError'
      throw error
    }

    const existing = await this.scripts.where('name').equals(name).first()
    if (existing) {
      const error = new Error('Script name must be unique')
      error.name = 'DuplicateNameError'
      throw error
    }

    const uuid = uuidv4()
    const now = new Date()

    try {
      await this.scripts.add({
        uuid,
        name,
        description,
        content,
        createdAt: now,
        updatedAt: now
      })
    } catch (e) {
      console.error('Error saving script to DB', e)
      throw e
    }

    return uuid
  }

  async updateScript(uuid: string, updates: Partial<Pick<ScriptRecord, 'name' | 'description' | 'content'>>): Promise<void> {
    if (updates.name) {
      const existing = await this.scripts.where('name').equals(updates.name).first()
      if (existing && existing.uuid !== uuid) {
        const error = new Error('Script name must be unique')
        error.name = 'DuplicateNameError'
        throw error
      }
    }

    try {
      await this.scripts.where('uuid').equals(uuid).modify({
        ...updates,
        updatedAt: new Date()
      })
    } catch (e) {
      console.error('Error updating script in DB', e)
      throw e
    }
  }

  async getScript(uuid: string): Promise<ScriptRecord | undefined> {
    return this.scripts.where('uuid').equals(uuid).first()
  }

  async getAllScripts(): Promise<ScriptRecord[]> {
    return this.scripts.orderBy('updatedAt').reverse().toArray()
  }

  async deleteScript(uuid: string): Promise<void> {
    await this.scripts.where('uuid').equals(uuid).delete()
  }

  // Terrain Assets methods
  
  /**
   * Сохраняет PNG heightmap в базу данных
   * 
   * Метод создаёт/обновляет запись ассета с исходным PNG-блобом и
   * базовой метаинформацией (размеры, имя, размер файла). Поля массива высот
   * в этой операции не заполняются и могут быть добавлены отдельным методом
   * после извлечения высот из изображения.
   */
  async saveTerrainAsset(
    assetId: string, 
    fileName: string, 
    blob: Blob, 
    width: number, 
    height: number
  ): Promise<void> {
    const now = new Date()
    
    await this.terrainAssets.put({
      assetId,
      fileName,
      width,
      height,
      fileSize: blob.size,
      blob,
      createdAt: now,
      updatedAt: now
    })
  }

  /**
   * Получает terrain asset по assetId
   */
  async getTerrainAsset(assetId: string): Promise<TerrainAssetRecord | undefined> {
    return this.terrainAssets.where('assetId').equals(assetId).first()
  }

  /**
   * Получает все terrain assets
   */
  async getAllTerrainAssets(): Promise<TerrainAssetRecord[]> {
    return this.terrainAssets.orderBy('updatedAt').reverse().toArray()
  }

  /**
   * Удаляет terrain asset по assetId
   */
  async deleteTerrainAsset(assetId: string): Promise<void> {
    await this.terrainAssets.where('assetId').equals(assetId).delete()
  }

  /**
   * Обновляет название terrain asset
   */
  async updateTerrainAssetName(assetId: string, fileName: string): Promise<void> {
    await this.terrainAssets.where('assetId').equals(assetId).modify({
      fileName,
      updatedAt: new Date()
    })
  }

  /**
   * Обновляет бинарные данные PNG и размеры изображения для существующего ассета
   *
   * Метод используется в «ленивой миграции», когда для старых записей необходимо
   * пересохранить blob в масштабе ≤ 200×200 c обновлением ширины/высоты и размера файла.
   * Высотные данные (heightsBuffer/Width/Height) этим методом не трогаются.
   *
   * @param assetId - идентификатор ассета
   * @param blob - новый PNG blob (обычно полученный из canvas.toBlob)
   * @param width - новая ширина изображения (в пикселях)
   * @param height - новая высота изображения (в пикселях)
   */
  async updateTerrainAssetImage(
    assetId: string,
    blob: Blob,
    width: number,
    height: number
  ): Promise<void> {
    await this.terrainAssets.where('assetId').equals(assetId).modify({
      blob,
      width,
      height,
      fileSize: blob.size,
      updatedAt: new Date()
    })
  }

  /**
   * Записывает массив высот для существующего ассета террейна
   * 
   * @param assetId - идентификатор ассета
   * @param heights - массив высот (Float32Array), будет сохранён как ArrayBuffer
   * @param width - ширина сетки высот
   * @param height - высота сетки высот
   * 
   * Метод обновляет только поля, связанные с высотами, и timestamp `updatedAt`.
   * PNG blob и его размеры остаются без изменений.
   */
  async updateTerrainAssetHeights(
    assetId: string,
    heights: Float32Array,
    width: number,
    height: number,
    /**
     * Опциональный хэш высот (SHA-256). Если передан — сохраняется в записи ассета
     * для последующей дедупликации. Если не передан — поле heightsHash оставляется
     * без изменений (полезно для обратной совместимости вызовов).
     */
    heightsHash?: string
  ): Promise<void> {
    await this.terrainAssets.where('assetId').equals(assetId).modify((rec) => {
      rec.heightsBuffer = heights.buffer
      rec.heightsWidth = width
      rec.heightsHeight = height
      if (heightsHash) rec.heightsHash = heightsHash
      rec.updatedAt = new Date()
    })
  }

  /**
   * Получает массив высот для указанного ассета
   * 
   * @param assetId - идентификатор ассета
   * @returns объект с массивом высот и размерами карты, либо null если высоты ещё не сохранены
   * 
   * Метод читает сохранённый `ArrayBuffer` и конструирует поверх него `Float32Array`.
   * Если данные отсутствуют, возвращается `null` — вызывающая сторона может инициировать
   * «ленивую» генерацию высот из PNG (см. последующие фазы задачи).
   */
  async getTerrainAssetHeights(assetId: string): Promise<{
    heights: Float32Array,
    width: number,
    height: number
  } | null> {
    const rec = await this.getTerrainAsset(assetId)
    if (!rec || !rec.heightsBuffer || !rec.heightsWidth || !rec.heightsHeight) {
      return null
    }
    return {
      heights: new Float32Array(rec.heightsBuffer),
      width: rec.heightsWidth,
      height: rec.heightsHeight
    }
  }

  /**
   * Ищет ассет террейна по хэшу высот (используется для дедупликации при загрузке PNG)
   *
   * @param heightsHash - строка SHA-256 по байтам Float32Array высот
   * @returns запись ассета или undefined, если не найдено
   */
  async findTerrainAssetByHeightsHash(heightsHash: string): Promise<TerrainAssetRecord | undefined> {
    return this.terrainAssets.where('heightsHash').equals(heightsHash).first()
  }
}

// Export singleton instance
export const db = new SceneLibraryDB()

// Инициализация базы данных при импорте
db.open().then(() => {
  console.log('Database initialized successfully')
}).catch((error) => {
  console.error('Failed to initialize database:', error)
})
