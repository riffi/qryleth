import type { TemplateData } from '../../types'

/**
 * Шаблон: Холмистая местность — мягкие перекатывающиеся холмы.
 */
export const gentleHillsTemplate: TemplateData = {
  id: 'gentle-hills',
  name: 'Холмистая местность',
  description: 'Пасторальные мягкие холмы — реалистичные перекаты без резких форм.',
  code: `// Мягкие перекатывающиеся холмы
const hillsSpec = {
  world: { width: 250, depth: 250, edgeFade: 0.1 },
  base: { 
    seed: 4444, 
    octaveCount: 4, 
    amplitude: 5, 
    persistence: 0.4, 
    width: 128, 
    height: 128 
  },
  pool: {
    global: { intensityScale: 0.8, maxOps: 50 },
    recipes: [
      // Крупные холмы
      {
        kind: 'hill',
        count: [12, 18],
        placement: { type: 'poisson', minDistance: 25 },
        radius: [15, 25],
        aspect: [0.8, 1.2],
        intensity: [4, 8],
        falloff: 'smoothstep',
        rotation: [0, Math.PI * 2]
      },
      // Мелкие холмики для детализации
      {
        kind: 'hill',
        count: [20, 30],
        placement: { type: 'uniform' },
        radius: [5, 12],
        intensity: [1, 3],
        falloff: 'gauss',
        bias: { avoidOverlap: true }
      }
    ]
  },
  seed: 4444
}

const hills = await sceneApi.createProceduralLayer(hillsSpec, {
  name: 'Пасторальные холмы',
  visible: true,
  color: '#5cad5c' // Лесная зелень для мягких холмов
})

console.log('Созданы холмы:', hills)`
}

