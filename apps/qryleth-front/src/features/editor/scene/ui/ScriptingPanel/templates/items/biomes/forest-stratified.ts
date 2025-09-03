import type { TemplateData } from '../../types'

/**
 * Шаблон: Стратифицированный лес — деревья, кустарники и трава.
 * Требования: в библиотеке должны быть объекты с тегами 'tree', 'shrub', 'grass'.
 * Скрипт создаёт биом (прямоугольник) и запускает скаттеринг.
 */
export const forestStratifiedTemplate: TemplateData = {
  id: 'biomes-forest-stratified',
  name: 'Лес (деревья/кусты/трава)',
  description: 'Создать биом леса со стратами и локальными параметрами. Затем расставить инстансы.',
  code: `// Стратифицированный лес: деревья/кустарники/трава
// Убедитесь, что в библиотеке есть объекты с тегами 'дерево', 'куст', 'трава'.

// 1) Создаём биом (область: прямоугольник 200x200, в центре сцены)
const biome = {
  uuid: undefined,
  name: 'Лесной биом',
  area: { type: 'rect', rect: { x: -100, z: -100, width: 200, depth: 200 }, rotationY: 0 },
  visible: true,
  scattering: {
    // Глобальная плотность — будет поровну делиться между правилами, если у правила нет собственного density
    densityPer100x100: 45,
    minDistance: 1.5,
    distribution: 'poisson',
    edge: { fadeWidth: 8, fadeCurve: 'smoothstep', edgeBias: 0 },
    transform: {
      randomYawDeg: [0, 360],
      randomUniformScale: [0.9, 1.3],
      randomOffsetXZ: [0.0, 0.6]
    },
    seed: 12345,
    // Глобальный фильтр (по умолчанию не используется, т.к. у правил есть локальные sourceSelection)
    sources: { requiredTags: [], anyTags: [], excludeTags: [] }
  },
  strata: [
    {
      name: 'Деревья',
      rules: [
        {
          name: 'trees-core',
          densityPer100x100: 12,
          edge: { fadeWidth: 6, fadeCurve: 'smoothstep', edgeBias: 0.2 },
          transform: { randomYawDeg: [0, 360], randomUniformScale: [0.95, 1.4], randomOffsetXZ: [0, 0.3] },
          sourceSelection: { requiredTags: ['дерево'] }
        }
      ]
    },
    {
      name: 'Кустарники',
      rules: [
        {
          name: 'shrubs-ring',
          densityPer100x100: 18,
          edge: { fadeWidth: 8, fadeCurve: 'linear', edgeBias: -0.2 }, // больше к краям
          transform: { randomYawDeg: [0, 360], randomUniformScale: [0.8, 1.1], randomOffsetXZ: [0, 0.4] },
          sourceSelection: { anyTags: ['куст'] }
        }
      ]
    },
    {
      name: 'Травяной покров',
      rules: [
        {
          name: 'grass-fill',
          densityPer100x100: 60,
          edge: { fadeWidth: 5, fadeCurve: 'smoothstep', edgeBias: 0 },
          transform: { randomYawDeg: [0, 360], randomUniformScale: [0.6, 0.9], randomOffsetXZ: [0, 0.2] },
          sourceSelection: { anyTags: ['трава'] }
        }
      ]
    }
  ]
}

const addRes = sceneApi.addBiome(biome)
if (!addRes.success) {
  throw new Error('Не удалось добавить биом')
}

// 2) Запускаем скаттеринг (append). Высота будет выровнена по террейну, если он есть
const scatterRes = await sceneApi.scatterBiome(addRes.biomeUuid)
console.log('Скаттеринг:', scatterRes)
`
}

