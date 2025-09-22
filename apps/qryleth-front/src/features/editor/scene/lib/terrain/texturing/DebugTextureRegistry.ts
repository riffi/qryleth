/**
 * Реестр отладочных текстур террейна (атласы и splatmap) для визуального контроля в UI.
 *
 * Хранит последние собранные текстуры для каждой площадки ландшафта (itemId),
 * даёт возможность подписаться на изменения через простой subscribe/notify паттерн
 * и получить актуальный снимок данных для панелей.
 */

export interface TerrainSplatStats {
  /** Минимальная и максимальная высота, увиденная при построении splat */
  minH: number
  maxH: number
  /** Количество пикселей, попавших преимущественно в каждый из 4 каналов (argmax весов) */
  layerCounts: [number, number, number, number]
  /** Минимальные значения каналов RGBA (в [0..1]) за весь сплат */
  chanMin: [number, number, number, number]
  /** Максимальные значения каналов RGBA (в [0..1]) за весь сплат */
  chanMax: [number, number, number, number]
  /** Высота в центре и веса слоёв в центре (для сверки с пикселем центра канваса) */
  centerH: number
  centerWeights: [number, number, number, number]
  /** Байты RGBA в центре из нашего буфера перед putImageData (для верификации записи) */
  centerBytes: [number, number, number, number]
}

export interface TerrainDebugEntry {
  /** Идентификатор площадки (GfxLandscape.id) */
  itemId: string
  /** Человекочитаемое имя площадки (если есть) */
  name?: string
  /** Канвасы атласов: albedo/normal/roughness/ao (могут отсутствовать у слоя) */
  albedo?: HTMLCanvasElement
  normal?: HTMLCanvasElement
  roughness?: HTMLCanvasElement
  ao?: HTMLCanvasElement
  /** Канвас splatmap (RGBA каналы — веса слоёв) */
  splat?: HTMLCanvasElement
  /** Лёгкое превью splat (например, 128–256px) с принудительной альфой=1 */
  splatPreview?: HTMLCanvasElement
  /** Статистика splatmap (минимумы/максимумы/распределение слоёв) */
  splatStats?: TerrainSplatStats
  /** Размеры (для подсказок) */
  atlasSize?: number
  splatSize?: number
  /** Краткое описание слоёв (для отображения) */
  layers?: Array<{ textureId: string; height: number; repeat?: [number, number] }>
}

type Listener = () => void

const store = new Map<string, TerrainDebugEntry>()
const listeners = new Set<Listener>()

/**
 * Зарегистрировать/обновить отладочные данные для площадки.
 * Если запись уже существует — обновляется по ключу itemId.
 * @param itemId идентификатор площадки
 * @param entry данные для отображения в панели
 */
export function setTerrainDebugEntry(itemId: string, entry: TerrainDebugEntry): void {
  store.set(itemId, { ...entry, itemId })
  emit()
}

/**
 * Удалить запись для площадки (например, при удалении элемента сцены).
 * @param itemId идентификатор площадки
 */
export function removeTerrainDebugEntry(itemId: string): void {
  store.delete(itemId)
  emit()
}

/** Получить текущие записи для всех площадок. */
export function getTerrainDebugEntries(): TerrainDebugEntry[] {
  return Array.from(store.values())
}

/** Подписаться на изменения реестра (простая шина событий). */
export function subscribeTerrainDebug(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function emit() {
  for (const l of Array.from(listeners)) {
    try { l() } catch {}
  }
}
