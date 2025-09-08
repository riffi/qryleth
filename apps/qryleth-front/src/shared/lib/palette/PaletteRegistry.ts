import type { GlobalPalette } from '@/entities/palette'

/**
 * Реестр палитр: хранит зарегистрированные глобальные палитры и предоставляет быстрый доступ по UUID.
 *
 * Используется системой сцены для выбора активной палитры, а также резолверами цветов
 * материалов/террейна при вычислении итоговых цветов.
 */
export class PaletteRegistry {
  private palettes: Map<string, GlobalPalette> = new Map()

  /**
   * Зарегистрировать новую палитру с автогенерацией UUID запрещено —
   * палитры должны иметь стабильные UUID. Используйте registerWithUuid.
   * Метод оставлен для симметрии, но бросает ошибку.
   *
   * Примечание: добавлен намеренно, чтобы указывать на требование «стабильности UUID»
   * и избежать случайных несогласованностей при сериализации сцен.
   */
  register(_paletteData: Omit<GlobalPalette, 'uuid'>): never {
    throw new Error('[PaletteRegistry] Регистрация без явного UUID запрещена. Используйте registerWithUuid().')
  }

  /**
   * Зарегистрировать палитру с фиксированным UUID.
   * Если палитра с таким UUID уже существует, вернёт существующую без перезаписи.
   *
   * @param palette Полная палитра с UUID
   * @returns Зарегистрированная (или ранее существовавшая) палитра
   */
  registerWithUuid(palette: GlobalPalette): GlobalPalette {
    const existing = this.palettes.get(palette.uuid)
    if (existing) return existing
    this.palettes.set(palette.uuid, palette)
    return palette
  }

  /**
   * Получить палитру по UUID.
   * @param uuid Идентификатор палитры
   * @returns Палитра или undefined, если не найдена
   */
  get(uuid: string): GlobalPalette | undefined {
    return this.palettes.get(uuid)
  }

  /**
   * Возвращает список всех палитр, зарегистрированных в реестре.
   */
  list(): GlobalPalette[] {
    return Array.from(this.palettes.values())
  }

  /**
   * Удалить палитру по UUID.
   * @param uuid Идентификатор палитры
   * @returns true, если палитра была удалена; иначе false
   */
  remove(uuid: string): boolean {
    return this.palettes.delete(uuid)
  }

  /**
   * Очистить реестр палитр (обычно используется только в тестах).
   */
  clear(): void {
    this.palettes.clear()
  }

  /**
   * Количество палитр в реестре.
   */
  get size(): number {
    return this.palettes.size
  }
}

/**
 * Единственный экземпляр реестра палитр для всего приложения.
 */
export const paletteRegistry = new PaletteRegistry()

