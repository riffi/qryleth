import type { TemplateData } from '../../types'

/**
 * Шаблон: Гладкая гора по центру мира — опирается на наложение плато друг на друга с mode: 'add'
 */
export const smoothMountainTemplate: TemplateData = {
  id: 'smooth-mountain',
  name: 'Гладкая гора по центру мира',
  description: 'Большая Гладкая гора по центру мира, основанная на группе плато с mode add',
  code: `// Гладкая гора по центру мира
const smoothMountain = {
  world: { width: 300, depth: 300, edgeFade: 0 },
  base: {
    octaveCount: 4,
    amplitude: 6,
    persistence: 0.5,
    width: 128,
    height: 128
  },
  pool: {
    global: { intensityScale: 1.0, maxOps: 10 },
    recipes: [
     {
        kind: 'plateau',
        mode: 'add',
        count: 8,
        placement: { type: 'poisson', minDistance: 35, area: { kind: 'circle', x: 0, z: 0, radius: 100 } },
        radius: [60, 150],
        intensity: [8, 15],
        falloff: 'plateau',
        flatInner: 0.3
    }

    ]
  },
}

const layer = await sceneApi.createProceduralLayer(smoothMountain, {
  name: 'Гладкая гора',
  visible: true,
  color: '#696969' // Темно-серый цвет горы
})

console.log('Создана Гладкая гора', layer)`
}

