export type LanguageMode = 'javascript' | 'typescript'

export const getDefaultScript = (mode: LanguageMode): string => {
  if (mode === 'typescript') {
    return `// Пример использования SceneAPI с TypeScript
interface SceneOverview {
  totalObjects: number
  totalInstances: number
  objects: SceneObjectInfo[]
  instances: SceneInstanceInfo[]
  sceneName: string
  layers: Array<{id: string, name: string, visible: boolean, objectCount: number}>
}

const overview: SceneOverview = sceneApi.getSceneOverview()
console.log('Объектов в сцене:', overview.totalObjects)
console.log('Экземпляров:', overview.totalInstances)
console.log('Слои:', overview.layers)

// Получить статистику с вложенными свойствами
const stats = sceneApi.getSceneStats()
console.log('Общие объекты:', stats.total.objects)
console.log('Видимые объекты:', stats.visible.objects)

// Получить все объекты
const objects: SceneObjectInfo[] = sceneApi.getSceneObjects()
objects.forEach((obj: SceneObjectInfo) => {
  console.log(\`Объект: \${obj.name}, примитивов: \${obj.primitiveCount}\`)
})

// Создать экземпляр первого объекта (если есть)
if (objects.length > 0) {
  // Доступные стратегии: 'Random' | 'RandomNoCollision' | 'PlaceAround'
  const result = sceneApi.addInstances(
    objects[0].uuid,
    undefined, // layerId - автоматически определится
    1, // count
    { strategy: 'RandomNoCollision' } // placementStrategy
  )
  console.log('Результат создания экземпляра:', result)
}

// Пример использования PlaceAround: разместить 6 объектов вокруг всех инстансов первого объекта
if (objects.length > 0) {
  const res2 = sceneApi.addInstances(
    objects[0].uuid,
    undefined,
    6,
    {
      strategy: 'PlaceAround',
      metadata: {
        // Приоритет 1: конкретный инстанс – укажите UUID при необходимости
        // targetInstanceUuid: 'some-instance-uuid',
        // Приоритет 2: вокруг всех инстансов объекта
        targetObjectUuid: objects[0].uuid,
        minDistance: 2.0,
        maxDistance: 5.0,
        angleOffset: 0,
        distributeEvenly: true,
        onlyHorizontal: true
      }
    }
  )
  console.log('PlaceAround:', res2)
}`
  } else {
    return `// Пример использования SceneAPI
const overview = sceneApi.getSceneOverview()
console.log('Объектов в сцене:', overview.totalObjects)
console.log('Экземпляров:', overview.totalInstances)
console.log('Слои:', overview.layers)

// Получить статистику с вложенными свойствами  
const stats = sceneApi.getSceneStats()
console.log('Общие объекты:', stats.total.objects)
console.log('Видимые объекты:', stats.visible.objects)

// Получить все объекты
const objects = sceneApi.getSceneObjects()
objects.forEach(obj => {
  console.log(\`Объект: \${obj.name}, примитивов: \${obj.primitiveCount}\`)
})

// Создать экземпляр первого объекта (если есть)
if (objects.length > 0) {
  // Доступные стратегии: 'Random' | 'RandomNoCollision' | 'PlaceAround'
  const result = sceneApi.addInstances(
    objects[0].uuid,
    undefined, // layerId - автоматически определится
    1, // count
    { strategy: 'RandomNoCollision' } // placementStrategy
  )
  console.log('Результат создания экземпляра:', result)
}

// Пример PlaceAround: 8 экземпляров по кругу вокруг всех инстансов выбранного объекта
if (objects.length > 0) {
  const res2 = sceneApi.addInstances(
    objects[0].uuid,
    undefined,
    8,
    {
      strategy: 'PlaceAround',
      metadata: {
        targetObjectUuid: objects[0].uuid,
        minDistance: 1.5,
        maxDistance: 4.0,
        angleOffset: 0,
        distributeEvenly: true,
        onlyHorizontal: true
      }
    }
  )
  console.log('PlaceAround:', res2)
}`
  }
}
