import type { TemplateData } from '../../types'

/**
 * Шаблон: Простые холмы — быстрый старт без дополнительных операций пула.
 */
export const simpleHillsTemplate: TemplateData = {
  id: 'simple-hills',
  name: 'Простые холмы',
  description: 'Базовая генерация холмов за 30 секунд: один слой, без доп. операций.',
  code: `// Создать базовые холмы за 30 секунд
const result = await sceneApi.createProceduralLandscape({
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

console.log('Результат:', result)`
}
