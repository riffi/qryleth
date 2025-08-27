import { createStyledTooltip } from '../utils/tooltipUtils'

export const getSceneApiCompletions = () => [
  {
    label: 'getSceneOverview',
    type: 'function',
    info: createStyledTooltip(`getSceneOverview(): SceneOverview
Возвращает: {
  totalObjects: number,
  totalInstances: number,
  objects: SceneObjectInfo[],
  instances: SceneInstanceInfo[],
  sceneName: string,
  layers: Array<{id, name, visible, objectCount}>
}
Описание: Получить общую информацию о сцене с объектами, экземплярами и слоями`)
  },
  {
    label: 'getSceneObjects',
    type: 'function',
    info: createStyledTooltip(`getSceneObjects(): SceneObjectInfo[]
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
Описание: Получить список всех объектов сцены`)
  },
  {
    label: 'getSceneInstances',
    type: 'function',
    info: createStyledTooltip(`getSceneInstances(): SceneInstanceInfo[]
Возвращает: Array<{
  uuid: string,
  objectUuid: string,
  objectName: string,
  transform?: Transform,
  visible?: boolean
}>
Описание: Получить список всех экземпляров объектов`)
  },
  {
    label: 'findObjectByUuid',
    type: 'function',
    info: createStyledTooltip(`findObjectByUuid(uuid: string): SceneObject | null
Параметры:
  uuid: string - UUID объекта для поиска
Возвращает: SceneObject | null
Описание: Найти объект по UUID`)
  },
  {
    label: 'findObjectByName',
    type: 'function',
    info: createStyledTooltip(`findObjectByName(name: string): SceneObject | null
Параметры:
  name: string - Имя объекта для поиска (частичное совпадение)
Возвращает: SceneObject | null
Описание: Найти объект по имени (первый найденный)`)
  },
  {
    label: 'addInstances',
    type: 'function',
    info: createStyledTooltip(`addInstances(objectUuid, layerId?, count?, placementStrategyConfig?): AddInstancesResult
Параметры:
  objectUuid: string - UUID существующего объекта
  layerId?: string - ID слоя для размещения
  count?: number = 1 - Количество экземпляров
  placementStrategyConfig?: {
    strategy: 'Random' | 'RandomNoCollision' | 'PlaceAround',
    // Для PlaceAround требуется metadata следующего вида:
    metadata?: {
      // Приоритет 1: конкретный инстанс
      targetInstanceUuid?: string,
      // Приоритет 2: все инстансы объекта
      targetObjectUuid?: string,
      // Обязательные расстояния (ед. мира):
      minDistance: number,
      maxDistance: number,
      // Опциональные параметры распределения:
      angleOffset?: number,          // начальный угол в радианах
      distributeEvenly?: boolean,    // равномерно по кругу (по умолчанию true)
      onlyHorizontal?: boolean       // только по горизонтали (по умолчанию true)
    }
  }
Возвращает: {success: boolean, instanceCount: number, instances?: CreatedInstanceInfo[]}
Описание: Создать экземпляры существующего объекта с унифицированным размещением`)
  },
  {
    label: 'generateProceduralTerrain',
    type: 'function',
    info: createStyledTooltip(`generateProceduralTerrain(spec): Promise<GfxTerrainConfig>
Пример: await sceneApi.generateProceduralTerrain({
  world: { width: 200, depth: 200, edgeFade: 0.1 },
  base: { seed: 42, octaveCount: 4, amplitude: 8, persistence: 0.5, width: 64, height: 64, heightOffset: 0 },
  pool: { recipes: [] },
  seed: 42
})
Описание: Создает конфигурацию террейна без создания слоя`)
  },
  {
    label: 'generateTerrainOpsFromPool',
    type: 'function',
    info: createStyledTooltip(`generateTerrainOpsFromPool(pool, seed?, options?): Promise<GfxTerrainOp[]>
Пример (c сидом): await sceneApi.generateTerrainOpsFromPool({
  recipes: [{ kind: 'hill', count: 10, placement: { type: 'uniform' }, radius: 15, intensity: 5 }]
}, 123, { worldWidth: 200, worldDepth: 200 })
Пример (без сида): await sceneApi.generateTerrainOpsFromPool({
  recipes: [{ kind: 'hill', count: 10, placement: { type: 'uniform' }, radius: 15, intensity: 5 }]
}, undefined, { worldWidth: 200, worldDepth: 200 }) // сид сгенерируется автоматически
Описание: Генерирует только операции модификации рельефа; если seed не указан — создаётся автоматически`)
  },
  {
    label: 'createProceduralLayer',
    type: 'function',
    info: createStyledTooltip(`createProceduralLayer(spec, layerData?): Promise<{ success, layerId?, error? }>
🌟 ГЛАВНЫЙ МЕТОД для создания террейнов!
Пример: await sceneApi.createProceduralLayer({
  world: { width: 200, depth: 200 },
  base: { seed: 42, octaveCount: 4, amplitude: 8, persistence: 0.5, width: 64, height: 64, heightOffset: 0 },
  pool: { recipes: [{ kind: 'hill', count: 10, placement: { type: 'uniform' }, radius: 15, intensity: 5 }] },
  seed: 42
}, { name: 'Мой террейн', visible: true })
Описание: Создает террейн в сцене и выравнивает объекты`)
  },
  {
    label: 'terrainHelpers',
    type: 'variable',
    info: createStyledTooltip(`terrainHelpers: вспомогательные методы «fit» для генерации ОПЕРАЦИЙ без создания слоя\n
Назначение: упростить задание сложных форм (долина/гряда), возвращая корректно настроенные рецепты (GfxTerrainOpRecipe[]) и оценки бюджета.\n
Важно: хелперы НЕ создают слой — вы сами собираете spec.pool и вызываете createProceduralLayer.`)
  },
  {
    label: 'terrainHelpers.valleyFitToRecipes',
    type: 'function',
    info: createStyledTooltip(`terrainHelpers.valleyFitToRecipes(rect, options, world, edgeFade?): FitResult\n
Вписывает долину (valley) в прямоугольник XZ и возвращает:\n- recipes: GfxTerrainOpRecipe[]\n- estimateOps: число операций (для maxOps)\n- orientation: угол (если direction='auto')\n- warnings: предупреждения\n
rect: { x, z, width, depth }\noptions: { thickness, depth?, prominencePct?, direction?: 'auto'|'x'|'z'|angle, continuity?: 'continuous'|'segmented', variation?, edgeMargin?, budgetShare?, randomRotationEnabled? }\nworld: { width, depth }\nedgeFade?: число 0..1\n
Пример:\nconst world = { width: 300, depth: 200 }\nconst rect = { x: -140, z: -10, width: 280, depth: 20 }\nconst fit = sceneApi.terrainHelpers.valleyFitToRecipes(rect, { thickness: 40, depth: 8, direction: 'auto' }, world, 0.15)\nconst maxOps = sceneApi.terrainHelpers.suggestGlobalBudget(fit.recipes, 0.2)\nconst { trimmedRecipes } = sceneApi.terrainHelpers.autoBudget(fit.recipes, maxOps)\nawait sceneApi.createProceduralLayer({ world: { ...world, edgeFade: 0.15 }, base: {...}, pool: { global: { maxOps }, recipes: trimmedRecipes }, seed: 1 })`)
  },
  {
    label: 'terrainHelpers.ridgeBandFitToRecipes',
    type: 'function',
    info: createStyledTooltip(`terrainHelpers.ridgeBandFitToRecipes(rect, options, world, edgeFade?): FitResult\n
Вписывает гряду/хребет (ridge) в прямоугольник XZ. При direction='auto' ориентирует вдоль ДЛИННОЙ стороны rect.\nВозвращает FitResult (recipes, estimateOps, orientation, warnings).\n
options: { thickness, height?, prominencePct?, direction?, continuity?, variation?, edgeMargin?, budgetShare?, randomRotationEnabled? }`)
  },
  {
    label: 'terrainHelpers.estimateOpsForRecipes',
    type: 'function',
    info: createStyledTooltip(`terrainHelpers.estimateOpsForRecipes(recipes): number\n
Оценить суммарное количество операций (ops) для пула.\nЭвристика: ridge/valley со step → 5/центр; crater → 2; terrace → 4; остальное → 1.`)
  },
  {
    label: 'terrainHelpers.suggestGlobalBudget',
    type: 'function',
    info: createStyledTooltip(`terrainHelpers.suggestGlobalBudget(recipes, margin=0.2): number\n
Рекомендованный pool.global.maxOps с запасом (по умолчанию +20%).`)
  },
  {
    label: 'terrainHelpers.autoBudget',
    type: 'function',
    info: createStyledTooltip(`terrainHelpers.autoBudget(recipes, maxOps): { trimmedRecipes, usedOps, report }\n
Подрезает «прожорливые» рецепты под бюджет. Приоритет: детализация → ridge → valley.\nРецепты с count=0 удаляются.`)
  },
  {
    label: 'getSceneStats',
    type: 'function',
    info: createStyledTooltip(`getSceneStats(): SceneStats
Возвращает: {
  total: {objects: number, instances: number, layers: number},
  visible: {objects: number, instances: number, layers: number},
  primitiveTypes: string[]
}
Описание: Получить статистику сцены (общие и видимые объекты, экземпляры, слои)`)
  },
  {
    label: 'createObject',
    type: 'function',
    info: createStyledTooltip(`createObject(objectData, layerId?, count?, placementStrategyConfig?): AddObjectWithTransformResult
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
Описание: Создать новый объект и разместить его экземпляры`)
  },
  {
    label: 'getAvailableLayers',
    type: 'function',
    info: createStyledTooltip(`getAvailableLayers(): Array<LayerInfo>
Возвращает: Array<{
  id: string,
  name: string,
  visible: boolean,
  position: Vector3
}>
Описание: Получить доступные слои для размещения объектов`)
  },
  {
    label: 'canAddInstance',
    type: 'function',
    info: createStyledTooltip(`canAddInstance(objectUuid: string): boolean
Параметры:
  objectUuid: string - UUID объекта для проверки
Возвращает: boolean
Описание: Проверить можно ли добавить экземпляр объекта`)
  },
  {
    label: 'searchObjectsInLibrary',
    type: 'function',
    info: createStyledTooltip(`searchObjectsInLibrary(query: string): Promise<ObjectRecord[]>
Параметры:
  query: string - Строка поиска (по имени или описанию)
Возвращает: Promise<ObjectRecord[]>
Описание: Поиск объектов в библиотеке по строке запроса`)
  },
  {
    label: 'addObjectFromLibrary',
    type: 'function',
    info: createStyledTooltip(`addObjectFromLibrary(objectUuid, layerId?, count?, placementStrategyConfig?): Promise<AddObjectResult>
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
Описание: Импортировать объект из библиотеки и разместить экземпляры по стратегии`)
  },
  {
    label: 'adjustInstancesForPerlinTerrain',
    type: 'function',
    info: createStyledTooltip(`adjustInstancesForPerlinTerrain(perlinLayerId: string): TerrainAdjustResult
Параметры:
  perlinLayerId: string - ID слоя с Perlin ландшафтом
Возвращает: {success: boolean, adjustedCount?: number, error?: string}
Описание: Привязать экземпляры к ландшафту Perlin`)
  }
]

export const getConsoleCompletions = () => [
  { label: 'log', type: 'function', info: 'Вывести сообщение в консоль' },
  { label: 'error', type: 'function', info: 'Вывести ошибку в консоль' },
  { label: 'warn', type: 'function', info: 'Вывести предупреждение в консоль' },
  { label: 'info', type: 'function', info: 'Вывести информацию в консоль' },
  { label: 'debug', type: 'function', info: 'Вывести отладочную информацию в консоль' },
  { label: 'table', type: 'function', info: 'Вывести данные в виде таблицы' },
  { label: 'clear', type: 'function', info: 'Очистить консоль' }
]

export const getBaseCompletions = () => [
  { label: 'sceneApi', type: 'variable', info: 'API для управления сценой' },
  { label: 'console', type: 'variable', info: 'Консоль браузера' },
  { label: 'Math', type: 'variable', info: 'Математические функции и константы' },
  { label: 'Date', type: 'variable', info: 'Работа с датой и временем' },
  { label: 'JSON', type: 'variable', info: 'Парсинг и сериализация JSON' },
  { label: 'Array', type: 'variable', info: 'Конструктор массивов' },
  { label: 'Object', type: 'variable', info: 'Конструктор объектов' },
  { label: 'String', type: 'variable', info: 'Конструктор строк' },
  { label: 'Number', type: 'variable', info: 'Конструктор чисел' },
  // Подсказки для конфигурации размещения и PlaceAround metadata
  { label: 'strategy', type: 'property', info: "Стратегия размещения: 'Random' | 'RandomNoCollision' | 'PlaceAround'" },
  { label: 'metadata', type: 'property', info: 'Объект метаданных для выбранной стратегии (обязателен для PlaceAround)' },
  { label: 'targetInstanceUuid', type: 'property', info: 'UUID конкретного инстанса (приоритет 1 для PlaceAround)' },
  { label: 'targetObjectUuid', type: 'property', info: 'UUID объекта — разместить вокруг всех его инстансов (приоритет 2)' },
  { label: 'minDistance', type: 'property', info: 'Минимальное расстояние от грани до грани (>= 0)' },
  { label: 'maxDistance', type: 'property', info: 'Максимальное расстояние от грани до грани (> minDistance)' },
  { label: 'angleOffset', type: 'property', info: 'Начальный угол (радианы), по умолчанию 0' },
  { label: 'distributeEvenly', type: 'property', info: 'Равномерное распределение по кругу (boolean, по умолчанию true)' },
  { label: 'onlyHorizontal', type: 'property', info: 'Горизонтальное размещение по Y (boolean, по умолчанию true)' },
  
  // Параметры террейнов
  { label: 'world', type: 'property', info: 'Размеры и настройки мира: { width, depth, edgeFade? }' },
  { label: 'base', type: 'property', info: 'Базовый шум Perlin: { seed, octaveCount, amplitude, persistence, width, height, heightOffset? }' },
  { label: 'pool', type: 'property', info: 'Пул операций рельефа: { global?: {intensityScale?, maxOps?}, recipes: [] }' },
  { label: 'recipes', type: 'property', info: 'Массив рецептов рельефа (hill, valley, crater, plateau, ridge, basin, dune, terrace)' },
  { label: 'kind', type: 'property', info: 'Тип рельефа: hill | valley | crater | plateau | ridge | basin | dune | terrace' },
  { label: 'placement', type: 'property', info: 'Размещение: { type: uniform|poisson|ring|gridJitter, ...параметры }' },
  { label: 'falloff', type: 'property', info: 'Затухание к краям: smoothstep | gauss | linear' },
  { label: 'bias', type: 'property', info: 'Умные фильтры: { preferHeight?, preferSlope?, avoidOverlap? }' },
  { label: 'intensity', type: 'property', info: 'Амплитуда изменения высоты (число или [min, max])' },
  { label: 'radius', type: 'property', info: 'Базовый радиус по X (число или [min, max])' },
  { label: 'aspect', type: 'property', info: 'Отношение радиусов Z/X (число или [min, max]), 1.0 = круглый' },
  { label: 'count', type: 'property', info: 'Количество объектов (число или [min, max])' },
  { label: 'rotation', type: 'property', info: 'Поворот в радианах (число или [min, max])' },
  { label: 'step', type: 'property', info: 'Расстояние между штрихами для ridge/valley' },
  { label: 'seed', type: 'property', info: 'Зерно для детерминированной генерации' },
  { label: 'octaveCount', type: 'property', info: 'Количество слоев шума (1-8, рекомендуется 3-5)' },
  { label: 'amplitude', type: 'property', info: 'Максимальная высота базового рельефа' },
  { label: 'persistence', type: 'property', info: 'Затухание между слоями шума (0.1-0.8)' },
  { label: 'heightOffset', type: 'property', info: 'Смещение базового уровня (может быть отрицательным)' },
  { label: 'edgeFade', type: 'property', info: 'Затухание к краям мира (0.0-0.3)' },
  { label: 'intensityScale', type: 'property', info: 'Глобальный множитель интенсивности операций' },
  { label: 'maxOps', type: 'property', info: 'Максимальное количество операций' },
  { label: 'preferHeight', type: 'property', info: 'Предпочтение по высоте: { min?, max?, weight? }' },
  { label: 'preferSlope', type: 'property', info: 'Предпочтение по уклону: { min?, max?, weight? }' },
  { label: 'avoidOverlap', type: 'property', info: 'Избегать пересечений (boolean)' },
  { label: 'minDistance', type: 'property', info: 'Минимальная дистанция для poisson размещения' },
  { label: 'cell', type: 'property', info: 'Размер ячейки для gridJitter размещения' },
  { label: 'jitter', type: 'property', info: 'Дрожание для gridJitter (0.0-1.0)' },
  { label: 'rMin', type: 'property', info: 'Минимальный радиус для ring размещения' },
  { label: 'rMax', type: 'property', info: 'Максимальный радиус для ring размещения' },
  { label: 'center', type: 'property', info: 'Центр для ring размещения: [x, z]' },
  { label: 'area', type: 'property', info: 'Ограничение области: { kind: rect|circle, ...параметры }' }
]

// Подсказки TS-типов исключены: панель поддерживает только JavaScript

export const getJavaScriptKeywords = () => [
  { label: 'const', type: 'keyword', info: 'Объявление константы' },
  { label: 'let', type: 'keyword', info: 'Объявление переменной' },
  { label: 'var', type: 'keyword', info: 'Объявление переменной (устаревшее)' },
  { label: 'function', type: 'keyword', info: 'Объявление функции' },
  { label: 'return', type: 'keyword', info: 'Возврат значения из функции' },
  { label: 'if', type: 'keyword', info: 'Условное выражение' },
  { label: 'else', type: 'keyword', info: 'Альтернативная ветка условия' },
  { label: 'for', type: 'keyword', info: 'Цикл for' },
  { label: 'while', type: 'keyword', info: 'Цикл while' },
  { label: 'try', type: 'keyword', info: 'Блок обработки исключений' },
  { label: 'catch', type: 'keyword', info: 'Обработка исключений' },
  { label: 'async', type: 'keyword', info: 'Асинхронная функция' },
  { label: 'await', type: 'keyword', info: 'Ожидание асинхронной операции' },
  { label: 'true', type: 'keyword', info: 'Логическое значение true' },
  { label: 'false', type: 'keyword', info: 'Логическое значение false' },
  { label: 'null', type: 'keyword', info: 'Значение null' },
  { label: 'undefined', type: 'keyword', info: 'Значение undefined' }
]

export const getKeywords = () => getJavaScriptKeywords()
