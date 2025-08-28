import type { TemplateGroup } from '../types'

/**
 * Группа «Готовые решения» — практичные пресеты типовых ландшафтов.
 * Подходят для быстрых результатов «из коробки».
 */
export const readySolutionsGroup: TemplateGroup = {
  id: 'ready-solutions',
  title: 'Готовые решения',
  templates: [
    {
      id: 'central-plateau-default',
      name: 'Центральное плато (дефолт)',
      description: 'Большое плато в центре без явных настроек спадов — используются автозначения.',
      code: `// Большое плато по центру мира (без явных falloff/flatInner)
const plateauDefaultSpec = {
  world: { width: 300, depth: 300, edgeFade: 0.1 },
  base: {
    seed: 4201,
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
        count: 1,
        placement: { type: 'ring', center: [0, 0], rMin: 0, rMax: 0 },
        radius: 70,
        intensity: 8
        // falloff и flatInner НЕ указаны — применятся автозначения:
        // falloff: 'plateau', flatInner: 0.7
      }
    ]
  },
  seed: 4201
}

const plateauDefault = await sceneApi.createProceduralLayer(plateauDefaultSpec, {
  name: 'Центральное плато (дефолт)',
  visible: true
})

console.log('Создано плато (дефолт):', plateauDefault)`
    },
    {
      id: 'central-plateau-explicit-flat',
      name: 'Центральное плато (явный flatInner)',
      description: 'Плато с явным указанием falloff и доли плоской центральной части.',
      code: `// Большое плато по центру мира (явные falloff и flatInner)
const plateauExplicitSpec = {
  world: { width: 300, depth: 300, edgeFade: 0.1 },
  base: {
    seed: 4202,
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
        count: 1,
        placement: { type: 'ring', center: [0, 0], rMin: 0, rMax: 0 },
        radius: 70,
        intensity: 8,
        falloff: 'plateau',
        flatInner: 0.9 // плоская часть до 90% радиуса
      }
    ]
  },
  seed: 4202
}

const plateauExplicit = await sceneApi.createProceduralLayer(plateauExplicitSpec, {
  name: 'Центральное плато (явный flatInner)',
  visible: true
})

console.log('Создано плато (explicit):', plateauExplicit)`
    },
    {
      id: 'plateau-stripe-cover-area',
      name: 'Полоса плато (coverArea)',
      description: 'Узкая ровная полоса плато на всю область — без «кусочков».',
      code: `// Ровная узкая полоса плато, заполняющая area целиком (без «кусочков»)
const stripePlateauSpec = {
  world: { width: 300, depth: 200, edgeFade: 0.1 },
  base: { seed: 4203, octaveCount: 4, amplitude: 5, persistence: 0.5, width: 128, height: 128 },
  pool: {
    recipes: [
      {
        kind: 'plateau',
        coverArea: true, // ключ: одна операция прямоугольной формы на всю область
        placement: {
          type: 'uniform',
          area: { kind: 'rect', x: -150, z: 30, width: 300, depth: 20 }
        },
        intensity: 8,
        // falloff/flatInner можно не указывать (auto: 'plateau' + 0.7)
        // при желании: flatInner: 0.9
      }
    ]
  },
  seed: 4203
}

const stripePlateau = await sceneApi.createProceduralLayer(stripePlateauSpec, {
  name: 'Полоса плато (coverArea)',
  visible: true
})

console.log('Создана полоса плато:', stripePlateau)`
    },
    {
      id: 'valley-stripe-cover-area',
      name: 'Полоса долины (coverArea)',
      description: 'Впадина полосой на всю область с плоским дном.',
      code: `// Ровная узкая полоса долины (впадина) на всю area с плоским дном
const stripeValleySpec = {
  world: { width: 300, depth: 200, edgeFade: 0.1 },
  base: { seed: 4204, octaveCount: 3, amplitude: 5, persistence: 0.4, width: 128, height: 128 },
  pool: {
    recipes: [
      {
        kind: 'valley',
        coverArea: true, // одна прямоугольная операция, равномерно заполняющая область
        placement: {
          type: 'uniform',
          area: { kind: 'rect', x: -150, z: -40, width: 300, depth: 24 }
        },
        intensity: 6,
        // auto: falloff='plateau', flatInner=0.7 → плоское дно; можно указать flatInner: 0.85
      }
    ]
  },
  seed: 4204
}

const stripeValley = await sceneApi.createProceduralLayer(stripeValleySpec, {
  name: 'Полоса долины (coverArea)',
  visible: true
})

console.log('Создана полоса долины:', stripeValley)`
    },
    {
      id: 'valley-with-mountains',
      name: 'Долина с горами',
      description: 'Центральная долина на всю ширину и горные цепи по краям.',
      code: `// Долина, окруженная горными цепями (с долиной на всю ширину)
const valleySpec = {
  // Мир 300×200 (X×Z). Диапазоны: X [-150..150], Z [-100..100]
  world: { width: 300, depth: 200, edgeFade: 0.15 },
  base: { 
    seed: 1001, 
    octaveCount: 4, 
    amplitude: 6, 
    persistence: 0.5, 
    width: 128, 
    height: 128 
  },
  pool: {
    // Увеличиваем бюджет операций, чтобы все рецепты попали в результат
    global: { intensityScale: 1.2, maxOps: 150 },
    recipes: [
      // Центральная долина на всю ширину — сначала, чтобы гарантировать попадание в бюджет
      {
        kind: 'valley',
        count: 1,
        // Центр в (0,0), один длинный штрих вдоль X (rotation по умолчанию = 0)
        placement: { type: 'ring', center: [0, 0], rMin: 0, rMax: 0 },
        radius: 50,                 // больше радиус — лучше перекрытие штрихов
        aspect: [0.7, 0.9],         // толщина долины по Z
        intensity: 8,
        step: 50,                   // 5 центров: [-100, -50, 0, 50, 100]
        falloff: 'smoothstep'
      },
      // Горы по южному краю — чуть дальше от края, чтобы edgeFade не гасил высоту
      {
        kind: 'hill',
        count: [8, 12],
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: -150, z: -80, width: 300, depth: 40 }
        },
        radius: [14, 22],
        intensity: [7, 14],
        falloff: 'gauss'
      },
      // Горная цепь по северному краю — гряды толще по Z и длиннее
      {
        kind: 'ridge',
        count: [10, 14],
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: -150, z: 60, width: 300, depth: 40 }
        },
        radius: [18, 26],
        aspect: [0.9, 1.3],
        intensity: [8, 15],
        step: 25,
        falloff: 'smoothstep'
        // rotation: [-0.05, 0.05],
        // randomRotationEnabled: true
      }
    ]
  },
  seed: 1001
}

const valley = await sceneApi.createProceduralLayer(valleySpec, { 
  name: 'Долина Драконов', 
  visible: true 
})

console.log('Создана долина:', valley)`
    },
    {
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
    },
    {
      id: 'archipelago',
      name: 'Архипелаг островов',
      description: 'Несколько островов разного масштаба с акцентом на береговую линию.',
      code: `// Группа островов разного размера
const archipelagoSpec = {
  // Мир 400×300 (X×Z). Диапазоны: X [-200..200], Z [-150..150]
  world: { width: 400, depth: 300, edgeFade: 0.2 },
  base: { 
    seed: 3333, 
    octaveCount: 3, 
    amplitude: 2, 
    persistence: 0.3, 
    width: 128, 
    height: 128,
    // КЛЮЧЕВОЕ: опускаем базовый уровень рельефа ниже 0, чтобы вода перекрывала «низину»
    heightOffset: -1.5
  },
  pool: {
    global: { intensityScale: 1.5, maxOps: 60 },
    recipes: [
      // Главный остров
      {
        kind: 'hill',
        count: 1,
        // Прямоугольник в пределах Z: [70..150], X: [150..250]
        placement: { type: 'uniform', area: { kind: 'rect', x: 150, z: 70, width: 100, depth: 80 } },
        radius: [40, 50],
        intensity: [12, 18],
        falloff: 'smoothstep'
      },
      // Средние острова
      {
        kind: 'plateau',
        count: [3, 5],
        placement: { type: 'poisson', minDistance: 80 },
        radius: [20, 35],
        intensity: [6, 10],
        // falloff/flatInner опущены — применится 'plateau' + flatInner=0.7
        bias: { preferHeight: { min: -1, max: 2, weight: 0.7 } }
      },
      // Мелкие островки
      {
        kind: 'hill',
        count: [8, 15],
        placement: { type: 'uniform' },
        radius: [5, 12],
        intensity: [2, 5],
        falloff: 'gauss',
        bias: { 
          preferHeight: { min: -2, max: 1, weight: 0.8 },
          avoidOverlap: true 
        }
      }
    ]
  },
  seed: 3333
}

const archipelago = await sceneApi.createProceduralLayer(archipelagoSpec, {
  name: 'Тропический архипелаг',
  visible: true
})

console.log('Создан архипелаг:', archipelago)`
    },
    {
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
  visible: true
})

console.log('Созданы холмы:', hills)`
    }
  ]
}
