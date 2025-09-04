import type { TemplateData } from '../../types'

/**
 * Облака: Базовый пресет (кучевые)
 *
 * Делает три шага:
 * 1) При необходимости — мягко настраивает глобальный ветер (по X, 0.2)
 * 2) Генерирует слой облаков с preset 'cumulus' (по умолчанию 5 штук)
 * 3) Высоты облаков — из диапазона [120..160]; область — автоизвлечение из Terrain‑слоя
 */
export const cloudsBasicTemplate: TemplateData = {
  id: 'clouds-basic-cumulus',
  name: 'Облака — базовый (кучевые)',
  description: 'Создать слой облаков (5 шт) с кучевым пресетом и мягким ветром',
  code: `// 1) Настроим глобальный ветер: вдоль X, скорость 0.2
sceneApi.setWind([1, 0], 0.2)

// 2) Сгенерируем облака (по умолчанию 5 штук). Если area не указана —
// будет взят прямоугольник из размеров первого Terrain‑слоя (worldWidth/worldDepth)
const cloudsRes = await sceneApi.generateProceduralClouds({
  // seed можно не указывать — возьмётся случайный
  placement: 'poisson',
  minDistance: 25,
  altitudeY: [120, 160],
  appearance: {
    stylePreset: 'cumulus',
    sizeLevel: 3,
    softnessLevel: 0.7,
    dynamicsLevel: 0.4,
    colorTone: 'white',
    variance: 0.5
  }
}, { clearBefore: true })

console.log('Создан слой облаков:', cloudsRes)
`
}

