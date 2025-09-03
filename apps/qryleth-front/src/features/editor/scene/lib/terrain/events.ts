/**
 * Простейшая шина событий для террейна (asset‑level события).
 *
 * Назначение:
 * - Развязать модули `HeightmapUtils` и `heightmapCache` без прямых импортов;
 * - Избежать смешения статических и динамических импортов одного и того же модуля,
 *   что порождало предупреждение Rollup/Vite при чанкинге;
 * - Сигнализировать об инвалидировании кэшей, не создавая циклических зависимостей.
 */

type AssetInvalidatedListener = (assetId: string, reason?: 'deleted' | 'renamed') => void

const assetInvalidatedListeners = new Set<AssetInvalidatedListener>()

/**
 * Подписка на событие инвалидирования ассета.
 *
 * Колбэк будет вызван при удалении или переименовании ассета, чтобы внешние
 * компоненты могли очистить кэши, отменить загрузки и т.п.
 *
 * Возвращает функцию отписки.
 */
export function onAssetInvalidated(listener: AssetInvalidatedListener): () => void {
  assetInvalidatedListeners.add(listener)
  return () => assetInvalidatedListeners.delete(listener)
}

/**
 * Эмит события инвалидирования ассета.
 *
 * Используется кодом CRUD (например, `HeightmapUtils.deleteTerrainAsset`), чтобы
 * уведомить подписчиков (кэш и т.п.) без прямого импорта их модулей.
 */
export function emitAssetInvalidated(assetId: string, reason?: 'deleted' | 'renamed'): void {
  for (const l of assetInvalidatedListeners) {
    try {
      l(assetId, reason)
    } catch (e) {
      // Защита от падения всех слушателей из‑за одного исключения
      // eslint-disable-next-line no-console
      console.warn('[terrain/events] listener failed', e)
    }
  }
}

