import { createStyledTooltip } from '../utils/tooltipUtils'
import type { LanguageMode } from './scriptTemplates'

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
  placementStrategyConfig?: PlacementStrategyConfig - Конфигурация стратегии размещения
Возвращает: {success: boolean, instanceCount: number, instances?: CreatedInstanceInfo[]}
Описание: Создать экземпляры существующего объекта с унифицированным размещением`) 
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
  placementStrategyConfig?: PlacementStrategyConfig - Конфигурация стратегии размещения
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
    label: 'addObjectWithTransform', 
    type: 'function', 
    info: createStyledTooltip(`addObjectWithTransform(objectData: GfxObjectWithTransform): AddObjectWithTransformResult
Параметры:
  objectData: GfxObjectWithTransform = {
    uuid?: string,
    name: string,
    primitives: Primitive[],
    libraryUuid?: string,
    position?: Vector3,
    rotation?: Vector3,
    scale?: Vector3
  }
Возвращает: {success: boolean, objectUuid?: string, instanceUuid?: string, error?: string}
Описание: Добавить объект с трансформацией в сцену`) 
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
    info: createStyledTooltip(`addObjectFromLibrary(objectUuid, layerId, transform?): Promise<AddObjectResult>
Параметры:
  objectUuid: string - UUID объекта в библиотеке
  layerId: string - ID слоя для размещения
  transform?: Transform = {
    position?: Vector3,
    rotation?: Vector3,
    scale?: Vector3
  }
Возвращает: Promise<{success: boolean, objectUuid?: string, instanceUuid?: string, error?: string}>
Описание: Добавить объект из библиотеки`) 
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
  { label: 'Number', type: 'variable', info: 'Конструктор чисел' }
]

export const getTypeScriptTypes = () => [
  { label: 'Vector3', type: 'type', info: 'Тип для 3D вектора: [number, number, number]' },
  { label: 'SceneOverview', type: 'type', info: 'Интерфейс обзора сцены' },
  { label: 'SceneObjectInfo', type: 'type', info: 'Интерфейс информации об объекте сцены' },
  { label: 'SceneInstanceInfo', type: 'type', info: 'Интерфейс информации об экземпляре' },
  { label: 'AddInstanceResult', type: 'type', info: 'Результат добавления экземпляра' },
  { label: 'LayerInfo', type: 'type', info: 'Информация о слое' },
  { label: 'SceneStats', type: 'type', info: 'Статистика сцены' },
  { label: 'Transform', type: 'type', info: 'Трансформация объекта' },
  { label: 'BoundingBox', type: 'type', info: 'Ограничивающий бокс' }
]

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

export const getTypeScriptKeywords = () => [
  { label: 'interface', type: 'keyword', info: 'Объявление интерфейса' },
  { label: 'type', type: 'keyword', info: 'Объявление типа' },
  { label: 'enum', type: 'keyword', info: 'Объявление перечисления' },
  { label: 'class', type: 'keyword', info: 'Объявление класса' },
  { label: 'extends', type: 'keyword', info: 'Наследование класса/интерфейса' },
  { label: 'implements', type: 'keyword', info: 'Реализация интерфейса' },
  { label: 'public', type: 'keyword', info: 'Модификатор доступа public' },
  { label: 'private', type: 'keyword', info: 'Модификатор доступа private' },
  { label: 'protected', type: 'keyword', info: 'Модификатор доступа protected' },
  { label: 'readonly', type: 'keyword', info: 'Модификатор readonly' },
  { label: 'as', type: 'keyword', info: 'Приведение типа' },
  { label: 'string', type: 'keyword', info: 'Тип string' },
  { label: 'number', type: 'keyword', info: 'Тип number' },
  { label: 'boolean', type: 'keyword', info: 'Тип boolean' }
]

export const getKeywords = (languageMode: LanguageMode) => {
  const jsKeywords = getJavaScriptKeywords()
  const tsKeywords = getTypeScriptKeywords()
  return languageMode === 'typescript' ? [...jsKeywords, ...tsKeywords] : jsKeywords
}