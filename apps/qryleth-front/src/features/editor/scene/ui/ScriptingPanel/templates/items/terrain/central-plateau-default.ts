import type { TemplateData } from '../../types'

/**
 * Шаблон: Центральное плато (дефолт) — опирается на автозначения спадов.
 */
export const centralPlateauDefaultTemplate: TemplateData = {
  id: 'central-plateau-default',
  name: 'Центральное плато (дефолт)',
  description: 'Большое плато в центре без явных настроек спадов — используются автозначения.',
  code: `// Большое плато по центру мира (без явных falloff/flatInner)
const plateauDefaultSpec = {
  layer: { width: 300, depth: 300, edgeFade: 0.1 },
  base: {
    seed: 4201,
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
        radius: 80,
        intensity: 20
        // falloff и flatInner НЕ указаны — применятся автозначения:
        // falloff: 'plateau', flatInner: 0.3
      }
    ]
  },
  seed: 4201
}

const plateauDefault = await sceneApi.createProceduralLayer(plateauDefaultSpec, {
  name: 'Центральное плато (дефолт)',
  visible: true,
  color: '#8B7355' // Цвет высокогорного плато
})

console.log('Создано плато (дефолт):', plateauDefault)`
}
