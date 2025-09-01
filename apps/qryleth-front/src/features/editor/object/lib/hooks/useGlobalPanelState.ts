import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PanelState, PanelType } from '../../ui/PanelToggleButtons/types'

const DEFAULT_PANEL_STATE: PanelState = {
  leftPanel: null,
  rightPanel: null,
  chatVisible: false,
  propertiesVisible: false,
  managerVisible: false
}

interface GlobalPanelStore extends PanelState {
  togglePanel: (panel: PanelType) => void
  showPanel: (panel: PanelType) => void
  hidePanel: (panel: PanelType) => void
  hideAllPanels: () => void
  resetPanels: () => void
}

/**
 * Глобальный Zustand store для состояния панелей ObjectEditor.
 * Используется для синхронизации состояния между page header и layout компонентом.
 */
export const useGlobalPanelStore = create<GlobalPanelStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PANEL_STATE,

      togglePanel: (panel: PanelType) => {
        const state = get()
        set(() => {
          const newState = { ...state }

          switch (panel) {
            case 'chat':
              if (state.leftPanel === 'chat') {
                // Закрываем чат
                newState.leftPanel = null
                newState.chatVisible = false
              } else {
                // Открываем чат, закрываем свойства
                newState.leftPanel = 'chat'
                newState.chatVisible = true
                newState.propertiesVisible = false
              }
              break

            case 'properties':
              if (state.leftPanel === 'properties') {
                // Закрываем свойства
                newState.leftPanel = null
                newState.propertiesVisible = false
              } else {
                // Открываем свойства, закрываем чат
                newState.leftPanel = 'properties'
                newState.propertiesVisible = true
                newState.chatVisible = false
              }
              break

            case 'manager':
              // Менеджер работает независимо
              if (state.rightPanel === 'manager') {
                newState.rightPanel = null
                newState.managerVisible = false
              } else {
                newState.rightPanel = 'manager'
                newState.managerVisible = true
              }
              break
          }

          return newState
        })
      },

      showPanel: (panel: PanelType) => {
        set((state) => {
          const newState = { ...state }

          switch (panel) {
            case 'chat':
              newState.leftPanel = 'chat'
              newState.chatVisible = true
              newState.propertiesVisible = false
              break

            case 'properties':
              newState.leftPanel = 'properties'
              newState.propertiesVisible = true
              newState.chatVisible = false
              break

            case 'manager':
              newState.rightPanel = 'manager'
              newState.managerVisible = true
              break
          }

          return newState
        })
      },

      hidePanel: (panel: PanelType) => {
        set((state) => {
          const newState = { ...state }

          switch (panel) {
            case 'chat':
              if (state.leftPanel === 'chat') {
                newState.leftPanel = null
              }
              newState.chatVisible = false
              break

            case 'properties':
              if (state.leftPanel === 'properties') {
                newState.leftPanel = null
              }
              newState.propertiesVisible = false
              break

            case 'manager':
              newState.rightPanel = null
              newState.managerVisible = false
              break
          }

          return newState
        })
      },

      hideAllPanels: () => {
        set(DEFAULT_PANEL_STATE)
      },

      resetPanels: () => {
        set(DEFAULT_PANEL_STATE)
      }
    }),
    {
      name: 'objectEditor.globalPanelState',
    }
  )
)

/**
 * Хук для использования глобального состояния панелей.
 * Возвращает те же методы, что и локальный usePanelState.
 */
export const useGlobalPanelState = () => {
  const store = useGlobalPanelStore()
  
  return {
    panelState: {
      leftPanel: store.leftPanel,
      rightPanel: store.rightPanel,
      chatVisible: store.chatVisible,
      propertiesVisible: store.propertiesVisible,
      managerVisible: store.managerVisible
    },
    togglePanel: store.togglePanel,
    showPanel: store.showPanel,
    hidePanel: store.hidePanel,
    hideAllPanels: store.hideAllPanels,
    resetPanels: store.resetPanels
  }
}
