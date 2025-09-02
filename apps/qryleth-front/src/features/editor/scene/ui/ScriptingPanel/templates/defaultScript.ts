/**
 * Вернуть дефолтный пример скрипта для панели скриптинга.
 * Только JavaScript. Строки без обратных кавычек для устойчивого рендеринга.
 */
export const getDefaultScript = (): string => {
  return `// Пример использования sceneApi в ScriptingPanel
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
  console.log('Объект: ' + obj.name + ', примитивов: ' + obj.primitiveCount)
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

