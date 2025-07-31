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

### `getAvailableLayers()`
Возвращает слои сцены с их идентификаторами и видимостью, доступные для размещения объектов.

### `canAddInstance(objectUuid: string): boolean`
Проверяет, существует ли объект с заданным UUID и можно ли создать его экземпляр.

### `getSceneStats()`
Собирает статистику по количеству объектов, экземпляров и слоев, а также типам примитивов в сцене.

### `addObjectWithTransform(objectData: GfxObjectWithTransform): AddObjectWithTransformResult`
Добавляет новый объект и его экземпляр с трансформацией. Применяет коррекцию к данным и учитывает ландшафт при размещении.

### `adjustInstancesForPerlinTerrain(perlinLayerId: string): { success: boolean; adjustedCount?: number; error?: string }`
Корректирует положение всех экземпляров объектов под ландшафт с перлин‑шумом и возвращает количество изменённых элементов.

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
