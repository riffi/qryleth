import type { TemplateData } from '../../types'

/**
 * Шаблон: Прибрежная зона — изрезанное побережье, бухты и прибрежные скалы.
 */
export const coastalAreaTemplate: TemplateData = {
  id: 'coastal-area',
  name: 'Прибрежная зона',
  description: 'Изрезанное побережье: суша, бухты и прибрежные скалы.',
  code: `// Изрезанное побережье с бухтами
const coastalSpec = {
  world: { width: 400, depth: 200, edgeFade: 0.25 },
  base: { 
    seed: 9999, 
    octaveCount: 3, 
    amplitude: 3, 
    persistence: 0.4, 
    width: 64, 
    height: 32 
  },
  pool: {
    global: { intensityScale: 1.1, maxOps: 45 },
    recipes: [
      // Береговая линия (суша)
      {
        kind: 'plateau',
        count: [3, 5],
        // Правая половина мира: X [0..200]
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: 0, z: -100, width: 200, depth: 200 }
        },
        radius: [40, 70],
        aspect: [0.6, 1.4],
        intensity: [5, 8],
        rotation: [Math.PI * 0.4, Math.PI * 0.6]
      },
      // Бухты (углубления)
      {
        kind: 'basin',
        count: [4, 7],
        // Центральная вертикальная полоса X [-50..50]
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: -50, z: -100, width: 100, depth: 200 }
        },
        radius: [20, 35],
        aspect: [1.2, 2.0],
        intensity: [4, 7],
        falloff: 'smoothstep',
        bias: { preferHeight: { min: 2, max: 6, weight: 0.8 } }
      },
      // Прибрежные скалы
      {
        kind: 'ridge',
        count: [2, 4],
        // Левая кромка: X [-200..-80]
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: -200, z: -100, width: 120, depth: 200 }
        },
        radius: [15, 25],
        aspect: [0.1, 0.3],
        intensity: [8, 15],
        step: [20, 30],
        falloff: 'linear',
        bias: { avoidOverlap: true }
      }
    ]
  },
  seed: 9999
}

const coast = await sceneApi.createProceduralLayer(coastalSpec, {
  name: 'Изрезанное побережье',
  visible: true,
  color: '#F5DEB3' // Песчано-пшеничный цвет прибрежной зоны
})

console.log('Прибрежная зона создана:', coast)`
}

