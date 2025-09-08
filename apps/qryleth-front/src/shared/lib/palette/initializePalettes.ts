import { paletteRegistry } from './PaletteRegistry'
import { PREDEFINED_GLOBAL_PALETTES } from './presets'

/**
 * Инициализирует реестр палитр предустановленными значениями.
 * Вызывать один раз при старте приложения (перед первым использованием SceneAPI/UI).
 *
 * Повторные вызовы идемпотентны: уже зарегистрированные UUID повторно не перезаписываются.
 */
export function initializePalettes(): void {
  for (const p of PREDEFINED_GLOBAL_PALETTES) {
    paletteRegistry.registerWithUuid(p)
  }
}

