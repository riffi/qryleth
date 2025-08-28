import type { TemplateData } from '../../types'

/**
 * Шаблон: Лунный кратер — разномасштабные кратеры с разными профилями спадов.
 */
export const lunarCratersTemplate: TemplateData = {
  id: 'lunar-craters',
  name: 'Лунный кратер',
  description: 'Разномасштабные кратеры с разными профилями спадов.',
  code: `// Кратерный ландшафт как на Луне
const craterSpec = {
  world: { width: 300, depth: 300, edgeFade: 0.1 },
  base: { 
    seed: 8888, 
    octaveCount: 2, 
    amplitude: 2, 
    persistence: 0.3, 
    width: 128, 
    height: 128 
  },
  pool: {
    global: { intensityScale: 1.5, maxOps: 40 },
    recipes: [
      // Большие кратеры
      {
        kind: 'crater',
        count: [3, 5],
        placement: { type: 'poisson', minDistance: 60 },
        radius: [20, 35],
        intensity: [8, 15],
        falloff: 'gauss'
      },
      // Средние кратеры
      {
        kind: 'crater',
        count: [8, 12],
        placement: { type: 'uniform' },
        radius: [8, 15],
        intensity: [3, 8],
        falloff: 'smoothstep',
        bias: { avoidOverlap: true }
      },
      // Мелкие кратеры
      {
        kind: 'crater',
        count: [15, 25],
        placement: { type: 'uniform' },
        radius: [3, 8],
        intensity: [1, 4],
        falloff: 'gauss'
      }
    ]
  },
  seed: 8888
}

const lunar = await sceneApi.createProceduralLayer(craterSpec, {
  name: 'Лунная поверхность',
  visible: true
})

console.log('Создана лунная поверхность:', lunar)`
}

