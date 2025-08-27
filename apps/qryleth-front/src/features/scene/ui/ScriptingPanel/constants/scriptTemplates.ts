export type LanguageMode = 'javascript' | 'typescript'

/**
 * Возвращает дефолтный пример скрипта для панели скриптинга.
 * Строки не содержат шаблонных литералов с обратными кавычками, чтобы избежать экранирования.
 */
export const getDefaultScript = (mode: LanguageMode): string => {
  // Одинаковый JS‑совместимый шаблон для обоих режимов редактора
  return `// Пример использования SceneAPI
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
 * Возвращает набор готовых шаблонов скриптов для процедурной генерации террейна.
 * Строки оформлены без обратных кавычек, чтобы избежать ошибок экранирования в UI.
 */
export const getProceduralTerrainTemplates = (mode: LanguageMode) => {
  const jsHills = `// Создать холмистый процедурный ландшафт
const spec = {
  world: { width: 240, height: 240, edgeFade: 0.1 },
  base: { seed: (2468 ^ 0x777), octaveCount: 5, amplitude: 8, persistence: 0.55, width: 96, height: 96 },
  pool: {
    global: { intensityScale: 1.0, maxOps: 80 },
    recipes: [
      { kind: 'hill', count: [20, 30], placement: { type: 'uniform' }, radius: [10, 18], intensity: [4, 9], falloff: 'smoothstep' },
      { kind: 'plateau', count: [2, 4], placement: { type: 'poisson', minDistance: 50 }, radius: [12, 18], intensity: [2, 4], falloff: 'linear' }
    ]
  },
  seed: 2468
}

const res = await sceneApi.createProceduralLayer(spec, { name: 'Холмистый ландшафт' })
console.log(res)
`

  const jsDunes = `// Создать ландшафт песчаных дюн
const spec = {
  world: { width: 200, height: 200, edgeFade: 0.15 },
  base: { seed: (7777 ^ 0xaaaa), octaveCount: 3, amplitude: 4, persistence: 0.4, width: 48, height: 48 },
  pool: {
    recipes: [
      { kind: 'dune', count: [20, 30], placement: { type: 'gridJitter', cell: 16, jitter: 0.6 }, radius: [8, 14], aspect: [0.2, 0.5], rotation: [-0.3, 0.3], intensity: [1, 3], falloff: 'smoothstep' },
      { kind: 'basin', count: [3, 6], placement: { type: 'poisson', minDistance: 40 }, radius: [15, 25], intensity: [2, 4], bias: { preferHeight: { max: 2, weight: 0.8 } } }
    ]
  },
  seed: 7777
}

const result = await sceneApi.createProceduralLayer(spec, { name: 'Песчаные дюны', visible: true })
console.log(result)
`

  const jsValley = `// Создать ландшафт «Горная долина» с высокими хребтами по краям
const worldW = 300, worldH = 300
const center = [worldW / 2, worldH / 2]

const spec = {
  world: { width: worldW, height: worldH, edgeFade: 0.12 },
  // Более «грубый» базовый шум, чтобы подчеркнуть хребты
  base: { seed: (9876 ^ 0x5a5a), octaveCount: 5, amplitude: 10, persistence: 0.55, width: 128, height: 128 },
  pool: {
    global: { intensityScale: 1.15, maxOps: 140 },
    recipes: [
      // Высокие горные хребты по краям — размещаем вдоль внешнего кольца
      { kind: 'ridge', count: 4, placement: { type: 'ring', center, rMin: 120, rMax: 145 }, radius: [10, 14], aspect: [0.18, 0.3], step: 10, intensity: [12, 18], rotation: [-0.2, 0.2], falloff: 'smoothstep' },
      { kind: 'ridge', count: 4, placement: { type: 'ring', center, rMin: 135, rMax: 150 }, radius: [9, 12], aspect: [0.18, 0.28], step: 10, intensity: [10, 16], rotation: [-0.2, 0.2], falloff: 'smoothstep' },

      // Внутри долины — несколько холмов разной величины (разрежённо, без скучивания)
      { kind: 'hill', count: [10, 16], placement: { type: 'poisson', minDistance: 26 }, radius: [10, 20], intensity: [5, 10], falloff: 'smoothstep' },

      // Плато — немного ровных площадок
      { kind: 'plateau', count: [3, 5], placement: { type: 'uniform' }, radius: [12, 18], intensity: [2, 5], falloff: 'linear' }
    ]
  },
  seed: 13579
}

const res = await sceneApi.createProceduralLayer(spec, { name: 'Горная долина', visible: true })
console.log(res)
`

  if (mode === 'typescript') {
    // Для простоты возвращаем JS-строки, совместимые с TS в панели
    return {
      'Процедурный террейн: Холмы': jsHills,
      'Процедурный террейн: Дюны': jsDunes,
      'Процедурный террейн: Горная долина': jsValley
    }
  }

  return {
    'Процедурный террейн: Холмы': jsHills,
    'Процедурный террейн: Дюны': jsDunes,
    'Процедурный террейн: Горная долина': jsValley
  }
}
