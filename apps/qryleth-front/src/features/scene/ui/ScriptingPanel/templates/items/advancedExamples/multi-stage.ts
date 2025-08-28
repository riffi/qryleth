import type { TemplateData } from '../../types'

/**
 * Шаблон: Многоэтапное создание — базовый слой, детальные операции и размещение объектов.
 */
export const multiStageTemplate: TemplateData = {
  id: 'multi-stage',
  name: 'Многоэтапное создание',
  description: 'Создание базового слоя, генерация деталей и размещение объектов.',
  code: `// Пример создания террейна в несколько этапов
console.log('Этап 1: Создание базового ландшафта...')

// multiColorApi теперь доступен глобально вместе с sceneApi

const baseResult = await sceneApi.createProceduralLayer({
  world: { width: 300, depth: 300, edgeFade: 0.1 },
  base: { 
    seed: 1000, 
    octaveCount: 4, 
    amplitude: 5, 
    persistence: 0.4, 
    width: 64, 
    height: 64 
  },
  pool: { recipes: [] },
  seed: 1000
}, { 
  name: 'Базовый ландшафт',
  // Добавляем многоцветную окраску по высоте
  multiColor: multiColorApi.createHeightBasedConfig(-2, 8, 4, 1.0)
})

console.log('Базовый ландшафт:', baseResult)

console.log('Этап 2: Генерация деталей рельефа...')

const detailOps = await sceneApi.generateTerrainOpsFromPool({
  recipes: [
    { 
      kind: 'hill', 
      count: [10, 15], 
      placement: { type: 'poisson', minDistance: 20 }, 
      radius: [8, 15], 
      intensity: [2, 5],
      falloff: 'smoothstep'
    },
    {
      kind: 'valley',
      count: [2, 4],
      placement: { type: 'uniform' },
      radius: [12, 20],
      intensity: [3, 6],
      aspect: [0.4, 0.8]
    }
  ]
}, 2000)

console.log('Операции деталей:', detailOps)

console.log('Этап 3: Размещение объектов на террейне...')

const objects = sceneApi.getSceneObjects()
if (objects.length > 0) {
  const instanceResult = sceneApi.addInstances(
    objects[0].uuid, 
    undefined, 
    10, 
    { strategy: 'RandomNoCollision' }
  )
  console.log('Размещены объекты:', instanceResult)
} else {
  console.log('Нет объектов для размещения')
}

console.log('✓ Многоэтапное создание завершено!')`
}

