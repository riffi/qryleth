import type { TemplateData } from '../../types'

/**
 * Шаблон: Тестовый террейн — минимальные параметры для быстрой проверки.
 */
export const testTerrainTemplate: TemplateData = {
  id: 'test-terrain',
  name: 'Тестовый террейн',
  description: 'Упрощённый шаблон для быстрого теста параметров шума и одной операции.',
  code: `// Быстрый тест с низкими параметрами
const testSpec = {
  // Центр мира: [0,0,0]; Z — глубина
  world: { width: 100, depth: 100, edgeFade: 0.05 },
  base: { 
    seed: 123, 
    octaveCount: 2, 
    amplitude: 3, 
    persistence: 0.3, 
    width: 128, 
    height: 128 
  },
  pool: { 
    global: { maxOps: 10 },
    recipes: [
      { kind: 'hill', count: 5, placement: { type: 'uniform' }, radius: 8, intensity: 2 }
    ]
  },
  seed: 123
}

const test = await sceneApi.createProceduralLayer(testSpec, { 
  name: 'Тест', 
  visible: true 
})

console.log('Тестовый террейн:', test)`
}

