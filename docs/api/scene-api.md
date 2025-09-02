# Справочник Scene API

Описание публичных функций `SceneAPI`, предоставляющих доступ к данным сцены и операциям с объектами. Используется агентами ИИ для взаимодействия с редактором.

---

## Местоположение
`src/features/editor/scene/lib/sceneAPI.ts`

---

## Методы

### `getSceneOverview(): SceneOverview`
Возвращает полный обзор сцены: список объектов, экземпляров и слоев, а также имя сцены и общее количество элементов.

### `getSceneObjects(): SceneObjectInfo[]`
Получает список всех объектов сцены в упрощенном виде.

### `getSceneInstances(): SceneInstanceInfo[]`
Возвращает все экземпляры объектов с их трансформациями.

### `findObjectByUuid(uuid: string): SceneObject | null`
Находит объект по его UUID. Возвращает `null`, если объект не найден.

### `findObjectByName(name: string): SceneObject | null`
Ищет объект по имени (первое совпадение по подстроке). Возвращает `null`, если совпадений нет.

### `addInstances(objectUuid: string, layerId?: string, count: number = 1, placementStrategyConfig: PlacementStrategyConfig): AddInstancesResult`
Унифицированный метод создания экземпляров существующих объектов в сцене. Использует стратегии размещения для гибкого позиционирования.

**Параметры:**
- `objectUuid` - UUID объекта для создания экземпляров
- `layerId` - ID слоя для размещения объекта (опционально)
- `count` - количество экземпляров для создания (по умолчанию 1)
- `placementStrategyConfig` - конфигурация стратегии размещения

**Возвращает:** `AddInstancesResult` с информацией о созданных экземплярах

```typescript
// Пример использования
const result = SceneAPI.addInstances(
  'object-uuid-123',
  'objects',
  5,
  { strategy: PlacementStrategy.RandomNoCollision }
)
```

### `getAvailableLayers(): LayerInfo[]`
Возвращает массив доступных слоёв сцены с их идентификаторами, названиями,
видимостью и позициями. Эти данные используются для выбора слоя при
размещении объектов.

```typescript
interface LayerInfo {
  id: string
  name: string
  visible: boolean
  position?: Vector3
}
```

## 🆕 Стратегии размещения

### `PlacementStrategy` (enum)
```typescript
enum PlacementStrategy {
  Random = 'Random',
  RandomNoCollision = 'RandomNoCollision',
  PlaceAround = 'PlaceAround'
}
```

### `PlacementStrategyConfig` (discriminated union)
```typescript
type PlacementStrategyConfig = 
  | { strategy: PlacementStrategy.Random; metadata?: RandomMetadata }
  | { strategy: PlacementStrategy.RandomNoCollision; metadata?: RandomNoCollisionMetadata }
  | { strategy: PlacementStrategy.PlaceAround; metadata: PlaceAroundMetadata }
```

### `RandomMetadata` и `RandomNoCollisionMetadata`
```ts
interface RandomMetadata {
  /**
   * Максимальный наклон (в градусах) при автоповороте по нормали.
   * Если не задан — используется глобальное значение по умолчанию (30°).
   * Масштабирование линейное: 0° нормали → 0°, 90° → maxTerrainTiltDeg.
   */
  maxTerrainTiltDeg?: number
}

type RandomNoCollisionMetadata = RandomMetadata
```

### `PlaceAroundMetadata`
Метаданные для стратегии размещения вокруг целевых инстансов объекта.

```typescript
interface PlaceAroundMetadata {
  // Целевые объекты (взаимоисключающие параметры, обязателен один из них)
  targetInstanceUuid?: string   // UUID конкретного инстанса (приоритет 1)
  targetObjectUuid?: string     // UUID объекта — вокруг всех его инстансов (приоритет 2)

  // Расстояния (обязательные параметры)
  minDistance: number           // минимальное расстояние от грани target до грани нового объекта
  maxDistance: number           // максимальное расстояние от грани target до грани нового объекта

  // Параметры распределения (опционально)
  angleOffset?: number          // начальный угол в радианах (по умолчанию 0)
  distributeEvenly?: boolean    // равномерно по кругу или случайно (по умолчанию true)
  onlyHorizontal?: boolean      // только по горизонтали (Y фиксирован) или 3D (по умолчанию true)
  /**
   * Максимальный наклон (в градусах) при автоповороте по нормали.
   * Если не задан — используется глобальное значение по умолчанию (30°).
   * Масштабирование линейное: 0° нормали → 0°, 90° → maxTerrainTiltDeg.
   */
  maxTerrainTiltDeg?: number
}
```

**Доступные стратегии:**

- **`Random`** - случайное размещение без проверки коллизий
- **`RandomNoCollision`** - случайное размещение с избеганием пересечений существующих объектов
- **`PlaceAround`** - размещение экземпляров вокруг целевого инстанса или всех инстансов указанного объекта с учётом габаритов (bounding box) и коллизий.

Примечания к выравниванию по террейну:
- Размещение по высоте (Y): по умолчанию включено.
- Автоповорот по нормали: по умолчанию выключен; при включении повороты по X/Z рассчитываются из нормали без «зеркал».
- Наклон ограничивается линейным масштабированием: 0° нормали → 0°, 90° → `maxTerrainTiltDeg` (по умолчанию 30°). Значение можно задать в `metadata` стратегии.

### Типы результатов

```typescript
// Результат массового добавления экземпляров
interface AddInstancesResult {
  success: boolean
  instanceCount: number
  instances?: CreatedInstanceInfo[]
  errors?: string[]
  error?: string
}

// Информация о созданном экземпляре
interface CreatedInstanceInfo {
  instanceUuid: string
  objectUuid: string
  parameters: {
    position: Vector3
    rotation: Vector3
    scale: Vector3
    visible: boolean
  }
  boundingBox?: BoundingBox
}
```

### `canAddInstance(objectUuid: string): boolean`
Проверяет, существует ли объект с заданным UUID и можно ли создать его экземпляр.

### `getSceneStats()`
Собирает статистику по количеству объектов, экземпляров и слоев, а также типам примитивов в сцене.

## 🆕 Процедурная генерация ландшафта

### `generateProceduralTerrain(spec: GfxProceduralTerrainSpec): Promise<GfxTerrainConfig>`
Собирает полный `GfxTerrainConfig` по спецификации процедурной генерации. Использует детерминированный PRNG и набор рецептов (`recipes`) для формирования массива локальных операций рельефа (`ops`).

- Вход: `spec: GfxProceduralTerrainSpec` — размеры мира, параметры базового Perlin, пул рецептов и опциональный глобальный `seed`.
- Выход: `Promise<GfxTerrainConfig>` — конфигурация террейна, готовая к использованию в слое.

Пример (JavaScript):
```javascript
const spec = {
  world: { width: 240, depth: 240, edgeFade: 0.1 },
  base: { seed: 3795, octaveCount: 5, amplitude: 8, persistence: 0.55, width: 128, height: 128 },
  pool: {
    global: { intensityScale: 1.0, maxOps: 80 },
    recipes: [
      { kind: 'hill', count: [20, 30], placement: { type: 'uniform' }, radius: [10, 18], intensity: [4, 9], falloff: 'smoothstep' },
      { kind: 'plateau', count: [2, 4], placement: { type: 'poisson', minDistance: 50 }, radius: [12, 18], intensity: [2, 4] }
    ]
  },
  seed: 3795
}
const cfg = await SceneAPI.generateProceduralTerrain(spec)
```

### `generateTerrainOpsFromPool(pool: GfxTerrainOpPool, seed?: number, opts?): Promise<GfxTerrainOp[]>`
Генерирует массив операций рельефа (`GfxTerrainOp[]`) из пула рецептов без сборки полного `GfxTerrainConfig`.

- Вход: `pool`, `seed`, опции окружения (обязательны `worldWidth/worldDepth`, можно передать `area` и `sampler`). Для совместимости допускается `worldHeight`.
- Выход: `Promise<GfxTerrainOp[]>` — готовый набор операций, учитывающий bias и лимиты.

Пример (JavaScript):
```javascript
// С фиксированным сидом (детерминированно)
const ops = await SceneAPI.generateTerrainOpsFromPool(spec.pool, spec.seed, {
  worldWidth: spec.layer.width,
  worldDepth: spec.layer.depth // fallback на worldHeight поддерживается
})

// Без передачи seed (будет сгенерирован автоматически)
const opsAuto = await SceneAPI.generateTerrainOpsFromPool(spec.pool, undefined, {
  worldWidth: spec.layer.width,
  worldDepth: spec.layer.depth
})
```

### `createProceduralLayer(spec: GfxProceduralTerrainSpec, layerData?: Partial<SceneLayer>): Promise<{ success: boolean, layerId?: string, error?: string }>`
Создаёт ландшафтный слой типа Terrain на основе спецификации. Внутри вызывает `generateProceduralTerrain(spec)`, затем создаёт слой и выполняет корректировку существующих инстансов по рельефу.

- Вход: `spec` и опциональные поля `layerData` (имя, видимость, позиция, **цвет** и т.п.).
- Выход: `{ success, layerId?, error? }`.

Пример (JavaScript):
```javascript
const res = await SceneAPI.createProceduralLayer(spec, { 
  name: 'Песчаные дюны', 
  visible: true,
  color: '#F4A460' // Цвет слоя террейна
})
if (!res.success) console.error(res.error)
```

Примечания:
- Валидируются значения `recipe.kind`, `placement.type`, `falloff` и ключи `bias`. При ошибке возвращается понятное сообщение с указанием неверного поля.
- Поддерживаемые значения перечислены в `docs/api/types/terrain.md` (раздел «Процедурная генерация»).

### `createObject(objectData: GfxObject, layerId?: string, count: number = 1, placementStrategyConfig: PlacementStrategyConfig): AddObjectWithTransformResult`
Унифицированный метод создания нового объекта и размещения его экземпляров в сцене. Объединяет создание объекта и размещение экземпляров в одном методе.

**Параметры:**
- `objectData` - данные для создания нового объекта
- `layerId` - ID слоя для размещения объекта (опционально, по умолчанию 'objects')
- `count` - количество экземпляров для создания (по умолчанию 1)
- `placementStrategyConfig` - конфигурация стратегии размещения

**Возвращает:** `AddObjectWithTransformResult` с UUID созданного объекта и первого экземпляра

🆕 **Поддержка групп**: Метод автоматически обрабатывает объекты с иерархическими группами примитивов (`primitiveGroups` и `primitiveGroupAssignments`).

```typescript
// Пример использования
const result = SceneAPI.createObject(
  {
    uuid: generateUUID(),
    name: 'Дом',
    primitives: [...],
    materials: [...]
  },
  'buildings',
  3,
  { strategy: PlacementStrategy.Random }
)
```

```typescript
// Пример: разместить 8 экземпляров вокруг ВСЕХ инстансов объекта-дерева
const res1 = SceneAPI.addInstances(
  'tree-object-uuid',
  'nature-layer',
  8,
  {
    strategy: PlacementStrategy.PlaceAround,
    metadata: {
      targetObjectUuid: 'house-object-uuid',
      minDistance: 2.0,
      maxDistance: 5.0,
      distributeEvenly: true,
      onlyHorizontal: true
    }
  }
)

// Пример: создать новый объект и расположить его вокруг конкретного инстанса
const res2 = SceneAPI.createObject(
  newObjectData,
  'objects',
  6,
  {
    strategy: PlacementStrategy.PlaceAround,
    metadata: {
      targetInstanceUuid: 'some-instance-uuid',
      minDistance: 1.5,
      maxDistance: 3.0,
      distributeEvenly: false,
      angleOffset: 0
    }
  }
)
```

### `adjustInstancesForPerlinTerrain(perlinLayerId: string): { success: boolean; adjustedCount?: number; error?: string }`
Корректирует положение всех экземпляров объектов под ландшафтный слой, используя единый `GfxHeightSampler`.

Примечания:
- Название метода сохранено для обратной совместимости, применяется к рельефным слоям новой архитектуры (`terrain.source.kind = 'perlin' | 'heightmap').
- Высоты и нормали вычисляются через `GfxHeightSampler` (без дублирования логики). 

### `searchObjectsInLibrary(query: string): Promise<ObjectRecord[]>`
Ищет объекты в библиотеке по названию или описанию и возвращает массив найденных записей.

### `addObjectFromLibrary(objectUuid: string, layerId?: string, count: number = 1, placementStrategyConfig: PlacementStrategyConfig): Promise<AddObjectResult>`
Унифицированный метод добавления объекта из библиотеки на сцену с использованием стратегий размещения.

**Параметры:**
- `objectUuid` - UUID объекта в библиотеке
- `layerId` - ID слоя для размещения объекта (опционально, по умолчанию 'objects')
- `count` - количество экземпляров для создания (по умолчанию 1)
- `placementStrategyConfig` - конфигурация стратегии размещения

**Возвращает:** `Promise<AddObjectResult>` с UUID созданного объекта и первого экземпляра

**Особенности:**
- Поле `libraryUuid` сохраняется в объекте сцены для отслеживания происхождения
- Внутренне использует `createObject` для унифицированного создания

```typescript
// Пример использования
const result = await SceneAPI.addObjectFromLibrary(
  'library-object-uuid-456',
  'environment',
  2,
  { strategy: PlacementStrategy.RandomNoCollision }
)
```

### `SceneObjectInfo`
```typescript
interface SceneObjectInfo {
  uuid: string
  name: string
  layerId?: string
  visible?: boolean
  libraryUuid?: string // UUID записи в библиотеке
  boundingBox?: BoundingBox
  primitiveCount: number
  primitiveTypes: string[]
  hasInstances: boolean
  instanceCount: number
}
```

---

## 🔄 Migration Guide / Руководство по миграции

### Устаревшие методы (удалены в рефакторинге)

Следующие методы были удалены и заменены унифицированными:

| Устаревший метод | Новый метод | Описание миграции |
|------------------|-------------|-------------------|
| `addObjectInstance()` | `addInstances()` | Используйте `addInstances(uuid, layerId, 1, config)` |
| `addSingleObjectInstance()` | `addInstances()` | Используйте `addInstances(uuid, layerId, 1, config)` |
| `addObjectInstances()` | `addInstances()` | Замените прямым вызовом `addInstances()` |
| `addRandomObjectInstances()` | `addInstances()` | Используйте `addInstances()` с `PlacementStrategy.Random` |
| `addObjectWithTransform()` | `createObject()` | Замените на `createObject()` с соответствующими параметрами |

### Примеры миграции

**До рефакторинга:**
```typescript
// Старый способ
SceneAPI.addRandomObjectInstances(objectUuid, 5, layerId)

// Старый способ создания объекта
SceneAPI.addObjectWithTransform({
  name: 'House',
  primitives: [...],
  transform: { position: [0, 0, 0] }
})
```

**После рефакторинга:**
```typescript
// Новый способ - более гибкий
SceneAPI.addInstances(
  objectUuid, 
  layerId, 
  5, 
  { strategy: PlacementStrategy.Random }
)

// Новый способ создания объекта - с автоматическим размещением
SceneAPI.createObject(
  {
    name: 'House',
    primitives: [...]
  },
  layerId,
  1,
  { strategy: PlacementStrategy.Random }
)
```

---

## AI Tools интеграция

### Поддержка групп примитивов в AI Tools

SceneAPI полностью поддерживает создание объектов с иерархическими группами через AI агенты:

#### `add_new_object` tool
AI инструмент для создания объектов теперь поддерживает:

```typescript
// Схема для создания объекта с группами
{
  name: string,
  primitives: GfxPrimitive[],
  
  // 🆕 Новые поля для группировки
  primitiveGroups?: Record<string, {
    uuid: string,
    name: string,
    visible?: boolean,
    parentGroupUuid?: string,
    sourceObjectUuid?: string,
    transform?: {
      position?: Vector3,
      rotation?: Vector3, 
      scale?: Vector3
    }
  }>,
  primitiveGroupAssignments?: Record<string, string> // primitiveUuid -> groupUuid
}
```

#### Примеры использования AI tools

**Создание объекта с иерархическими группами:**
```json
{
  "name": "Дом с группировкой",
  "primitives": [
    { "uuid": "foundation-1", "type": "box", "geometry": {...} },
    { "uuid": "wall-1", "type": "box", "geometry": {...} },
    { "uuid": "roof-1", "type": "pyramid", "geometry": {...} }
  ],
  "primitiveGroups": {
    "structure": {
      "uuid": "structure", 
      "name": "Конструкция"
    },
    "foundation": {
      "uuid": "foundation",
      "name": "Фундамент", 
      "parentGroupUuid": "structure"
    },
    "walls": {
      "uuid": "walls",
      "name": "Стены",
      "parentGroupUuid": "structure"
    }
  },
  "primitiveGroupAssignments": {
    "foundation-1": "foundation",
    "wall-1": "walls",
    "roof-1": "structure"
  }
}
```

**Возможности AI:**
- 🏗️ Создание логически структурированных объектов
- 📁 Автоматическая группировка связанных примитивов
- 🌲 Создание иерархических структур (фундамент → стены → крыша)
- 📦 Импорт объектов с сохранением групповой структуры

### Связанные AI Tools

- **ObjectEditor tools** (`src/features/editor/object/lib/ai/tools/`):
  - `getObjectData` - возвращает полную информацию о группах
  - `addPrimitives` - поддерживает создание примитивов с группами
  
- **SceneEditor tools** (`src/features/editor/scene/lib/ai/tools/`):
  - `add_new_object` - создание объектов с группами на сцене

