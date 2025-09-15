/**
 * Тип записи набора текстур для листвы.
 * Описывает все необходимые карты и вспомогательные ссылки для предпросмотра и атласа спрайтов.
 */
export interface LeafTextureSet {
  /**
   * Стабильный идентификатор набора (slug). Используется как ключ реестра и в сохранённых ссылках.
   * Рекомендуется формат: `leafset019-1k-jpg`.
   */
  id: string
  /**
   * Человекочитаемое имя набора (для UI).
   */
  name: string
  /**
   * Абсолютная или относительная к origin ссылка на изображение предпросмотра (иконка/превью),
   * например миниатюра всего набора листьев: LeafSet019.png.
   */
  previewUrl: string
  /**
   * Ссылка на карту цвета (albedo/diffuse), используется как основной цветовой источник.
   */
  colorMapUrl: string
  /**
   * Ссылка на карту нормалей (NormalGL или совместимая), при наличии усиливает объём.
   */
  normalMapUrl?: string
  /**
   * Ссылка на карту прозрачности (Opacity/Alpha). Для листвы обычно обязательна.
   */
  opacityMapUrl?: string
  /**
   * Ссылка на карту шероховатости (Roughness). Управляет отражениями/блеском.
   */
  roughnessMapUrl?: string
  /**
   * Ссылка на файл атласа спрайтов (atlas.json), описывающий вырезы (x,y,w,h) и опционально anchor.
   */
  atlasUrl: string
}

/**
 * Реестр наборов текстур листвы. Позволяет регистрировать, получать и перечислять доступные наборы.
 *
 * Назначение: убрать жёсткую привязку к одному пути ресурсов и обеспечить расширяемость
 * (несколько наборов текстур, переключение в UI, сохранение ссылок в сцене и т.п.).
 */
export class LeafTextureRegistry {
  private sets: Map<string, LeafTextureSet> = new Map()

  /**
   * Зарегистрировать набор текстур по стабильному идентификатору.
   * Если набор с таким `id` уже существует, будет возвращена существующая запись без перезаписи.
   *
   * @param set Полное описание набора текстур
   * @returns Зарегистрированная (или уже существующая) запись набора
   */
  register(set: LeafTextureSet): LeafTextureSet {
    const existing = this.sets.get(set.id)
    if (existing) return existing
    this.sets.set(set.id, set)
    return set
  }

  /**
   * Получить набор по его идентификатору.
   * @param id Идентификатор (slug) набора
   * @returns Запись набора или undefined, если не найдено
   */
  get(id: string): LeafTextureSet | undefined {
    return this.sets.get(id)
  }

  /**
   * Вернуть список всех зарегистрированных наборов (в произвольном порядке).
   */
  list(): LeafTextureSet[] {
    return Array.from(this.sets.values())
  }

  /**
   * Удалить набор по идентификатору.
   * @param id Идентификатор (slug) набора
   * @returns true, если набор был удалён; иначе false
   */
  remove(id: string): boolean {
    return this.sets.delete(id)
  }

  /**
   * Очистить реестр (полезно для тестов или полной переинициализации).
   */
  clear(): void {
    this.sets.clear()
  }

  /**
   * Количество зарегистрированных наборов в реестре.
   */
  get size(): number {
    return this.sets.size
  }
}

/**
 * Глобальный экземпляр реестра наборов текстур листвы для всего приложения.
 */
export const leafTextureRegistry = new LeafTextureRegistry()

