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
  layer: { width: 400, depth: 300, edgeFade: 0.2 },
  base: { 
    octaveCount: 3, 
    amplitude: 2, 
    persistence: 0.3, 
    width: 300, 
    height: 300,
    // КЛЮЧЕВОЕ: опускаем базовый уровень рельефа ниже 0, чтобы вода перекрывала «низину»
    heightOffset: -4
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
        mode: 'add',
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
}

const archipelago = await sceneApi.createProceduralLayer(archipelagoSpec, {
  name: 'Тропический архипелаг',
  visible: true,
    multiColor: {
    mode: 'vertex',
    // опционально:
   palette: [
    // ВОДА / ЛАГУНА
    { height: -15, color: '#0E3550' }, // глубокая тропическая синь
    { height: -6,  color: '#0F6280' }, // тёмная бирюза
    { height: -2,  color: '#1FA7BD' }, // лагуна
    { height: -0.5,color: '#91E0DA' }, // мелководье/прозрачная кромка

    // ПЛЯЖ / ПЕСОК
    { height: 0.5, color: '#F2E9C9' }, // светлый песок
    { height: 2,   color: '#E8D6A4' }, // тёплый песок

    // НИЗИННАЯ РАСТИТЕЛЬНОСТЬ
    { height: 6,   color: '#9AD37A' }, // травянистая кромка
    { height: 12,  color: '#5FBF64' }, // яркая тропическая зелень
    { height: 18,  color: '#2E7D32' }, // густой полог джунглей

    // ПРЕДГОРЬЕ / СУХАЯ ЗЕЛЕНЬ → ТЁПЛЫЕ ПОРОДЫ
    { height: 30,  color: '#6E8B5C' }, // оливково-зеленая
    { height: 42,  color: '#9E8C6F' }, // тёплый камень
    { height: 56,  color: '#BCA489' }, // светлее и суше
    { height: 70,  color: '#D8C8A9' }, // выветренные породы

    // ВЫСОКОГОРЬЕ / СНЕГ
    { height: 86,  color: '#EAE3D7' }, // альпийский светлый камень
    { height: 100, color: '#FFFFFF' }  // снежные шапки
    ],
    slopeBoost: 0.3, // 0..1 — подкрашивает крутые склоны
  }
})

console.log('Создан архипелаг:', archipelago)`
}
