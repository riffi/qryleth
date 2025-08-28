import type { TemplateGroup } from '../types'

/**
 * Группа «Инструменты и утилиты» — сервисные скрипты для анализа, выравнивания
 * и оценки производительности процедурной генерации.
 */
export const utilitiesGroup: TemplateGroup = {
  id: 'utilities',
  title: 'Инструменты и утилиты',
  templates: [
    {
      id: 'scene-analyzer',
      name: 'Анализ сцены',
      description: 'Выводит сводную информацию по объектам, слоям и статистике.',
      code: `// Полный анализ текущей сцены
console.log('=== АНАЛИЗ СЦЕНЫ ===')

// Общая информация
const overview = sceneApi.getSceneOverview()
console.log('Имя сцены:', overview.sceneName)
console.log('Всего объектов:', overview.totalObjects)
console.log('Всего экземпляров:', overview.totalInstances)

// Детальная статистика
const stats = sceneApi.getSceneStats()
console.log('\n=== СТАТИСТИКА ===')
console.log('Объекты - общие/видимые:', stats.total.objects + '/' + stats.visible.objects)
console.log('Экземпляры - общие/видимые:', stats.total.instances + '/' + stats.visible.instances)
console.log('Слои - общие/видимые:', stats.total.layers + '/' + stats.visible.layers)
console.log('Типы примитивов:', stats.primitiveTypes.join(', '))

// Информация о слоях
const layers = sceneApi.getAvailableLayers()
console.log('\n=== СЛОИ ===')
layers.forEach(layer => {
  const objectCount = overview.layers.find(l => l.id === layer.id)?.objectCount || 0
  console.log('Слой "' + layer.name + '": ' + objectCount + ' объектов, видимость: ' + layer.visible)
})

// Детали объектов
console.log('\n=== ОБЪЕКТЫ ===')
overview.objects.forEach(obj => {
  console.log('Объект "' + obj.name + '":')
  console.log('  - UUID: ' + obj.uuid)
  console.log('  - Примитивов: ' + obj.primitiveCount + ' (' + obj.primitiveTypes.join(', ') + ')')
  console.log('  - Экземпляров: ' + obj.instanceCount)
  console.log('  - Слой: ' + (obj.layerId || 'не задан'))
  console.log('  - Видимость: ' + (obj.visible !== false ? 'видим' : 'скрыт'))
  if (obj.boundingBox) {
    const bb = obj.boundingBox
    console.log('  - Размеры: ' + 
      (bb.max[0] - bb.min[0]).toFixed(1) + ' x ' + 
      (bb.max[1] - bb.min[1]).toFixed(1) + ' x ' + 
      (bb.max[2] - bb.min[2]).toFixed(1))
  }
  console.log('')
})`
    },
    {
      id: 'instances-adjust',
      name: 'Выравнивание объектов',
      description: 'Находит слой террейна и выравнивает экземпляры по поверхности.',
      code: `// Выровнять все объекты по существующему террейну
const layers = sceneApi.getAvailableLayers()
const terrainLayers = layers.filter(layer => 
  layer.name.toLowerCase().includes('террейн') || 
  layer.name.toLowerCase().includes('ландшафт') ||
  layer.name.toLowerCase().includes('terrain')
)

if (terrainLayers.length === 0) {
  console.log('❌ Не найдено слоев террейна для выравнивания')
} else {
  console.log('Найдено террейн-слоев:', terrainLayers.length)
  
  // Взять первый террейн-слой
  const terrainLayer = terrainLayers[0]
  console.log('Выравниваю объекты по слою:', terrainLayer.name)
  
  const adjustResult = sceneApi.adjustInstancesForPerlinTerrain(terrainLayer.id)
  
  if (adjustResult.success) {
    console.log('✅ Выровнено объектов:', adjustResult.adjustedCount)
  } else {
    console.log('❌ Ошибка выравнивания:', adjustResult.error)
  }
}

// Показать статистику после выравнивания
const newStats = sceneApi.getSceneStats()
console.log('\nОбновленная статистика экземпляров:', newStats.total.instances)`
    },
    {
      id: 'perf-test',
      name: 'Тест производительности',
      description: 'Замер времени генерации для разных размеров мира и числа операций.',
      code: `// Тест производительности генерации террейнов
console.log('Запуск теста производительности...')

const testSizes = [
  { name: 'Малый', world: [50, 50], base: [16, 16], ops: 5 },
  { name: 'Средний', world: [100, 100], base: [32, 32], ops: 15 },
  { name: 'Большой', world: [200, 200], base: [64, 64], ops: 30 }
]

for (const test of testSizes) {
  console.log('\nТестирую размер: ' + test.name + ' (' + test.world[0] + 'x' + test.world[1] + ')')
  
  const startTime = Date.now()
  
  const spec = {
    world: { width: test.world[0], depth: test.world[1], edgeFade: 0.1 },
    base: { 
      seed: 555, 
      octaveCount: 3, 
      amplitude: 5, 
      persistence: 0.4, 
      width: test.base[0], 
      height: test.base[1] 
    },
    pool: {
      global: { maxOps: test.ops },
      recipes: [
        { kind: 'hill', count: test.ops, placement: { type: 'uniform' }, radius: [5, 12], intensity: [2, 5] }
      ]
    },
    seed: 555
  }
  
  try {
    const result = await sceneApi.createProceduralLayer(spec, { 
      name: 'Тест ' + test.name.toLowerCase(), 
      visible: true 
    })
    
    const duration = Date.now() - startTime
    
    if (result.success) {
      console.log('✅ Успешно за ' + duration + 'мс (ID: ' + result.layerId + ')')
    } else {
      console.log('❌ Ошибка: ' + result.error)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.log('❌ Исключение за ' + duration + 'мс: ' + (error as any).message)
  }
}

console.log('\nТест производительности завершен!')`
    }
  ]
}
