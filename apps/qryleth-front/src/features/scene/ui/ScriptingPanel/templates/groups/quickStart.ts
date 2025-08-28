import type { TemplateGroup } from '../types'

/**
 * Группа «Быстрый старт» — простые и быстрые примеры для начала работы.
 * Содержит минимальные сценарии создания террейна с понятными параметрами.
 */
export const quickStartGroup: TemplateGroup = {
  id: 'quick-start',
  title: 'Быстрый старт',
  templates: [
    {
      id: 'simple-hills',
      name: 'Простые холмы',
      description: 'Базовая генерация холмов за 30 секунд: один слой, без доп. операций.',
      code: `// Создать базовые холмы за 30 секунд
const result = await sceneApi.createProceduralLayer({
  // Координаты центрированы: X ∈ [-width/2..+width/2], Z ∈ [-depth/2..+depth/2]
  world: { width: 200, depth: 200, edgeFade: 0.1 },
  base: { 
    seed: 42, 
    amplitude: 8, 
    octaveCount: 3, 
    persistence: 0.4, 
    width: 128, 
    height: 128 
  },
  pool: { recipes: [] }, // без дополнительных операций
  seed: 42
}, { 
  name: 'Мои первые холмы', 
  visible: true 
})

console.log('Результат:', result)`
    },
    {
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
  ]
}
