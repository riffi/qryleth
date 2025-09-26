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
import * as THREE from 'three'

export class LeafTextureRegistry {
  private sets: Map<string, LeafTextureSet> = new Map()
  // Кэш загруженных текстур по URL (общий на всё приложение)
  private textureCache: Map<string, THREE.Texture> = new Map()
  private inflight: Map<string, Promise<THREE.Texture | null>> = new Map()

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
    // Текстуры не диспоузим здесь преднамеренно: реестр — глобальный синглтон,
    // а карты используются многими компонентами. Освобождать лучше целенаправленно.
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

/**
 * Опции загрузки текстуры для листвы.
 */
type LeafTexOpts = {
  colorSpace?: 'srgb' | 'linear'
  generateMipmaps?: boolean
  minFilter?: THREE.TextureFilter
  magFilter?: THREE.TextureFilter
  anisotropy?: number
}

/**
 * Загрузить текстуру с кешированием по URL и настройкой параметров для листвы.
 * Возвращает один и тот же инстанс THREE.Texture для всех запросов данного URL.
 */
export async function loadLeafTextureCached(url: string, opts?: LeafTexOpts): Promise<THREE.Texture | null> {
  if (!url) return null
  const reg = leafTextureRegistry as any
  if (reg.textureCache.has(url)) return reg.textureCache.get(url)
  if (reg.inflight.has(url)) return await reg.inflight.get(url)
  const p = new Promise<THREE.Texture | null>((resolve) => {
    const loader = new THREE.TextureLoader()
    loader.load(url, (t) => {
      try {
        // Базовые параметры
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
        t.center.set(0.0, 0.0)
        t.rotation = 0
        if (opts?.anisotropy != null) t.anisotropy = opts.anisotropy
        if (opts?.generateMipmaps != null) t.generateMipmaps = opts.generateMipmaps
        if (opts?.minFilter != null) t.minFilter = opts.minFilter
        if (opts?.magFilter != null) t.magFilter = opts.magFilter
        if (opts?.colorSpace === 'srgb') (t as any).colorSpace = (THREE as any).SRGBColorSpace || (t as any).colorSpace
        t.needsUpdate = true
      } catch {}
      reg.textureCache.set(url, t)
      resolve(t)
    }, undefined, () => resolve(null))
  })
  reg.inflight.set(url, p)
  const tex = await p
  reg.inflight.delete(url)
  return tex
}

/**
 * Загрузить базовые карты набора листвы с кэшированием.
 * Цвет — sRGB c мипами; остальные — без явного цвета, базовые параметры.
 */
export async function loadLeafBaseMaps(set: LeafTextureSet): Promise<{
  colorMap: THREE.Texture | null
  opacityMap: THREE.Texture | null
  normalMap: THREE.Texture | null
  roughnessMap: THREE.Texture | null
}> {
  const colorMap = await loadLeafTextureCached(set.colorMapUrl, {
    colorSpace: 'srgb', generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
    anisotropy: 8,
  })
  const opacityMap = set.opacityMapUrl ? await loadLeafTextureCached(set.opacityMapUrl, { anisotropy: 4 }) : null
  const normalMap = set.normalMapUrl ? await loadLeafTextureCached(set.normalMapUrl, { anisotropy: 4 }) : null
  const roughnessMap = set.roughnessMapUrl ? await loadLeafTextureCached(set.roughnessMapUrl, { anisotropy: 4 }) : null
  return { colorMap, opacityMap, normalMap, roughnessMap }
}

// Кэш atlas.json по URL (общий для всего приложения)
const leafAtlasCache = new Map<string, any[] | null>()
const leafAtlasInflight = new Map<string, Promise<any[] | null>>()

/**
 * Загрузить atlas.json с кэшированием по URL и дедупликацией параллельных запросов.
 */
export async function loadLeafAtlasCached(url: string): Promise<any[] | null> {
  if (!url) return null
  if (leafAtlasCache.has(url)) return leafAtlasCache.get(url) as any
  if (leafAtlasInflight.has(url)) return await leafAtlasInflight.get(url) as any
  const p = fetch(url, { cache: 'force-cache' })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
    .then((a) => { leafAtlasCache.set(url, a); return a })
    .catch(() => { leafAtlasCache.set(url, null); return null })
    .finally(() => { leafAtlasInflight.delete(url) })
  leafAtlasInflight.set(url, p)
  return await p
}

