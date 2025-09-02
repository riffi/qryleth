import type { TemplateData } from '../../types'

/**
 * Утилита: Анализ сцены — сводка по объектам, слоям и статистике.
 */
export const sceneAnalyzerTemplate: TemplateData = {
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
}

