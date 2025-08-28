import type { TemplateData } from '../../types'

/**
 * Шаблон: Полоса плато (coverArea) — одна операция, заполняющая прямоугольную область.
 */
export const plateauStripeCoverAreaTemplate: TemplateData = {
  id: 'plateau-stripe-cover-area',
  name: 'Полоса плато (coverArea)',
  description: 'Узкая ровная полоса плато на всю область — без «кусочков».',
  code: `// Ровная узкая полоса плато, заполняющая area целиком (без «кусочков»)
const stripePlateauSpec = {
  world: { width: 300, depth: 200, edgeFade: 0.1 },
  base: { seed: 4203, octaveCount: 4, amplitude: 5, persistence: 0.5, width: 128, height: 128 },
  pool: {
    recipes: [
      {
        kind: 'plateau',
        coverArea: true, // ключ: одна операция прямоугольной формы на всю область
        placement: {
          type: 'uniform',
          area: { kind: 'rect', x: -150, z: 30, width: 300, depth: 20 }
        },
        intensity: 8,
        // falloff/flatInner можно не указывать (auto: 'plateau' + 0.7)
        // при желании: flatInner: 0.9
      }
    ]
  },
  seed: 4203
}

const stripePlateau = await sceneApi.createProceduralLayer(stripePlateauSpec, {
  name: 'Полоса плато (coverArea)',
  visible: true
})

console.log('Создана полоса плато:', stripePlateau)`
}

