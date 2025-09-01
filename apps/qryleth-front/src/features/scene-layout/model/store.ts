import { useVisualSettingsStore } from '@/shared/model/visualSettingsStore'

/**
 * Фасад над глобальным визуальным стором для сцены.
 *
 * Зачем нужен фасад:
 * - Соблюдение FSD: логика управления панелями/ресайзом живёт в фиче scene-layout.
 * - На этом этапе миграции данные берутся из persist‑стора `useVisualSettingsStore` (shared),
 *   но наружу отдаются через API фичи. В будущем можно безболезненно заменить реализацию.
 */
export const sceneLayoutStore = {
  /** Возвращает, свернута ли левая панель (чат/скриптинг). */
  useChatCollapsed: () => useVisualSettingsStore(s => s.sceneChatCollapsed),
  /** Переключает свёрнутость левой панели (чат/скриптинг). */
  useSetChatCollapsed: () => useVisualSettingsStore(s => s.setSceneChatCollapsed),

  /** Возвращает, показывается ли панель скриптинга вместо чата. */
  useScriptingVisible: () => useVisualSettingsStore(s => s.sceneScriptingVisible),
  /** Устанавливает видимость панели скриптинга (вместо чата). */
  useSetScriptingVisible: () => useVisualSettingsStore(s => s.setSceneScriptingVisible),

  /** Возвращает, свернута ли правая панель (менеджер объектов). */
  useObjectPanelCollapsed: () => useVisualSettingsStore(s => s.sceneObjectPanelCollapsed),
  /** Переключает свёрнутость правой панели (менеджер объектов). */
  useSetObjectPanelCollapsed: () => useVisualSettingsStore(s => s.setSceneObjectPanelCollapsed),

  /** Текущая ширина левой панели в пикселях. */
  useLeftPanelWidthPx: () => useVisualSettingsStore(s => s.sceneLeftPanelWidthPx),
  /** Установить ширину левой панели в пикселях. */
  useSetLeftPanelWidthPx: () => useVisualSettingsStore(s => s.setSceneLeftPanelWidthPx),

  /** Текущая ширина правой панели в пикселях. */
  useRightPanelWidthPx: () => useVisualSettingsStore(s => s.sceneRightPanelWidthPx),
  /** Установить ширину правой панели в пикселях. */
  useSetRightPanelWidthPx: () => useVisualSettingsStore(s => s.setSceneRightPanelWidthPx),

  /** Флаг одноразовой инициализации раскладки редактора сцены. */
  getLayoutInitialized: () => useVisualSettingsStore.getState().sceneEditorLayoutInitialized,
  /** Отметить, что начальная раскладка редактора сцены инициализирована. */
  markLayoutInitialized: () => useVisualSettingsStore.getState().markSceneEditorLayoutInitialized(),
}

