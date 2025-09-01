import { useVisualSettingsStore } from '@/shared/model/visualSettingsStore'

/**
 * Мини‑хранилище (обёртка) для раскладки панелей ObjectEditor.
 *
 * Назначение:
 * - Централизовать доступ к persist‑полям VisualSettingsStore с префиксом object*.
 * - Обеспечить стабильный API использования в хуках и компонентах раскладки.
 */
export const objectLayoutStore = {
  /** Текущая ширина левой панели ObjectEditor (px). */
  useLeftPanelWidthPx: () => useVisualSettingsStore(s => s.objectLeftPanelWidthPx),
  /** Установить ширину левой панели ObjectEditor (px). */
  useSetLeftPanelWidthPx: () => useVisualSettingsStore(s => s.setObjectLeftPanelWidthPx),

  /** Текущая ширина правой панели ObjectEditor (px). */
  useRightPanelWidthPx: () => useVisualSettingsStore(s => s.objectRightPanelWidthPx),
  /** Установить ширину правой панели ObjectEditor (px). */
  useSetRightPanelWidthPx: () => useVisualSettingsStore(s => s.setObjectRightPanelWidthPx),

  /** Флаг, что первичная инициализация раскладки уже выполнена. */
  getLayoutInitialized: () => useVisualSettingsStore.getState().objectEditorLayoutInitialized,
  /** Пометить раскладку как инициализированную. */
  markLayoutInitialized: () => useVisualSettingsStore.getState().markObjectEditorLayoutInitialized(),
}

