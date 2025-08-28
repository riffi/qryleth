import type { TemplateGroup } from '../types'

/**
 * Группа «Специальные ландшафты» — пресеты с выраженной стилистикой
 * (дюны, кратеры, каньоны и т.д.).
 */
export const specialLandscapesGroup: TemplateGroup = {
  id: 'special-landscapes',
  title: 'Специальные ландшафты',
  templates: [
    {
      id: 'sand-dunes',
      name: 'Песчаные дюны',
      description: 'Пустынный ландшафт: полосы дюн и редкие впадины.',
      code: `// Пустынный ландшафт с дюнами
const dunesSpec = {
  world: { width: 200, depth: 200, edgeFade: 0.15 },
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

const dunes = await sceneApi.createProceduralLayer(dunesSpec, { 
  name: 'Песчаные дюны', 
  visible: true 
})

console.log('Созданы дюны:', dunes)`
    },
    {
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
    },
    {
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
        // falloff/flatInner опущены — применится 'plateau' + flatInner=0.7
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
  ]
}
