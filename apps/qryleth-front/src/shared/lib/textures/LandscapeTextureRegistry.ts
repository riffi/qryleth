/**
 * Тип записи текстуры для ландшафта.
 * Описывает набор карт для одной поверхности (например, трава, песок).
 * Важно: для ландшафта не используется атлас — каждая запись соответствует одной поверхности.
 */
export interface LandscapeTextureEntry {
  /**
   * Стабильный идентификатор записи (slug). Используется как ключ реестра и в сохранённых ссылках.
   * Рекомендуется формат: `grass006-1k-jpg`.
   */
  id: string
  /**
   * Человекочитаемое имя набора (для UI).
   */
  name: string
  /**
   * Абсолютная или относительная к origin ссылка на изображение предпросмотра (иконка/превью).
   */
  previewUrl: string
  /**
   * Ссылка на карту цвета (albedo/diffuse), используется как основной цветовой источник.
   */
  colorMapUrl: string
  /**
   * Ссылка на карту нормалей (NormalGL или совместимая). Опционально.
   */
  normalMapUrl?: string
  /**
   * Ссылка на карту шероховатости (Roughness). Опционально.
   */
  roughnessMapUrl?: string
  /**
   * Ссылка на карту амбиентной окклюзии (AO). Опционально.
   */
  aoMapUrl?: string
  /**
   * Ссылка на карту смещения (Displacement/Height). Опционально.
   */
  displacementMapUrl?: string
}

/**
 * Реестр текстур для ландшафта. Позволяет регистрировать, получать и перечислять доступные текстуры.
 *
 * Назначение: дать единый источник правды для текстур ландшафта, чтобы SceneAPI и рендер могли
 * ссылаться на идентификаторы без жёстких путей, а UI мог подменять/дополнять наборы.
 */
export class LandscapeTextureRegistry {
  private entries: Map<string, LandscapeTextureEntry> = new Map()

  /**
   * Зарегистрировать запись текстуры по стабильному идентификатору.
   * Если запись с таким `id` уже существует, будет возвращена существующая без перезаписи.
   *
   * @param entry Полное описание текстуры ландшафта
   * @returns Зарегистрированная (или уже существующая) запись
   */
  register(entry: LandscapeTextureEntry): LandscapeTextureEntry {
    const existing = this.entries.get(entry.id)
    if (existing) return existing
    this.entries.set(entry.id, entry)
    return entry
  }

  /**
   * Получить запись по её идентификатору.
   * @param id Идентификатор (slug)
   * @returns Запись или undefined, если не найдено
   */
  get(id: string): LandscapeTextureEntry | undefined {
    return this.entries.get(id)
  }

  /**
   * Вернуть список всех зарегистрированных записей (в произвольном порядке).
   */
  list(): LandscapeTextureEntry[] {
    return Array.from(this.entries.values())
  }

  /**
   * Удалить запись по идентификатору.
   * @param id Идентификатор (slug)
   * @returns true, если запись была удалена; иначе false
   */
  remove(id: string): boolean {
    return this.entries.delete(id)
  }

  /**
   * Очистить реестр (полезно для тестов или переинициализации).
   */
  clear(): void {
    this.entries.clear()
  }

  /**
   * Количество зарегистрированных записей в реестре.
   */
  get size(): number {
    return this.entries.size
  }
}

/**
 * Глобальный экземпляр реестра текстур ландшафта для всего приложения.
 */
export const landscapeTextureRegistry = new LandscapeTextureRegistry()

