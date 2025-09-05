import type { TemplateData } from '../../types'

/**
 * Шаблон: Центральное плато (явный flatInner) — явная настройка falloff/flatInner.
 */
export const centralPlateauExplicitFlatTemplate: TemplateData = {
  id: 'central-plateau-explicit-flat',
  name: 'Центральное плато (явный flatInner)',
  description: 'Плато с явным указанием falloff и доли плоской центральной части.',
  code: `// Большое плато по центру мира (явные falloff и flatInner)
const plateauExplicitSpec = {
  layer: { width: 300, depth: 300, edgeFade: 0.1 },
  base: {
    seed: 4202,
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
        count: 1,
        placement: { type: 'ring', center: [0, 0], rMin: 0, rMax: 0 },
        radius: 90,
        intensity: 20,
        falloff: 'plateau',
        flatInner: 0.9 // плоская часть до 90% радиуса
      }
    ]
  },
  seed: 4202
}

const plateauExplicit = await sceneApi.createProceduralLandscape(plateauExplicitSpec, {
  name: 'Центральное плато (явный flatInner)',
  visible: true,
  material: { color: '#A0916C' } // Цвет плоского каменистого плато
})

console.log('Создано плато (explicit):', plateauExplicit)`
}
