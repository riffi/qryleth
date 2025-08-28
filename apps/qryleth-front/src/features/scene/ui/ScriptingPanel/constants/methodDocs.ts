/**
 * Единый источник текстовой документации по методам SceneAPI.
 *
 * Хранит человекочитаемые описания (сигнатуры, параметры, возвращаемые значения)
 * для использования сразу в двух механизмах подсказок:
 * - в автокомплите (как всплывающие описания пунктов);
 * - в hover‑подсказках редактора.
 *
 * ВАЖНО: любые правки текста описаний нужно вносить только здесь —
 * остальной код подтягивает данные из этого модуля.
 */
export const METHOD_DOCS: Record<string, string> = {
  getSceneOverview: `getSceneOverview(): SceneOverview
Возвращает: {
  totalObjects: number,
  totalInstances: number,
  objects: SceneObjectInfo[],
  instances: SceneInstanceInfo[],
  sceneName: string,
  layers: Array<{id, name, visible, objectCount}>
}
Описание: Получить общую информацию о сцене с объектами, экземплярами и слоями`,

  getSceneObjects: `getSceneObjects(): SceneObjectInfo[]
Возвращает: Array<{
  uuid: string,
  name: string,
  layerId?: string,
  visible?: boolean,
  libraryUuid?: string,
  boundingBox?: BoundingBox,
  primitiveCount: number,
  primitiveTypes: string[],
  hasInstances: boolean,
  instanceCount: number
}>
Описание: Получить список всех объектов сцены`,

  getSceneInstances: `getSceneInstances(): SceneInstanceInfo[]
Возвращает: Array<{
  uuid: string,
  objectUuid: string,
  objectName: string,
  transform?: Transform,
  visible?: boolean
}>
Описание: Получить список всех экземпляров объектов`,

  findObjectByUuid: `findObjectByUuid(uuid: string): SceneObject | null
Параметры:
  uuid: string - UUID объекта для поиска
Возвращает: SceneObject | null
Описание: Найти объект по UUID`,

  findObjectByName: `findObjectByName(name: string): SceneObject | null
Параметры:
  name: string - Имя объекта для поиска (частичное совпадение)
Возвращает: SceneObject | null
Описание: Найти объект по имени (первый найденный)`,

  addInstances: `addInstances(objectUuid, layerId?, count?, placementStrategyConfig?): AddInstancesResult
Параметры:
  objectUuid: string - UUID существующего объекта
  layerId?: string - ID слоя для размещения
  count?: number = 1 - Количество экземпляров
  placementStrategyConfig?: {
    strategy: 'Random' | 'RandomNoCollision' | 'PlaceAround',
    // Для PlaceAround требуется metadata следующего вида:
    metadata?: {
      targetInstanceUuid?: string,   // UUID конкретного инстанса (приоритет 1)
      targetObjectUuid?: string,     // UUID объекта (все его инстансы, приоритет 2)
      minDistance: number,           // мин. расстояние от грани до грани
      maxDistance: number,           // макс. расстояние от грани до грани
      angleOffset?: number,          // сдвиг начального угла (рад)
      distributeEvenly?: boolean,    // равномерно по кругу (по умолчанию true)
      onlyHorizontal?: boolean       // только по горизонтали (по умолчанию true)
    }
  }
Возвращает: {success: boolean, instanceCount: number, instances?: CreatedInstanceInfo[]}
Описание: Создать экземпляры существующего объекта с унифицированным размещением`,

  getAvailableLayers: `getAvailableLayers(): Array<LayerInfo>
Возвращает: Array<{
  id: string,
  name: string,
  visible: boolean,
  position: Vector3
}>
Описание: Получить доступные слои для размещения объектов`,

  canAddInstance: `canAddInstance(objectUuid: string): boolean
Параметры:
  objectUuid: string - UUID объекта для проверки
Возвращает: boolean
Описание: Проверить можно ли добавить экземпляр объекта`,

  getSceneStats: `getSceneStats(): SceneStats
Возвращает: {
  total: {objects: number, instances: number, layers: number},
  visible: {objects: number, instances: number, layers: number},
  primitiveTypes: string[]
}
Описание: Получить статистику сцены (общие и видимые объекты, экземпляры, слои)`,

  searchObjectsInLibrary: `searchObjectsInLibrary(query: string): Promise<ObjectRecord[]>
Параметры:
  query: string - Строка поиска (по имени или описанию)
Возвращает: Promise<ObjectRecord[]>
Описание: Поиск объектов в библиотеке по строке запроса`,

  createObject: `createObject(objectData, layerId?, count?, placementStrategyConfig?): AddObjectWithTransformResult
Параметры:
  objectData: GfxObject - Данные для создания объекта
  layerId?: string = 'objects' - ID слоя для размещения
  count?: number = 1 - Количество экземпляров
  placementStrategyConfig?: {
    strategy: 'Random' | 'RandomNoCollision' | 'PlaceAround',
    // Для PlaceAround требуется metadata, см. addInstances
    metadata?: any
  }
Возвращает: {success: boolean, objectUuid?: string, instanceUuid?: string, error?: string}
Описание: Создать новый объект и разместить его экземпляры`,

  addObjectFromLibrary: `addObjectFromLibrary(objectUuid, layerId?, count?, placementStrategyConfig?): Promise<AddObjectResult>
Параметры:
  objectUuid: string - UUID объекта в библиотеке
  layerId?: string - ID слоя для размещения
  count?: number = 1 - Количество экземпляров
  placementStrategyConfig?: {
    strategy: 'Random' | 'RandomNoCollision' | 'PlaceAround',
    // Для PlaceAround требуется metadata, см. addInstances
    metadata?: any
  }
Возвращает: Promise<{success: boolean, objectUuid?: string, instanceUuid?: string, error?: string}>
Описание: Импортировать объект из библиотеки и разместить экземпляры по стратегии`,

  adjustInstancesForPerlinTerrain: `adjustInstancesForPerlinTerrain(perlinLayerId: string): TerrainAdjustResult
Параметры:
  perlinLayerId: string - ID слоя с Perlin ландшафтом
Возвращает: {success: boolean, adjustedCount?: number, error?: string}
Описание: Привязать экземпляры к ландшафту Perlin`,

  // Методы террейна (были описаны ранее в completionData.ts)
  generateProceduralTerrain: `generateProceduralTerrain(spec): Promise<GfxTerrainConfig>
Пример: await sceneApi.generateProceduralTerrain({
  world: { width: 200, depth: 200, edgeFade: 0.1 },
  base: { seed: 42, octaveCount: 4, amplitude: 8, persistence: 0.5, width: 64, height: 64, heightOffset: 0 },
  pool: { recipes: [] },
  seed: 42
})
Описание: Создает конфигурацию террейна без создания слоя`,

  generateTerrainOpsFromPool: `generateTerrainOpsFromPool(pool, seed?, options?): Promise<GfxTerrainOp[]>
Пример (c сидом): await sceneApi.generateTerrainOpsFromPool({
  recipes: [{ kind: 'hill', count: 10, placement: { type: 'uniform' }, radius: 15, intensity: 5 }]
}, 123, { worldWidth: 200, worldDepth: 200 })
Пример (без сида): await sceneApi.generateTerrainOpsFromPool({
  recipes: [{ kind: 'hill', count: 10, placement: { type: 'uniform' }, radius: 15, intensity: 5 }]
}, undefined, { worldWidth: 200, worldDepth: 200 }) // сид сгенерируется автоматически
Описание: Генерирует только операции модификации рельефа; если seed не указан — создаётся автоматически`,

  createProceduralLayer: `createProceduralLayer(spec, layerData?): Promise<{ success, layerId?, error? }>
🌟 ГЛАВНЫЙ МЕТОД для создания террейнов!
Пример: await sceneApi.createProceduralLayer({
  world: { width: 200, depth: 200 },
  base: { seed: 42, octaveCount: 4, amplitude: 8, persistence: 0.5, width: 64, height: 64, heightOffset: 0 },
  pool: { recipes: [{ kind: 'hill', count: 10, placement: { type: 'uniform' }, radius: 15, intensity: 5 }] },
  seed: 42
}, { name: 'Мой террейн', visible: true })
Описание: Создает террейн в сцене и выравнивает объекты`,
}

/**
 * Вернуть доку по имени метода SceneAPI.
 * Возвращает строку с описанием или null, если метод неизвестен.
 */
export const getMethodDoc = (methodName: string): string | null => {
  return METHOD_DOCS[methodName] || null
}

/**
 * Упорядоченный список методов SceneAPI для отображения в автокомплите.
 * Можно изменить порядок без правки самих описаний.
 */
export const getSceneApiMethodList = (): string[] => [
  'getSceneOverview',
  'getSceneObjects',
  'getSceneInstances',
  'findObjectByUuid',
  'findObjectByName',
  'addInstances',
  'generateProceduralTerrain',
  'generateTerrainOpsFromPool',
  'createProceduralLayer',
  'getSceneStats',
  'createObject',
  'getAvailableLayers',
  'canAddInstance',
  'searchObjectsInLibrary',
  'addObjectFromLibrary',
  'adjustInstancesForPerlinTerrain',
]
