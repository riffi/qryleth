import type { TemplateData } from '../../types'

/**
 * Шаблон: Каньон с плато — контрастные формы каньонов и высоких плато.
 */
export const canyonPlateauTemplate: TemplateData = {
  id: 'canyon-plateau',
  name: 'Каньон с плато',
  description: 'Система каньонов и высоких плато; контрастные формы.',
  code: `// Система каньонов с плоскими плато
const canyonSpec = {
  world: { width: 400, depth: 250, edgeFade: 0.2 },
  base: { 
    seed: 9001, 
    octaveCount: 4, 
    amplitude: 8, 
    persistence: 0.5, 
    width: 128, 
    height: 128 
  },
  pool: {
    global: { intensityScale: 1.1, maxOps: 50 },
    recipes: [
      // Высокие плато
      {
        kind: 'plateau',
        count: [4, 6],
        placement: { type: 'poisson', minDistance: 50 },
        radius: [25, 40],
        intensity: [10, 18],
        // falloff/flatInner опущены — применится 'plateau' + flatInner=0.3
        aspect: [0.7, 1.3]
      },
      // Каньоны между плато
      {
        kind: 'valley',
        count: [3, 5],
        placement: { type: 'uniform' },
        radius: [15, 25],
        aspect: [0.2, 0.4],
        intensity: [12, 20],
        step: 30,
        falloff: 'smoothstep',
        bias: { preferHeight: { min: 5, max: 15, weight: 0.8 } }
      }
    ]
  },
  seed: 9001
}

const canyon = await sceneApi.createProceduralLayer(canyonSpec, {
  name: 'Каньоны и плато',
  visible: true
})

console.log('Созданы каньоны:', canyon)`
}
