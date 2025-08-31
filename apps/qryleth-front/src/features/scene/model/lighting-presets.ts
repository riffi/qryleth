import type { LightingSettings } from '@/entities/lighting'

/**
 * Глобальные пресеты освещения сцены для редактора.
 * Предназначены для переиспользования между UI-контролами и инициализацией стора сцены.
 * Ключи используются в выпадающем списке, поэтому сохраняем человекочитаемые значения.
 */
export const LIGHTING_PRESETS = {
  'bright-day': {
    name: 'Яркий день',
    ambient: { color: '#87CEEB', intensity: 1 },
    directional: { color: '#FFD700', intensity: 1.0, position: [50, 100, 50] as [number, number, number] },
    backgroundColor: '#87CEEB',
    exposure: 1.3,
    sky: {
      distance: 450000,
      turbidity: 0.5,
      rayleigh: 1.0,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      elevation: 1.2,
      azimuth: 0.25,
    }
  },
  'evening': {
    name: 'Вечер',
    ambient: { color: '#ff9770', intensity: 0.4 },
    directional: { color: '#fb9653', intensity: 0.8, position: [30, 20, 30] as [number, number, number] },
    backgroundColor: '#512d1e',
    exposure: 0.9,
    sky: {
      distance: 450000,
      turbidity: 3.0,
      rayleigh: 0.5,
      mieCoefficient: 0.04,
      mieDirectionalG: 0.9,
      elevation: 0.1,
      azimuth: 2,
    }
  },
  'night': {
    name: 'Ночь',
    ambient: { color: '#5f5f88', intensity: 0.8 },
    directional: { color: '#7f96da', intensity: 0.8, position: [20, 10, 20] as [number, number, number] },
    backgroundColor: '#0C0C1E',
    exposure: 0.2,
    sky: {
      distance: 450000,
      turbidity: 0.1,
      rayleigh: 0.2,
      mieCoefficient: 0.001,
      mieDirectionalG: 0.7,
      elevation: -0.3,
      azimuth: 0.1,
    }
  },
  'moonlight': {
    name: 'Лунный свет',
    ambient: { color: '#B0C4DE', intensity: 0.25 },
    directional: { color: '#E6E6FA', intensity: 0.4, position: [20, 60, 20] as [number, number, number] },
    backgroundColor: '#191970',
    exposure: 0.6,
    sky: {
      distance: 450000,
      turbidity: 0.3,
      rayleigh: 0.8,
      mieCoefficient: 0.002,
      mieDirectionalG: 0.75,
      elevation: 0.8,
      azimuth: 1.5
    }
  }
} as const

/**
 * Ключ пресета освещения.
 */
export type LightingPresetKey = keyof typeof LIGHTING_PRESETS

/**
 * Ключ пресета по умолчанию для инициализации сцены.
 */
export const DEFAULT_LIGHTING_PRESET_KEY: LightingPresetKey = 'bright-day'

/**
 * Возвращает полные настройки освещения для указанного пресета.
 * Не содержит служебных полей (uuid и т.п.) — они добавляются на уровне стора.
 */
export function getLightingPreset(key: LightingPresetKey): Pick<LightingSettings, 'ambient' | 'directional' | 'backgroundColor' | 'exposure' | 'sky'> {
  return LIGHTING_PRESETS[key]
}

