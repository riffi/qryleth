import type { TemplateData } from '../../types'

/**
 * Шаблон: Создание многоцветного террейна с градиентами по высоте.
 */
export const multiColorTerrainTemplate: TemplateData = {
  id: 'multicolor-terrain',
  name: 'Многоцветный террейн',
  description: 'Создание ландшафта с многоцветной окраской по высоте с использованием palette.',
  code: `// Пример создания многоцветного террейна
console.log('🎨 Создание многоцветного горного ландшафта...')

// multiColorApi доступен глобально вместе с sceneApi

// Создание горного ландшафта с высотной зональностью
const mountainResult = await sceneApi.createProceduralLayer({
  world: { width: 200, depth: 200, edgeFade: 0.15 },
  base: { 
    seed: 2000, 
    octaveCount: 5, 
    amplitude: 12, 
    persistence: 0.5, 
    width: 80, 
    height: 80,
    heightOffset: -2
  },
  pool: {
    recipes: [
      { 
        kind: 'hill', 
        count: [8, 12], 
        placement: { type: 'poisson', minDistance: 25 }, 
        radius: [10, 18], 
        intensity: [3, 8],
        falloff: 'smoothstep'
      },
      {
        kind: 'valley',
        count: [2, 4],
        placement: { type: 'uniform' },
        radius: [15, 25],
        intensity: [4, 7],
        aspect: [0.3, 0.7]
      }
    ]
  },
  seed: 2000
}, { 
  name: 'Горный ландшафт',
  // Применяем готовую горную конфигурацию
  multiColor: multiColorApi.getMountainHeightConfig()
})

console.log('🏔️ Горный ландшафт создан:', mountainResult)


console.log('🎨 Создание тропического острова...')

// Создание тропического острова с пользовательской конфигурацией
const tropicalConfig = multiColorApi.createTropicalConfig(-8, 25)

const tropicalResult = await sceneApi.createProceduralLayer({
  world: { width: 180, depth: 180, edgeFade: 0.2 },
  base: { 
    seed: 4000, 
    octaveCount: 6, 
    amplitude: 15, 
    persistence: 0.4, 
    width: 70, 
    height: 70,
    heightOffset: -5
  },
  pool: {
    recipes: [
      { 
        kind: 'hill', 
        count: [3, 5], 
        placement: { type: 'center' }, 
        radius: [30, 45], 
        intensity: [8, 15],
        falloff: 'gauss'
      }
    ]
  },
  seed: 4000
}, { 
  name: 'Тропический остров',
  multiColor: tropicalConfig
})

console.log('🏝️ Тропический остров создан:', tropicalResult)

console.log('🎨 Создание простого двухцветного градиента...')

// Простой двухцветный градиент по высоте
const simpleGradient = multiColorApi.createTwoColorGradient(
  '#2e5c8a', // синий для низких участков
  '#f0f8ff', // белый для высоких участков
  5          // порог перехода на высоте 5 метров
)

const gradientResult = await sceneApi.createProceduralLayer({
  world: { width: 120, depth: 120, edgeFade: 0.05 },
  base: { 
    seed: 5000, 
    octaveCount: 3, 
    amplitude: 6, 
    persistence: 0.5, 
    width: 40, 
    height: 40 
  },
  pool: { recipes: [] },
  seed: 5000
}, { 
  name: 'Двухцветный градиент',
  multiColor: simpleGradient
})

console.log('🌊❄️ Двухцветный градиент создан:', gradientResult)

console.log('🎨 Создание пользовательской конфигурации...')

// Пользовательская конфигурация с произвольными цветами
const customColors = ['#8b4513', '#daa520', '#9acd32', '#228b22', '#4682b4']

const customConfig = multiColorApi.createCustomConfig(
  customColors,
  0,     // минимальная высота
  20     // максимальная высота
)

const customResult = await sceneApi.createProceduralLayer({
  world: { width: 160, depth: 160, edgeFade: 0.1 },
  base: { 
    seed: 6000, 
    octaveCount: 4, 
    amplitude: 10, 
    persistence: 0.45, 
    width: 64, 
    height: 64 
  },
  pool: {
    recipes: [
      { 
        kind: 'hill', 
        count: [6, 9], 
        placement: { type: 'random' }, 
        radius: [8, 15], 
        intensity: [2, 6]
      }
    ]
  },
  seed: 6000
}, { 
  name: 'Пользовательский ландшафт',
  multiColor: customConfig
})

console.log('🎭 Пользовательский ландшафт создан:', customResult)

console.log('✅ Все многоцветные ландшафты созданы!')
console.log('💡 Совет: Модифицируйте palette стопы для создания уникальных цветовых переходов')
console.log('🎨 Раскраска теперь происходит только по высоте с использованием palette для плавных градиентов')`
}