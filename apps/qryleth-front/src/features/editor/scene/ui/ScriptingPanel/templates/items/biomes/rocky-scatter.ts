import type { TemplateData } from '../../types'

/**
 * Шаблон: Каменистая россыпь — валуны/камни.
 * Требования: в библиотеке должны быть объекты с тегом 'камень'.
 * Скрипт создаёт круговой биом и выполняет полную регенерацию инстансов.
 */
export const rockyScatterTemplate: TemplateData = {
  id: 'biomes-rocky-scatter',
  name: 'Каменистая россыпь (камни)',
  description: 'Создать круговой биом камней и выполнить регенерацию инстансов (replace).',
  code: `// Каменистая россыпь — валуны и камни (v2)
// Убедитесь, что в библиотеке есть объекты с тегами 'rock' или 'boulder'.

// 1) Создаём круговой биом радиусом 40
const biome = {
  uuid: undefined,
  name: 'Каменистая россыпь',
  area: { type: 'circle', circle: { x: 0, z: 0, radius: 40 } },
  visible: true,
  scattering: {
    algorithm: 'poisson',
    spacing: 2.0,
    edge: { fadeWidth: 6, fadeCurve: 'linear', edgeBias: 0 },
    transform: { randomYawDeg: [0, 360], randomUniformScale: [0.8, 1.3], randomOffsetXZ: [0, 0.5] },
    seed: 9876,
    // Глобальный источник — камни/валуны
    source: { anyTags: ['камень'] }
  },
  // Без страт — плоский режим
}

const addRes = sceneApi.addBiome(biome)
if (!addRes.success) {
  throw new Error('Не удалось добавить биом')
}

// 2) Полная регенерация: удалить старые инстансы этого биома и создать новые
const regenRes = await sceneApi.regenerateBiomeInstances(addRes.biomeUuid, { forceDelete: true })
console.log('Регенерация:', regenRes)
`
}
