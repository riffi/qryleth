import type { TemplateData } from '../../types'

/**
 * Шаблон: Гора с лесом (расширенный пример)
 *
 * Сценарий последовательно:
 * 1) Создаёт процедурный ландшафт «Гладкая гора по центру мира» (300x300)
 * 2) Создаёт биом «Деревья на пологих склонах» поверх террейна c surface‑маской
 * 3) Запускает скаттеринг деревьев с выравниванием по высоте и автоповоротом
 *
 * Примечания:
 * - Фильтр источников использует anyTags: ['дерево','tree'] — подходит под русские/англ. теги.
 * - В surface‑маске режимы ['reject','spacing'] отбрасывают точки вне диапазонов
 *   и разрежают плотность на границах.
 */
export const mountainWithForestTemplate: TemplateData = {
  id: 'advanced-mountain-with-forest',
  name: 'Гора с лесом',
  description: 'Создать террейн «гладкая гора» и биом деревьев с учётом поверхности',
  code: `// 1) Создаём террейн: Гладкая гора по центру мира (300x300)
const smoothMountain = {
  layer: { width: 300, depth: 300, edgeFade: 0 },
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

const layerRes = await sceneApi.createProceduralLandscape(smoothMountain, {
  name: 'Гладкая гора',
  visible: true,
  material: { multiColor: {
    mode: 'vertex',
    palette: [
      { height: -10, color: '#2d5a27' },
      { height: 0,   color: '#4a7c59' },
      { height: 10,  color: '#8aa05a' },
      { height: 25,  color: '#b7b7b7' },
      { height: 100, color: '#FFFFFF' }
    ],
    slopeBoost: 0.3
  } }
})
console.log('Создан террейн:', layerRes)

// 2) Создаём биом деревьев на пологих склонах (220x180 по центру)
const biome = {
  uuid: undefined,
  name: 'Деревья (пологие склоны)',
  area: { type: 'circle', circle: { x: 0, z: 0, radius: 180 } },
  visible: true,
  scattering: {
      algorithm: 'poisson',
      spacing: 3,
      seed: 4242,
      edge: { fadeWidth: 50, fadeCurve: 'smoothstep', edgeBias: 0.5 },
      surface: {
        slopeDeg: { range: [0, 20], soft: 0.25 },
        curvature: { range: [0, 0.2], soft: 0.25, step: 1.0 },
        mode: ['reject', 'weight'],
        combine: 'mul',
        weight: { byHeight: 0, bySlope: 0.8, byCurvature: 0.2},
        spacingScale: { minFactor: 0.75, maxFactor: 2 }
      },
      transform: {
        randomYawDeg: [0, 360],
        randomUniformScale: [0.95, 1.35],
        randomOffsetXZ: [0, 3],
        alignToSurfaceNormal: { maxDeviationDeg: 22, curvatureInfluence: 0.5 }
      },
      // Важно: поддержка русских и английских тегов
      source: { anyTags: ['дерево', 'tree'] }
    },
  strata: []
}

const addBiomeRes = sceneApi.addBiome(biome)
if (!addBiomeRes.success) {
  throw new Error('Не удалось добавить биом')
}

// 3) Скаттеринг — выровняет Y по террейну и применит автоповорот
const scatterRes = await sceneApi.scatterBiome(addBiomeRes.biomeUuid)
console.log('Скаттеринг деревьев (surface-aware):', scatterRes)
`
}
