import type { TemplateData } from '../../types'

/**
 * Шаблон: Полоса долины (coverArea) — одна прямоугольная операция с плоским дном.
 */
export const valleyStripeCoverAreaTemplate: TemplateData = {
  id: 'valley-stripe-cover-area',
  name: 'Полоса долины (coverArea)',
  description: 'Впадина полосой на всю область с плоским дном.',
  code: `// Ровная узкая полоса долины (впадина) на всю area с плоским дном
const stripeValleySpec = {
  world: { width: 300, depth: 200, edgeFade: 0.1 },
  base: { seed: 4204, octaveCount: 3, amplitude: 5, persistence: 0.4, width: 128, height: 128 },
  pool: {
    recipes: [
      {
        kind: 'valley',
        coverArea: true, // одна прямоугольная операция, равномерно заполняющая область
        placement: {
          type: 'uniform',
          area: { kind: 'rect', x: -150, z: -40, width: 300, depth: 24 }
        },
        intensity: 6,
        // auto: falloff='plateau', flatInner=0.7 → плоское дно; можно указать flatInner: 0.85
      }
    ]
  },
  seed: 4204
}

const stripeValley = await sceneApi.createProceduralLayer(stripeValleySpec, {
  name: 'Полоса долины (coverArea)',
  visible: true
})

console.log('Создана полоса долины:', stripeValley)`
}

