import type { TemplateData } from '../../types'

/**
 * Шаблон: Вулканический остров — круглый остров с кратером и береговыми утёсами.
 */
export const volcanicIslandTemplate: TemplateData = {
  id: 'volcanic-island',
  name: 'Вулканический остров',
  description: 'Круглый остров с кратером и холмами-ring вокруг.',
  code: `// Круглый остров с кратером в центре
const islandSpec = {
  // Круглый остров, центр мира — [0,0]
  world: { width: 200, depth: 200, edgeFade: 0.3 },
  base: { 
    seed: 2024, 
    octaveCount: 5, 
    amplitude: 4, 
    persistence: 0.6, 
    width: 128, 
    height: 128 
  },
  pool: {
    global: { intensityScale: 1.0, maxOps: 25 },
    recipes: [
      // Центральный вулкан
      {
        kind: 'crater',
        count: 1,
        placement: { type: 'ring', center: [0, 0], rMin: 0, rMax: 5 },
        radius: [25, 30],
        intensity: [15, 20],
        falloff: 'gauss'
      },
      // Холмы вокруг вулкана
      {
        kind: 'hill',
        count: [8, 12],
        placement: { type: 'ring', center: [0, 0], rMin: 40, rMax: 70 },
        radius: [8, 15],
        intensity: [4, 8],
        falloff: 'smoothstep',
        bias: { avoidOverlap: true }
      },
      // Прибрежные утесы
      {
        kind: 'ridge',
        count: [4, 6],
        placement: { type: 'ring', center: [0, 0], rMin: 80, rMax: 95 },
        radius: [6, 12],
        aspect: [0.2, 0.4],
        intensity: [3, 6],
        step: 15,
        falloff: 'linear'
      }
    ]
  },
  seed: 2024
}

const island = await sceneApi.createProceduralLayer(islandSpec, {
  name: 'Вулканический остров',
  visible: true
})

console.log('Создан остров:', island)`
}

