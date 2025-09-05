import type { TemplateData } from '../../types'

/**
 * Шаблон: Песчаные дюны — пустынный ландшафт с полосами дюн и редкими впадинами.
 */
export const sandDunesTemplate: TemplateData = {
  id: 'sand-dunes',
  name: 'Песчаные дюны',
  description: 'Пустынный ландшафт: полосы дюн и редкие впадины.',
  code: `// Пустынный ландшафт с дюнами
const dunesSpec = {
  layer: { width: 200, depth: 200, edgeFade: 0.15 },
  base: { 
    seed: 46283, 
    octaveCount: 3, 
    amplitude: 4, 
    persistence: 0.4, 
    width: 128, 
    height: 128 
  },
  pool: {
    recipes: [
      { 
        kind: 'dune', 
        count: [20, 30], 
        placement: { type: 'gridJitter', cell: 16, jitter: 0.6 }, 
        radius: [8, 14], 
        aspect: [0.2, 0.5], 
        rotation: [-0.3, 0.3], 
        intensity: [1, 3], 
        falloff: 'smoothstep' 
      },
      { 
        kind: 'basin', 
        count: [3, 6], 
        placement: { type: 'poisson', minDistance: 40 }, 
        radius: [15, 25], 
        intensity: [2, 4], 
        bias: { preferHeight: { max: 2, weight: 0.8 } } 
      }
    ]
  },
  seed: 7777
}

const dunes = await sceneApi.createProceduralLandscape(dunesSpec, { 
  name: 'Песчаные дюны', 
  visible: true,
  material: { color: '#F4A460' } // Цвет песчаных дюн
})

console.log('Созданы дюны:', dunes)`
}
