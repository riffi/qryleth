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
  const result = sceneApi.addInstances(
    objects[0].uuid,
    undefined, // layerId - автоматически определится
    1, // count
    { strategy: 'Random' } // placementStrategy
  )
  console.log('Результат создания экземпляра:', result)
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
  const result = sceneApi.addInstances(
    objects[0].uuid,
    undefined, // layerId - автоматически определится
    1, // count
    { strategy: 'Random' } // placementStrategy
  )
  console.log('Результат создания экземпляра:', result)
}`
  }
}