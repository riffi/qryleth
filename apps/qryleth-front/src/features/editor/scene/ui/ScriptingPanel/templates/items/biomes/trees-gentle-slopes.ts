import type { TemplateData } from '../../types'

/**
 * Шаблон: Деревья на пологих склонах (surface-mask).
 * Показывает использование surface‑маски для отбора и модуляции плотности
 * по высоте/наклону/кривизне. Высота — абсолютная (world Y).
 */
export const treesGentleSlopesTemplate: TemplateData = {
  id: 'biomes-trees-gentle-slopes',
  name: 'Деревья на пологих склонах',
  description: 'Создать биом деревьев с учётом поверхности: отбор по высоте/наклону/кривизне и адаптивный spacing.',
  code: `// Деревья на пологих склонах с учётом поверхности (surface-mask)
// Требования: в библиотеке должны быть объекты с тегом 'дерево' (или замените на ваш тег)

// 1) Создаём прямоугольный биом 220x180 в центре
const biome = {
  uuid: undefined,
  name: 'Деревья (пологие склоны)',
  area: { type: 'rect', rect: { x: -110, z: -90, width: 220, depth: 180 }, rotationY: 0 },
  visible: true,
  scattering: {
    algorithm: 'poisson',
    spacing: 10,
    seed: 4242,
    edge: { fadeWidth: 6, fadeCurve: 'smoothstep', edgeBias: 0.2 },
    // Новая опция: surface — управление отбором/плотностью по параметрам рельефа
    surface: {
      // Высота: абсолютный world Y. Подберите диапазон под ваш террейн
      height: { range: [0, 60], soft: 0.2, reference: 'world' },
      // Наклон: градусы между нормалью и вертикалью
      slopeDeg: { range: [0, 28], soft: 0.3 },
      // Кривизна: степень «изломанности» поверхности; step — радиус дискретизации (мировые ед.)
      curvature: { range: [0, 0.4], soft: 0.2, step: 1.0 },
      // Режим комбинированный: отбрасываем плохие зоны и разрежаем у границ диапазонов
      mode: ['reject', 'spacing'],
      combine: 'mul',
      weight: { byHeight: 1, bySlope: 1, byCurvature: 1 },
      spacingScale: { minFactor: 0.75, maxFactor: 1.6 }
    },
    transform: {
      randomYawDeg: [0, 360],
      randomUniformScale: [0.95, 1.35],
      randomOffsetXZ: [0, 0.35],
      // Лёгкий автоповорот по нормали с учётом кривизны
      alignToSurfaceNormal: { maxDeviationDeg: 22, curvatureInfluence: 0.5 }
    },
    source: { requiredTags: ['дерево'] }
  },
  strata: []
}

const addRes = sceneApi.addBiome(biome)
if (!addRes.success) {
  throw new Error('Не удалось добавить биом')
}

// 2) Запускаем скаттеринг (append). Высота Y будет выровнена по террейну автоматически
const scatterRes = await sceneApi.scatterBiome(addRes.biomeUuid)
console.log('Скаттеринг деревьев (surface-aware):', scatterRes)
`
}

