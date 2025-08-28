import type { TemplateGroup } from '../types'

/**
 * Группа «Продвинутые примеры» — более комплексные сценарии
 * с комбинациями операций, смещениями и осмысленными bias/step.
 */
export const advancedExamplesGroup: TemplateGroup = {
  id: 'advanced-examples',
  title: 'Продвинутые примеры',
  templates: [
    {
      id: 'mountain-range',
      name: 'Горный массив',
      description: 'Реалистичный массив: главный хребет, отроги и пики.',
      code: `// Реалистичный горный массив с хребтами
const mountainRangeSpec = {
  world: { width: 500, depth: 300, edgeFade: 0.2 },
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
  visible: true
})

console.log('Горный массив создан:', mountains)`
    },
    {
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
  visible: true
})

console.log('Прибрежная зона создана:', coast)`
    },
    {
      id: 'multi-stage',
      name: 'Многоэтапное создание',
      description: 'Создание базового слоя, генерация деталей и размещение объектов.',
      code: `// Пример создания террейна в несколько этапов
console.log('Этап 1: Создание базового ландшафта...')

const baseResult = await sceneApi.createProceduralLayer({
  world: { width: 300, depth: 300, edgeFade: 0.1 },
  base: { 
    seed: 1000, 
    octaveCount: 4, 
    amplitude: 5, 
    persistence: 0.4, 
    width: 64, 
    height: 64 
  },
  pool: { recipes: [] },
  seed: 1000
}, { name: 'Базовый ландшафт' })

console.log('Базовый ландшафт:', baseResult)

console.log('Этап 2: Генерация деталей рельефа...')

const detailOps = await sceneApi.generateTerrainOpsFromPool({
  recipes: [
    { 
      kind: 'hill', 
      count: [10, 15], 
      placement: { type: 'poisson', minDistance: 20 }, 
      radius: [8, 15], 
      intensity: [2, 5],
      falloff: 'smoothstep'
    },
    {
      kind: 'valley',
      count: [2, 4],
      placement: { type: 'uniform' },
      radius: [12, 20],
      intensity: [3, 6],
      aspect: [0.4, 0.8]
    }
  ]
}, 2000)

console.log('Операции деталей:', detailOps)

console.log('Этап 3: Размещение объектов на террейне...')

const objects = sceneApi.getSceneObjects()
if (objects.length > 0) {
  const instanceResult = sceneApi.addInstances(
    objects[0].uuid, 
    undefined, 
    10, 
    { strategy: 'RandomNoCollision' }
  )
  console.log('Размещены объекты:', instanceResult)
} else {
  console.log('Нет объектов для размещения')
}

console.log('✓ Многоэтапное создание завершено!')`
    }
  ]
}
