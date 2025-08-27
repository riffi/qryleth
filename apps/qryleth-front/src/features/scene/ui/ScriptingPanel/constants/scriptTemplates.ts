/**
 * Вернуть дефолтный пример скрипта для панели скриптинга.
 * Только JavaScript. Строки без обратных кавычек для устойчивого рендеринга.
 */
export const getDefaultScript = (): string => {
  return `// Пример использования sceneApi в ScriptingPanel
const overview = sceneApi.getSceneOverview()
console.log('Объектов в сцене:', overview.totalObjects)
console.log('Экземпляров:', overview.totalInstances)
console.log('Слои:', overview.layers)

// Получить статистику с вложенными свойствами
const stats = sceneApi.getSceneStats()
console.log('Общие объекты:', stats.total.objects)
console.log('Видимые объекты:', stats.visible.objects)

// Получить все объекты
const objects = sceneApi.getSceneObjects()
objects.forEach(obj => {
  console.log('Объект: ' + obj.name + ', примитивов: ' + obj.primitiveCount)
})

// Создать экземпляр первого объекта (если есть)
if (objects.length > 0) {
  // Доступные стратегии: 'Random' | 'RandomNoCollision' | 'PlaceAround'
  const result = sceneApi.addInstances(
    objects[0].uuid,
    undefined, // layerId - автоматически определится
    1, // count
    { strategy: 'RandomNoCollision' } // placementStrategy
  )
  console.log('Результат создания экземпляра:', result)
}

// Пример PlaceAround: 8 экземпляров по кругу вокруг всех инстансов выбранного объекта
if (objects.length > 0) {
  const res2 = sceneApi.addInstances(
    objects[0].uuid,
    undefined,
    8,
    {
      strategy: 'PlaceAround',
      metadata: {
        targetObjectUuid: objects[0].uuid,
        minDistance: 1.5,
        maxDistance: 4.0,
        angleOffset: 0,
        distributeEvenly: true,
        onlyHorizontal: true
      }
    }
  )
  console.log('PlaceAround:', res2)
}`
}

/**
 * Организованный набор шаблонов террейнов для ScriptingPanel
 * Разделены по категориям для удобной навигации
 */
export const getTerrainTemplateGroups = () => {
  
  // 🚀 БЫСТРЫЙ СТАРТ
  const quickStart = {
    'Простые холмы': `// Создать базовые холмы за 30 секунд
const result = await sceneApi.createProceduralLayer({
  // Координаты центрированы: X ∈ [-width/2..+width/2], Z ∈ [-depth/2..+depth/2]
  world: { width: 200, depth: 200, edgeFade: 0.1 },
  base: { 
    seed: 42, 
    amplitude: 8, 
    octaveCount: 3, 
    persistence: 0.4, 
    width: 128, 
    height: 128 
  },
  pool: { recipes: [] }, // без дополнительных операций
  seed: 42
}, { 
  name: 'Мои первые холмы', 
  visible: true 
})

console.log('Результат:', result)`,

    'Тестовый террейн': `// Быстрый тест с низкими параметрами
const testSpec = {
  // Центр мира: [0,0,0]; Z — глубина
  world: { width: 100, depth: 100, edgeFade: 0.05 },
  base: { 
    seed: 123, 
    octaveCount: 2, 
    amplitude: 3, 
    persistence: 0.3, 
    width: 128, 
    height: 128 
  },
  pool: { 
    global: { maxOps: 10 },
    recipes: [
      { kind: 'hill', count: 5, placement: { type: 'uniform' }, radius: 8, intensity: 2 }
    ]
  },
  seed: 123
}

const test = await sceneApi.createProceduralLayer(testSpec, { 
  name: 'Тест', 
  visible: true 
})

console.log('Тестовый террейн:', test)`
  }

  // 🎯 ГОТОВЫЕ РЕШЕНИЯ
  const readySolutions = {
    'Долина с горами': `// Долина, окруженная горными цепями (fit-подход: генерация только рецептов)
// 1) Параметры мира и области
const world = { width: 300, depth: 200 }
const edgeFade = 0.15
const centerRect = { x: -140, z: -10, width: 280, depth: 20 }
const southRect = { x: -150, z: -80, width: 300, depth: 40 }
const northRect = { x: -150, z: 60, width: 300, depth: 40 }

// 2) Генерация рецептов через fit-хелперы
const v = sceneApi.terrainHelpers.valleyFitToRecipes(
  centerRect,
  { thickness: 40, depth: 8, direction: 'auto', continuity: 'continuous' },
  world,
  edgeFade
)
const r = sceneApi.terrainHelpers.ridgeBandFitToRecipes(
  northRect,
  {
    thickness: 30,
    height: 10,
    direction: 'auto',
    continuity: 'segmented',
    pattern: {
      count: [10, 14],
      radius: [18, 26],
      aspect: [0.9, 1.3],
      intensity: [8, 15],
      step: 25,
      falloff: 'smoothstep'
    }
  },
  world,
  edgeFade
)

// Южные холмы оставим простыми hill-рецептами (для разнообразия)
const southHills = {
  kind: 'hill',
  count: [8, 12],
  placement: { type: 'uniform', area: southRect },
  radius: [14, 22],
  intensity: [7, 14],
  falloff: 'gauss'
}

let recipes = [ ...v.recipes, southHills, ...r.recipes ]

// 3) Бюджет: оценка, предложение и подрезка при необходимости
let maxOps = sceneApi.terrainHelpers.suggestGlobalBudget(recipes, 0.2)
const trimmed = sceneApi.terrainHelpers.autoBudget(recipes, maxOps)
recipes = trimmed.trimmedRecipes

// 4) Сборка spec и создание слоя
const spec = {
  world: { ...world, edgeFade },
  base: { seed: 1001, octaveCount: 4, amplitude: 6, persistence: 0.5, width: 128, height: 128 },
  pool: { global: { intensityScale: 1.2, maxOps }, recipes },
  seed: 1001
}

const layer = await sceneApi.createProceduralLayer(spec, { 
  name: 'Долина Драконов (fit)', 
  visible: true 
})

console.log('Создана долина (fit):', layer)`,

    'Вулканический остров': `// Круглый остров с кратером в центре
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

console.log('Создан остров:', island)`,

    'Архипелаг островов': `// Группа островов разного размера
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
        falloff: 'linear',
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

console.log('Создан архипелаг:', archipelago)`,

    'Холмистая местность': `// Мягкие перекатывающиеся холмы
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

  // 🧩 FIT-ХЕЛПЕРЫ
  const fitHelpers = {
    'Долина (fit)': `// Простая долина через весь мир (fit)
const world = { width: 300, depth: 200 }
const edgeFade = 0.15
const centerRect = { x: -140, z: -10, width: 280, depth: 20 }

const v = sceneApi.terrainHelpers.valleyFitToRecipes(centerRect, { thickness: 40, depth: 8, direction: 'auto', continuity: 'continuous' }, world, edgeFade)
const maxOps = sceneApi.terrainHelpers.suggestGlobalBudget(v.recipes, 0.2)
const spec = {
  world: { ...world, edgeFade },
  base: { seed: 42, octaveCount: 4, amplitude: 6, persistence: 0.5, width: 128, height: 128 },
  pool: { global: { intensityScale: 1.0, maxOps }, recipes: v.recipes },
  seed: 42
}
const res = await sceneApi.createProceduralLayer(spec, { name: 'ValleyFit', visible: true })
console.log('ValleyFit:', res, v.warnings)`,

    'Северная гряда (fit)': `// Гряда по северной кромке (fit)
const world = { width: 300, depth: 200 }
const edgeFade = 0.15
const northRect = { x: -150, z: 60, width: 300, depth: 40 }

const r = sceneApi.terrainHelpers.ridgeBandFitToRecipes(northRect, { thickness: 30, height: 10, direction: 'auto', continuity: 'continuous' }, world, edgeFade)
const maxOps2 = sceneApi.terrainHelpers.suggestGlobalBudget(r.recipes, 0.2)
const spec2 = {
  world: { ...world, edgeFade },
  base: { seed: 777, octaveCount: 4, amplitude: 6, persistence: 0.5, width: 128, height: 128 },
  pool: { global: { intensityScale: 1.0, maxOps: maxOps2 }, recipes: r.recipes },
  seed: 777
}
const res2 = await sceneApi.createProceduralLayer(spec2, { name: 'RidgeFit North', visible: true })
console.log('RidgeFit:', res2, r.warnings)`
  }

  // 🏔️ СПЕЦИАЛЬНЫЕ ЛАНДШАФТЫ
  const specialLandscapes = {
    'Песчаные дюны': `// Пустынный ландшафт с дюнами
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

console.log('Созданы дюны:', dunes)`,

    'Лунный кратер': `// Кратерный ландшафт как на Луне
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

console.log('Создана лунная поверхность:', lunar)`,

    'Каньон с плато': `// Система каньонов с плоскими плато
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
        falloff: 'linear',
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

  // 🎨 ПРОДВИНУТЫЕ ПРИМЕРЫ
  const advancedExamples = {
    'Горный массив': `// Реалистичный горный массив с хребтами
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

console.log('Горный массив создан:', mountains)`,

    'Прибрежная зона': `// Изрезанное побережье с бухтами
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
        falloff: 'linear',
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

console.log('Прибрежная зона создана:', coast)`,

    'Многоэтапное создание': `// Пример создания террейна в несколько этапов
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

  // 🛠️ ИНСТРУМЕНТЫ И УТИЛИТЫ
  const utilities = {
    'Анализ сцены': `// Полный анализ текущей сцены
console.log('=== АНАЛИЗ СЦЕНЫ ===')

// Общая информация
const overview = sceneApi.getSceneOverview()
console.log('Имя сцены:', overview.sceneName)
console.log('Всего объектов:', overview.totalObjects)
console.log('Всего экземпляров:', overview.totalInstances)

// Детальная статистика
const stats = sceneApi.getSceneStats()
console.log('\\n=== СТАТИСТИКА ===')
console.log('Объекты - общие/видимые:', stats.total.objects + '/' + stats.visible.objects)
console.log('Экземпляры - общие/видимые:', stats.total.instances + '/' + stats.visible.instances)
console.log('Слои - общие/видимые:', stats.total.layers + '/' + stats.visible.layers)
console.log('Типы примитивов:', stats.primitiveTypes.join(', '))

// Информация о слоях
const layers = sceneApi.getAvailableLayers()
console.log('\\n=== СЛОИ ===')
layers.forEach(layer => {
  const objectCount = overview.layers.find(l => l.id === layer.id)?.objectCount || 0
  console.log('Слой "' + layer.name + '": ' + objectCount + ' объектов, видимость: ' + layer.visible)
})

// Детали объектов
console.log('\\n=== ОБЪЕКТЫ ===')
overview.objects.forEach(obj => {
  console.log('Объект "' + obj.name + '":')
  console.log('  - UUID: ' + obj.uuid)
  console.log('  - Примитивов: ' + obj.primitiveCount + ' (' + obj.primitiveTypes.join(', ') + ')')
  console.log('  - Экземпляров: ' + obj.instanceCount)
  console.log('  - Слой: ' + (obj.layerId || 'не задан'))
  console.log('  - Видимость: ' + (obj.visible !== false ? 'видим' : 'скрыт'))
  if (obj.boundingBox) {
    const bb = obj.boundingBox
    console.log('  - Размеры: ' + 
      (bb.max[0] - bb.min[0]).toFixed(1) + ' x ' + 
      (bb.max[1] - bb.min[1]).toFixed(1) + ' x ' + 
      (bb.max[2] - bb.min[2]).toFixed(1))
  }
  console.log('')
})`,

    'Выравнивание объектов': `// Выровнять все объекты по существующему террейну
const layers = sceneApi.getAvailableLayers()
const terrainLayers = layers.filter(layer => 
  layer.name.toLowerCase().includes('террейн') || 
  layer.name.toLowerCase().includes('ландшафт') ||
  layer.name.toLowerCase().includes('terrain')
)

if (terrainLayers.length === 0) {
  console.log('❌ Не найдено слоев террейна для выравнивания')
} else {
  console.log('Найдено террейн-слоев:', terrainLayers.length)
  
  // Взять первый террейн-слой
  const terrainLayer = terrainLayers[0]
  console.log('Выравниваю объекты по слою:', terrainLayer.name)
  
  const adjustResult = sceneApi.adjustInstancesForPerlinTerrain(terrainLayer.id)
  
  if (adjustResult.success) {
    console.log('✅ Выровнено объектов:', adjustResult.adjustedCount)
  } else {
    console.log('❌ Ошибка выравнивания:', adjustResult.error)
  }
}

// Показать статистику после выравнивания
const newStats = sceneApi.getSceneStats()
console.log('\\nОбновленная статистика экземпляров:', newStats.total.instances)`,

    'Тест производительности': `// Тест производительности генерации террейнов
console.log('Запуск теста производительности...')

const testSizes = [
  { name: 'Малый', world: [50, 50], base: [16, 16], ops: 5 },
  { name: 'Средний', world: [100, 100], base: [32, 32], ops: 15 },
  { name: 'Большой', world: [200, 200], base: [64, 64], ops: 30 }
]

for (const test of testSizes) {
  console.log('\\nТестирую размер: ' + test.name + ' (' + test.world[0] + 'x' + test.world[1] + ')')
  
  const startTime = Date.now()
  
  const spec = {
    world: { width: test.world[0], depth: test.world[1], edgeFade: 0.1 },
    base: { 
      seed: 555, 
      octaveCount: 3, 
      amplitude: 5, 
      persistence: 0.4, 
      width: test.base[0], 
      height: test.base[1] 
    },
    pool: {
      global: { maxOps: test.ops },
      recipes: [
        { kind: 'hill', count: test.ops, placement: { type: 'uniform' }, radius: [5, 12], intensity: [2, 5] }
      ]
    },
    seed: 555
  }
  
  try {
    const result = await sceneApi.createProceduralLayer(spec, { 
      name: 'Тест ' + test.name.toLowerCase(), 
      visible: true 
    })
    
    const duration = Date.now() - startTime
    
    if (result.success) {
      console.log('✅ Успешно за ' + duration + 'мс (ID: ' + result.layerId + ')')
    } else {
      console.log('❌ Ошибка: ' + result.error)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.log('❌ Исключение за ' + duration + 'мс: ' + error.message)
  }
}

console.log('\\nТест производительности завершен!')`
  }

  return {
    'Быстрый старт': quickStart,
    'Готовые решения': readySolutions,
    'Fit‑хелперы': fitHelpers,
    'Специальные ландшафты': specialLandscapes,
    'Продвинутые примеры': advancedExamples,
    'Инструменты и утилиты': utilities
  }
}

/**
 * Устаревший метод для обратной совместимости
 * @deprecated Используйте getTerrainTemplateGroups()
 */
export const getProceduralTerrainTemplates = () => {
  const groups = getTerrainTemplateGroups()
  const flattened: Record<string, string> = {}
  
  Object.entries(groups).forEach(([groupName, templates]) => {
    Object.entries(templates).forEach(([templateName, code]) => {
      flattened[`${groupName}: ${templateName}`] = code
    })
  })
  
  return flattened
}
