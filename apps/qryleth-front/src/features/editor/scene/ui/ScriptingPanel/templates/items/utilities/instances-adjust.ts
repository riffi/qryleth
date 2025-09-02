import type { TemplateData } from '../../types'

/**
 * Утилита: Выравнивание объектов — подгоняет экземпляры по поверхности террейна.
 */
export const instancesAdjustTemplate: TemplateData = {
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
}

