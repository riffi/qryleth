import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Допустимые значения активной вкладки на странице библиотеки.
 */
export type LibraryTab = 'scenes' | 'objects'

/**
 * Состояние визуальных настроек приложения.
 * В дальнейшем сюда можно добавлять другие настройки отображения (тему, размеры сетки и т.д.).
 */
interface VisualSettingsState {
  /** Текущая активная вкладка в разделе "Библиотека" */
  libraryTab: LibraryTab

  /**
   * SceneEditor: состояние видимости и компоновки боковых панелей.
   * Левая панель может отображать чат или скриптинг, или быть свёрнутой целиком.
   */
  /** true — левая панель (чат/скриптинг) свернута */
  sceneChatCollapsed: boolean
  /** true — вместо чата в левой панели показан скриптинг */
  sceneScriptingVisible: boolean
  /** true — правая панель (менеджер объектов) свёрнута */
  sceneObjectPanelCollapsed: boolean
  /** Текущая ширина левой панели в пикселях */
  sceneLeftPanelWidthPx: number
  /** Текущая ширина правой панели в пикселях */
  sceneRightPanelWidthPx: number
  /** Однократная инициализация стартовой раскладки SceneEditor на устройстве */
  sceneEditorLayoutInitialized: boolean
  // ObjectEditor layout
  objectLeftPanelWidthPx: number
  objectRightPanelWidthPx: number
  objectEditorLayoutInitialized: boolean

  /**
   * Устанавливает активную вкладку на странице библиотеки.
   * Полезно для сохранения выбора пользователя между визитами благодаря persist‑мидлваре.
   * @param tab - значение вкладки: 'scenes' | 'objects'
   */
  setLibraryTab: (tab: LibraryTab) => void

  /**
   * Устанавливает свёрнутость левой панели (чат/скриптинг) в SceneEditor.
   * @param collapsed - true, чтобы скрыть левую панель; false — показать её.
   */
  setSceneChatCollapsed: (collapsed: boolean) => void

  /**
   * Управляет видимостью панели скриптинга в левой панели SceneEditor.
   * При true — показывается скриптинг, при false — показывается чат (если левая панель не свёрнута).
   */
  setSceneScriptingVisible: (visible: boolean) => void

  /**
   * Устанавливает свёрнутость правой панели (менеджера объектов) в SceneEditor.
   */
  setSceneObjectPanelCollapsed: (collapsed: boolean) => void

  /**
   * Устанавливает ширину левой панели SceneEditor в пикселях.
   */
  setSceneLeftPanelWidthPx: (px: number) => void

  /**
   * Устанавливает ширину правой панели SceneEditor в пикселях.
   */
  setSceneRightPanelWidthPx: (px: number) => void

  /**
   * Помечает, что стартовая раскладка SceneEditor была установлена с учётом устройства/экрана,
   * чтобы последующие монтирования не переопределяли пользовательские настройки.
   */
  markSceneEditorLayoutInitialized: () => void
  // ObjectEditor setters
  setObjectLeftPanelWidthPx: (px: number) => void
  setObjectRightPanelWidthPx: (px: number) => void
  markObjectEditorLayoutInitialized: () => void

  /**
   * Сбрасывает визуальные настройки к значениям по умолчанию.
   * Может быть использовано при выходе пользователя или при сбросе приложения к дефолтному состоянию.
   */
  reset: () => void
}

/**
 * Значения по умолчанию для визуальных настроек.
 */
const DEFAULT_VISUAL_SETTINGS: Pick<
  VisualSettingsState,
  | 'libraryTab'
  | 'sceneChatCollapsed'
  | 'sceneScriptingVisible'
  | 'sceneObjectPanelCollapsed'
  | 'sceneLeftPanelWidthPx'
  | 'sceneRightPanelWidthPx'
  | 'sceneEditorLayoutInitialized'
  | 'objectLeftPanelWidthPx'
  | 'objectRightPanelWidthPx'
  | 'objectEditorLayoutInitialized'
> = {
  libraryTab: 'scenes',
  // SceneEditor defaults: аккуратные значения по умолчанию; точная первичная адаптация выполняется в компоненте при первом монтировании
  sceneChatCollapsed: false,
  sceneScriptingVisible: false,
  sceneObjectPanelCollapsed: false,
  sceneLeftPanelWidthPx: 360,
  sceneRightPanelWidthPx: 320,
  sceneEditorLayoutInitialized: false,
  // ObjectEditor defaults
  objectLeftPanelWidthPx: 360,
  objectRightPanelWidthPx: 320,
  objectEditorLayoutInitialized: false,
}

/**
 * Глобальный zustand‑store для визуальных настроек приложения.
 * Хранит выбор активной вкладки на странице библиотеки и может быть расширен новыми настройками.
 * Состояние сохраняется в localStorage через persist‑миддлвару, чтобы предпочтения
 * пользователя переживали перезагрузку страницы и новые сессии.
 */
export const useVisualSettingsStore = create<VisualSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_VISUAL_SETTINGS,

      /**
       * Устанавливает активную вкладку в разделе библиотеки.
       * Применяется напрямую в контроле вкладок Mantine Tabs через onChange.
       */
      setLibraryTab: (tab: LibraryTab) => {
        set({ libraryTab: tab })
      },

      /**
       * Управление состоянием левой панели SceneEditor (чат/скриптинг).
       */
      setSceneChatCollapsed: (collapsed: boolean) => {
        set({ sceneChatCollapsed: collapsed })
      },

      /**
       * Включает/выключает видимость панели скриптинга.
       * Если скриптинг включается, предполагается, что левая панель отображается.
       */
      setSceneScriptingVisible: (visible: boolean) => {
        set({ sceneScriptingVisible: visible })
      },

      /**
       * Сворачивает/разворачивает правую панель (менеджер объектов).
       */
      setSceneObjectPanelCollapsed: (collapsed: boolean) => {
        set({ sceneObjectPanelCollapsed: collapsed })
      },

      /**
       * Устанавливает ширину левой панели SceneEditor в пикселях.
       */
      setSceneLeftPanelWidthPx: (px: number) => {
        set({ sceneLeftPanelWidthPx: Math.max(0, Math.round(px)) })
      },

      /**
       * Устанавливает ширину правой панели SceneEditor в пикселях.
       */
      setSceneRightPanelWidthPx: (px: number) => {
        set({ sceneRightPanelWidthPx: Math.max(0, Math.round(px)) })
      },

      /**
       * Отмечает, что первоначальная инициализация раскладки SceneEditor выполнена.
       */
      markSceneEditorLayoutInitialized: () => {
        set({ sceneEditorLayoutInitialized: true })
      },

      // ObjectEditor layout setters
      setObjectLeftPanelWidthPx: (px: number) => {
        set({ objectLeftPanelWidthPx: Math.max(0, Math.round(px)) })
      },
      setObjectRightPanelWidthPx: (px: number) => {
        set({ objectRightPanelWidthPx: Math.max(0, Math.round(px)) })
      },
      markObjectEditorLayoutInitialized: () => {
        set({ objectEditorLayoutInitialized: true })
      },

      /**
       * Полный сброс визуальных настроек к значениям по умолчанию.
       * Включает возврат активной вкладки библиотеки к 'scenes'.
       */
      reset: () => set({ ...DEFAULT_VISUAL_SETTINGS }),
    }),
    {
      name: 'ui.visualSettings',
      version: 1,
    }
  )
)
