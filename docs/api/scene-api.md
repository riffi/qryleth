# Scene API Reference / Справочник Scene API

Описание публичных функций `SceneAPI`, предоставляющих доступ к данным сцены и операциям с объектами. Используется агентами ИИ для взаимодействия с редактором.

---

## Location / Местоположение
`src/features/scene/lib/sceneAPI.ts`

---

## Methods / Методы

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

### `addObjectInstance(objectUuid: string, position?: Vector3, rotation?: Vector3, scale?: Vector3, visible?: boolean): AddInstanceResult`
Создает экземпляр существующего объекта с указанной трансформацией. Проверяет наличие объекта и добавляет экземпляр в хранилище.

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

### `canAddInstance(objectUuid: string): boolean`
Проверяет, существует ли объект с заданным UUID и можно ли создать его экземпляр.

### `getSceneStats()`
Собирает статистику по количеству объектов, экземпляров и слоев, а также типам примитивов в сцене.

### `addObjectWithTransform(objectData: GfxObjectWithTransform): AddObjectWithTransformResult`
Добавляет новый объект и его экземпляр с трансформацией. Применяет коррекцию к данным и учитывает ландшафт при размещении.

🆕 **Поддержка групп**: Метод автоматически обрабатывает объекты с иерархическими группами примитивов (`primitiveGroups` и `primitiveGroupAssignments`).

### `adjustInstancesForPerlinTerrain(perlinLayerId: string): { success: boolean; adjustedCount?: number; error?: string }`
Корректирует положение всех экземпляров объектов под ландшафтный слой, используя единый `GfxHeightSampler`.

Примечания:
- Название метода сохранено для обратной совместимости, но под капотом применяется к любому рельефному слою (`terrain.source.kind = 'perlin' | 'heightmap' | 'legacy'`).
- Высоты и нормали вычисляются через `GfxHeightSampler` (без дублирования логики). 

### `searchObjectsInLibrary(query: string): Promise<ObjectRecord[]>`
Ищет объекты в библиотеке по названию или описанию и возвращает массив найденных записей.

### `addObjectFromLibrary(objectUuid: string, layerId: string, transform?: Transform): Promise<AddObjectResult>`
Добавляет объект из библиотеки на сцену. Поле `libraryUuid` сохраняется в объекте сцены для отслеживания происхождения.

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

- **ObjectEditor tools** (`src/features/object-editor/lib/ai/tools/`):
  - `getObjectData` - возвращает полную информацию о группах
  - `addPrimitives` - поддерживает создание примитивов с группами
  
- **SceneEditor tools** (`src/features/scene/lib/ai/tools/`):
  - `add_new_object` - создание объектов с группами на сцене
