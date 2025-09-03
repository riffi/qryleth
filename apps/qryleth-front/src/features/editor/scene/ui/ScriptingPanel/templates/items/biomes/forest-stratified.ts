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
  code: `// Стратифицированный лес: деревья/кустарники/трава (v2)
// Убедитесь, что в библиотеке есть объекты с тегами 'дерево', 'куст', 'трава'.

// 1) Создаём биом (область: прямоугольник 200x200, в центре сцены)
const biome = {
  uuid: undefined,
  name: 'Лесной биом',
  area: { type: 'rect', rect: { x: -100, z: -100, width: 200, depth: 200 }, rotationY: 0 },
  visible: true,
  scattering: {
    // v2: алгоритм и канонический spacing
    algorithm: 'poisson',
    seed: 12345,
    // Глобальный фильтр (по умолчанию пуст)
    source: { requiredTags: [], anyTags: [], excludeTags: [] }
  },
  strata: [
    {
      name: 'Деревья',
      scattering: {
        // Можно задать более редкое размещение деревьев
        spacing: 10,
        edge: { fadeWidth: 6, fadeCurve: 'smoothstep', edgeBias: 0.2 },
        transform: { randomYawDeg: [0, 360], randomUniformScale: [0.95, 1.4], randomOffsetXZ: [0, 0.3] },
        source: { requiredTags: ['дерево'] }
      }
    },
    {
      name: 'Кустарники',
      scattering: {
        spacing: 10,
        edge: { fadeWidth: 8, fadeCurve: 'linear', edgeBias: -0.2 }, // больше к краям
        transform: { randomYawDeg: [0, 360], randomUniformScale: [0.8, 1.1], randomOffsetXZ: [0, 0.4] },
        source: { anyTags: ['куст'] }
      }
    },
    {
      name: 'Травяной покров',
      scattering: {
        spacing: 10,
        edge: { fadeWidth: 5, fadeCurve: 'smoothstep', edgeBias: 0 },
        transform: { randomYawDeg: [0, 360], randomUniformScale: [0.6, 0.9], randomOffsetXZ: [0, 0.2] },
        source: { anyTags: ['трава'] }
      }
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
