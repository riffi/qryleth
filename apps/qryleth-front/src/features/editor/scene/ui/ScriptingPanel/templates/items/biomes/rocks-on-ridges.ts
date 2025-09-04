import type { TemplateData } from '../../types'

/**
 * Шаблон: Камни на хребтах (surface-mask).
 * Демонстрация приоритизации участков с большим наклоном и кривизной
 * через режимы weight+spacing (мягкое предпочтение, без жёсткого отсечения по высоте).
 */
export const rocksOnRidgesTemplate: TemplateData = {
  id: 'biomes-rocks-on-ridges',
  name: 'Камни на хребтах',
  description: 'Скаттеринг камней с приоритетом гребней/изломов (наклон/кривизна), адаптивный spacing.',
  code: `// Камни на хребтах: отдаём предпочтение местам с большим наклоном и кривизной
// Требования: в библиотеке должны быть объекты с тегом 'камень' (или замените под ваши теги)

// 1) Биом — круг радиусом 50
const biome = {
  uuid: undefined,
  name: 'Камни (хребты)',
  area: { type: 'circle', circle: { x: 0, z: 0, radius: 50 } },
  visible: true,
  scattering: {
    algorithm: 'poisson',
    spacing: 2.5,
    seed: 13579,
    edge: { fadeWidth: 5, fadeCurve: 'linear', edgeBias: 0 },
    surface: {
      // Высоту можно не ограничивать жёстко; оставим широкий коридор
      height: { range: [-9999, 9999], soft: 0, reference: 'world' },
      // Предпочитаем наклонные места (например, от 15°)
      slopeDeg: { range: [15, 90], soft: 0.25 },
      // И повышенную кривизну (гребни/изломы)
      curvature: { range: [0.2, 1.0], soft: 0.2, step: 1.0 },
      // Мягкое предпочтение + уплотнение в подходящих местах
      mode: ['weight', 'spacing'],
      combine: 'mul',
      weight: { byHeight: 0.5, bySlope: 1.0, byCurvature: 1.5 },
      spacingScale: { minFactor: 0.6, maxFactor: 2.0 }
    },
    transform: {
      randomYawDeg: [0, 360],
      randomUniformScale: [0.8, 1.4],
      randomOffsetXZ: [0, 0.6],
      // Камни могут сильнее подстраиваться под склон
      alignToSurfaceNormal: { maxDeviationDeg: 32, curvatureInfluence: 0.4 }
    },
    source: { anyTags: ['камень'] }
  }
}

const addRes = sceneApi.addBiome(biome)
if (!addRes.success) {
  throw new Error('Не удалось добавить биом')
}

const res = await sceneApi.scatterBiome(addRes.biomeUuid)
console.log('Скаттеринг камней (хребты):', res)
`
}

