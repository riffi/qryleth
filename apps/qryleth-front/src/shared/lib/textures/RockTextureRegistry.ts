/**
 * Тип записи текстуры камня: PBR‑наборы для окраски мешей камней.
 */
export interface RockTextureEntry {
  /** Устойчивый идентификатор (slug), например: 'rock_0005_1k'. */
  id: string
  /** Человекочитаемое имя для UI. */
  name: string
  /** URL превью (миниатюра). */
  previewUrl: string
  /** Карта цвета (albedo/baseColor). */
  colorMapUrl: string
  /** Карта нормалей (OpenGL). */
  normalMapUrl?: string
  /** Карта шероховатости (Roughness). */
  roughnessMapUrl?: string
  /** Карта амбиентной окклюзии (AO). */
  aoMapUrl?: string
  /** Карта высоты/смещения (Height/Displacement). */
  displacementMapUrl?: string
}

/** Реестр текстур камня (глобальный). */
export class RockTextureRegistry {
  private entries = new Map<string, RockTextureEntry>()

  register(entry: RockTextureEntry): RockTextureEntry {
    const existing = this.entries.get(entry.id)
    if (existing) return existing
    this.entries.set(entry.id, entry)
    return entry
  }

  get(id: string): RockTextureEntry | undefined { return this.entries.get(id) }
  list(): RockTextureEntry[] { return Array.from(this.entries.values()) }
  remove(id: string): boolean { return this.entries.delete(id) }
  clear(): void { this.entries.clear() }
  get size(): number { return this.entries.size }
}

export const rockTextureRegistry = new RockTextureRegistry()

