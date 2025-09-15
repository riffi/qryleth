/**
 * Тип записи текстуры коры/дерева.
 * Описывает набор PBR-карт для коры: цвет, нормали, шероховатость, AO, смещение.
 * Используется для применения единой текстуры к стволу и ветвям у процедурных деревьев.
 */
export interface WoodTextureEntry {
  /**
   * Стабильный идентификатор (slug). Пример: `bark014-1k-jpg`.
   * Идентификатор сохраняется в параметрах генератора дерева и пробрасывается в рендер.
   */
  id: string
  /** Человекочитаемое имя для UI. */
  name: string
  /** URL превью (миниатюра набора). */
  previewUrl: string
  /** Ссылка на карту цвета (albedo/diffuse). */
  colorMapUrl: string
  /** Ссылка на карту нормалей (NormalGL или совместимая). */
  normalMapUrl?: string
  /** Ссылка на карту шероховатости (Roughness). */
  roughnessMapUrl?: string
  /** Ссылка на карту амбиентной окклюзии (AO). */
  aoMapUrl?: string
  /** Ссылка на карту смещения (Displacement/Height). */
  displacementMapUrl?: string
}

/**
 * Реестр текстур коры. Позволяет регистрировать, получать и перечислять доступные наборы.
 * Аналогичен реестру ландшафтных текстур, но предназначен для коры.
 */
export class WoodTextureRegistry {
  private entries: Map<string, WoodTextureEntry> = new Map()

  /**
   * Регистрирует запись набора текстур коры.
   * Если запись с таким id уже существует — возвращает существующую без перезаписи.
   * @param entry Полное описание набора текстур коры
   */
  register(entry: WoodTextureEntry): WoodTextureEntry {
    const existing = this.entries.get(entry.id)
    if (existing) return existing
    this.entries.set(entry.id, entry)
    return entry
  }

  /** Возвращает запись по идентификатору. */
  get(id: string): WoodTextureEntry | undefined {
    return this.entries.get(id)
  }

  /** Возвращает список всех зарегистрированных записей. */
  list(): WoodTextureEntry[] {
    return Array.from(this.entries.values())
  }

  /** Удаляет запись по идентификатору. */
  remove(id: string): boolean {
    return this.entries.delete(id)
  }

  /** Полностью очищает реестр. Полезно для тестов/переинициализации. */
  clear(): void {
    this.entries.clear()
  }

  /** Количество зарегистрированных записей. */
  get size(): number {
    return this.entries.size
  }
}

/** Глобальный экземпляр реестра текстур коры. */
export const woodTextureRegistry = new WoodTextureRegistry()

