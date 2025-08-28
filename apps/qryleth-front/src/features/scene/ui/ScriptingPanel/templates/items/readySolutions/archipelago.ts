import type { TemplateData } from '../../types'

/**
 * Шаблон: Архипелаг островов — несколько островов с разным масштабом и береговой линией.
 */
export const archipelagoTemplate: TemplateData = {
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
        // falloff/flatInner опущены — применится 'plateau' + flatInner=0.3
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
}
