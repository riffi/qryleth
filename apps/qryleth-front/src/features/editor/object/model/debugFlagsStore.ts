import { create } from 'zustand'

/**
 * Хранилище отладочных флагов Object Editor.
 * Позволяет управлять визуальными режимами диагностики для рендеров примитивов.
 */
interface ObjectDebugFlagsState {
  /** Показать прямоугольную обводку листа по краям UV-плоскости (режим 'texture') */
  leafRectDebug: boolean
}

interface ObjectDebugFlagsActions {
  /** Установить флаг отображения обводки прямоугольника листа */
  setLeafRectDebug: (v: boolean) => void
  /** Переключить флаг отображения обводки прямоугольника листа */
  toggleLeafRectDebug: () => void
}

export type ObjectDebugFlagsStore = ObjectDebugFlagsState & ObjectDebugFlagsActions

export const useObjectDebugFlags = create<ObjectDebugFlagsStore>()((set, get) => ({
  leafRectDebug: false,
  setLeafRectDebug: (v: boolean) => set({ leafRectDebug: !!v }),
  toggleLeafRectDebug: () => set({ leafRectDebug: !get().leafRectDebug }),
}))

