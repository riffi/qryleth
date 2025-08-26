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
   * Устанавливает активную вкладку на странице библиотеки.
   * Полезно для сохранения выбора пользователя между визитами благодаря persist‑мидлваре.
   * @param tab - значение вкладки: 'scenes' | 'objects'
   */
  setLibraryTab: (tab: LibraryTab) => void

  /**
   * Сбрасывает визуальные настройки к значениям по умолчанию.
   * Может быть использовано при выходе пользователя или при сбросе приложения к дефолтному состоянию.
   */
  reset: () => void
}

/**
 * Значения по умолчанию для визуальных настроек.
 */
const DEFAULT_VISUAL_SETTINGS: Pick<VisualSettingsState, 'libraryTab'> = {
  libraryTab: 'scenes',
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

