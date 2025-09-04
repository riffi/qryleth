import type { TemplateData } from '../../types'

/**
 * Облака: Тёплый бриз (закат)
 *
 * Настраивает диагональный ветер и генерирует немного более динамичные облака
 * с тёплым тоном (sunset). Подходит для сцен на закате.
 */
export const cloudsBreezySunsetTemplate: TemplateData = {
  id: 'clouds-breezy-sunset',
  name: 'Облака — тёплый бриз (закат)',
  description: 'Диагональный ветер и sunset‑тон; размещение Poisson',
  code: `// Мягкий диагональный ветер на северо‑восток
sceneApi.setWind([0.6, 0.8], 0.25)

// Генерация облаков с тёплым тоном и немного большей динамикой
const res = await sceneApi.generateProceduralClouds({
  seed: 20250904,
  count: 7,
  placement: 'poisson',
  minDistance: 22,
  altitudeY: [130, 170],
  appearance: {
    stylePreset: 'cumulus',
    sizeLevel: 3,
    softnessLevel: 0.65,
    dynamicsLevel: 0.55,
    colorTone: 'sunset',
    variance: 0.6
  }
}, { clearBefore: true })

console.log('Тёплый бриз — clouds:', res)
`
}

