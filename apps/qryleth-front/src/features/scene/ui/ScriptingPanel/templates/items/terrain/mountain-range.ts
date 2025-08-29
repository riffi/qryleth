import type { TemplateData } from '../../types'

/**
 * Шаблон: Горный массив — главный хребет, отроги и пики.
 */
export const mountainRangeTemplate: TemplateData = {
  id: 'mountain-range',
  name: 'Горный массив',
  description: 'Реалистичный массив: главный хребет, отроги и пики.',
  code: `// Реалистичный горный массив с хребтами
const mountainRangeSpec = {
  layer: { width: 500, depth: 300, edgeFade: 0.2 },
  base: { 
    seed: 7777, 
    octaveCount: 6, 
    amplitude: 12, 
    persistence: 0.65, 
    width: 128, 
    height: 128 
  },
  pool: {
    global: { intensityScale: 1.3, maxOps: 70 },
    recipes: [
      // Главный хребет
      {
        kind: 'ridge',
        count: 1,
        // Главный хребет в центре
        placement: { type: 'ring', center: [0, 0], rMin: 0, rMax: 2 },
        radius: 120,
        aspect: 0.25,
        intensity: 20,
        step: 30,
        rotation: Math.PI * 0.15,
        falloff: 'smoothstep'
      },
      // Боковые отроги
      {
        kind: 'ridge',
        count: [6, 10],
        placement: { type: 'ring', center: [0, 0], rMin: 80, rMax: 150 },
        radius: [25, 50],
        aspect: [0.2, 0.4],
        intensity: [8, 15],
        step: [15, 25],
        rotation: [0, Math.PI * 2],
        falloff: 'gauss',
        bias: { preferHeight: { min: 8, max: 25, weight: 0.7 } }
      },
      // Пики
      {
        kind: 'hill',
        count: [10, 15],
        placement: { type: 'poisson', minDistance: 35 },
        radius: [8, 15],
        intensity: [6, 12],
        falloff: 'gauss',
        bias: { 
          preferHeight: { min: 15, max: 40, weight: 0.9 },
          preferSlope: { min: 0.1, max: 0.6, weight: 0.5 }
        }
      }
    ]
  },
  seed: 7777
}

const mountains = await sceneApi.createProceduralLayer(mountainRangeSpec, {
  name: 'Горный массив Драконьи Зубы',
  visible: true,
  color: '#8B7D6B' // Серо-коричневый цвет горного массива
})

console.log('Горный массив создан:', mountains)`
}

