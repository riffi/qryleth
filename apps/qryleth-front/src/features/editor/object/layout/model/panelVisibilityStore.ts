import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PanelType = 'chat' | 'properties' | 'spriteDebug' | 'manager' | 'treeGenerator' | 'ezTreeGenerator' | 'grassGenerator' | 'rockGenerator'

export interface PanelState {
  leftPanel: 'chat' | 'properties' | 'spriteDebug' | null
  rightPanel: 'manager' | 'treeGenerator' | 'ezTreeGenerator' | 'grassGenerator' | 'rockGenerator' | null
  chatVisible: boolean
  propertiesVisible: boolean
  spriteDebugVisible: boolean
  managerVisible: boolean
  treeGeneratorVisible: boolean
  ezTreeGeneratorVisible: boolean
  grassGeneratorVisible: boolean
  rockGeneratorVisible: boolean
}

const DEFAULT_PANEL_STATE: PanelState = {
  leftPanel: null,
  rightPanel: null,
  chatVisible: false,
  propertiesVisible: false,
  spriteDebugVisible: false,
  managerVisible: false,
  treeGeneratorVisible: false,
  ezTreeGeneratorVisible: false,
  grassGeneratorVisible: false,
  rockGeneratorVisible: false,
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
 * Используется для синхронизации состояния между page header, виджетом и layout‑компонентом.
 */
export const useObjectPanelVisibilityStore = create<GlobalPanelStore>()(
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
                newState.leftPanel = null
                newState.chatVisible = false
              } else {
                newState.leftPanel = 'chat'
                newState.chatVisible = true
                newState.propertiesVisible = false
              }
              break

            case 'properties':
              if (state.leftPanel === 'properties') {
                newState.leftPanel = null
                newState.propertiesVisible = false
              } else {
                newState.leftPanel = 'properties'
                newState.propertiesVisible = true
                newState.chatVisible = false
              }
              break

            case 'spriteDebug':
              if (state.leftPanel === 'spriteDebug') {
                newState.leftPanel = null
                newState.spriteDebugVisible = false
              } else {
                newState.leftPanel = 'spriteDebug'
                newState.spriteDebugVisible = true
                newState.chatVisible = false
                newState.propertiesVisible = false
              }
              break

          case 'manager':
              if (state.rightPanel === 'manager') {
                newState.rightPanel = null
              newState.managerVisible = false
              newState.treeGeneratorVisible = false
              newState.ezTreeGeneratorVisible = false
              newState.grassGeneratorVisible = false
              newState.rockGeneratorVisible = false
            } else {
              newState.rightPanel = 'manager'
              newState.managerVisible = true
              newState.treeGeneratorVisible = false
              newState.ezTreeGeneratorVisible = false
              newState.grassGeneratorVisible = false
              newState.rockGeneratorVisible = false
            }
            break

          case 'treeGenerator':
            if (state.rightPanel === 'treeGenerator') {
              newState.rightPanel = null
              newState.treeGeneratorVisible = false
              newState.managerVisible = false
              newState.ezTreeGeneratorVisible = false
              newState.grassGeneratorVisible = false
              newState.rockGeneratorVisible = false
            } else {
              newState.rightPanel = 'treeGenerator'
              newState.treeGeneratorVisible = true
              newState.managerVisible = false
              newState.ezTreeGeneratorVisible = false
              newState.grassGeneratorVisible = false
              newState.rockGeneratorVisible = false
            }
            break
          case 'ezTreeGenerator':
            if (state.rightPanel === 'ezTreeGenerator') {
              newState.rightPanel = null
              newState.ezTreeGeneratorVisible = false
              newState.managerVisible = false
              newState.treeGeneratorVisible = false
              newState.grassGeneratorVisible = false
              newState.rockGeneratorVisible = false
            } else {
              newState.rightPanel = 'ezTreeGenerator'
              newState.ezTreeGeneratorVisible = true
              newState.managerVisible = false
              newState.treeGeneratorVisible = false
              newState.grassGeneratorVisible = false
              newState.rockGeneratorVisible = false
            }
            break
          case 'grassGenerator':
            if (state.rightPanel === 'grassGenerator') {
              newState.rightPanel = null
              newState.grassGeneratorVisible = false
              newState.managerVisible = false
              newState.treeGeneratorVisible = false
              newState.ezTreeGeneratorVisible = false
              newState.rockGeneratorVisible = false
            } else {
              newState.rightPanel = 'grassGenerator'
              newState.grassGeneratorVisible = true
              newState.managerVisible = false
              newState.treeGeneratorVisible = false
              newState.ezTreeGeneratorVisible = false
              newState.rockGeneratorVisible = false
            }
            break
          case 'rockGenerator':
            if (state.rightPanel === 'rockGenerator') {
              newState.rightPanel = null
              newState.rockGeneratorVisible = false
              newState.managerVisible = false
              newState.treeGeneratorVisible = false
              newState.ezTreeGeneratorVisible = false
              newState.grassGeneratorVisible = false
            } else {
              newState.rightPanel = 'rockGenerator'
              newState.rockGeneratorVisible = true
              newState.managerVisible = false
              newState.treeGeneratorVisible = false
              newState.ezTreeGeneratorVisible = false
              newState.grassGeneratorVisible = false
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

            case 'spriteDebug':
              newState.leftPanel = 'spriteDebug'
              newState.spriteDebugVisible = true
              newState.chatVisible = false
              newState.propertiesVisible = false
              break

          case 'manager':
            newState.rightPanel = 'manager'
            newState.managerVisible = true
            newState.treeGeneratorVisible = false
            newState.ezTreeGeneratorVisible = false
            newState.grassGeneratorVisible = false
            newState.rockGeneratorVisible = false
            break

          case 'treeGenerator':
            newState.rightPanel = 'treeGenerator'
            newState.treeGeneratorVisible = true
            newState.managerVisible = false
            newState.ezTreeGeneratorVisible = false
            newState.grassGeneratorVisible = false
            newState.rockGeneratorVisible = false
            break
          case 'ezTreeGenerator':
            newState.rightPanel = 'ezTreeGenerator'
            newState.ezTreeGeneratorVisible = true
            newState.managerVisible = false
            newState.treeGeneratorVisible = false
            newState.grassGeneratorVisible = false
            newState.rockGeneratorVisible = false
            break
          case 'grassGenerator':
            newState.rightPanel = 'grassGenerator'
            newState.grassGeneratorVisible = true
            newState.managerVisible = false
            newState.treeGeneratorVisible = false
            newState.ezTreeGeneratorVisible = false
            newState.rockGeneratorVisible = false
            break
          case 'rockGenerator':
            newState.rightPanel = 'rockGenerator'
            newState.rockGeneratorVisible = true
            newState.managerVisible = false
            newState.treeGeneratorVisible = false
            newState.ezTreeGeneratorVisible = false
            newState.grassGeneratorVisible = false
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
              if (state.leftPanel === 'chat') newState.leftPanel = null
              newState.chatVisible = false
              break
            case 'properties':
              if (state.leftPanel === 'properties') newState.leftPanel = null
              newState.propertiesVisible = false
              break
            case 'spriteDebug':
              if (state.leftPanel === 'spriteDebug') newState.leftPanel = null
              newState.spriteDebugVisible = false
              break
          case 'manager':
            newState.rightPanel = null
            newState.managerVisible = false
            newState.treeGeneratorVisible = false
            newState.ezTreeGeneratorVisible = false
            newState.grassGeneratorVisible = false
            newState.rockGeneratorVisible = false
            break
          case 'treeGenerator':
            newState.rightPanel = null
            newState.treeGeneratorVisible = false
            newState.managerVisible = false
            newState.ezTreeGeneratorVisible = false
            newState.grassGeneratorVisible = false
            newState.rockGeneratorVisible = false
            break
          case 'ezTreeGenerator':
            newState.rightPanel = null
            newState.ezTreeGeneratorVisible = false
            newState.managerVisible = false
            newState.treeGeneratorVisible = false
            newState.grassGeneratorVisible = false
            newState.rockGeneratorVisible = false
            break
          case 'grassGenerator':
            newState.rightPanel = null
            newState.grassGeneratorVisible = false
            newState.managerVisible = false
            newState.treeGeneratorVisible = false
            newState.ezTreeGeneratorVisible = false
            newState.rockGeneratorVisible = false
            break
          case 'rockGenerator':
            newState.rightPanel = null
            newState.rockGeneratorVisible = false
            newState.managerVisible = false
            newState.treeGeneratorVisible = false
            newState.ezTreeGeneratorVisible = false
            newState.grassGeneratorVisible = false
            break
          }

          return newState
        })
      },

      hideAllPanels: () => set(DEFAULT_PANEL_STATE),
      resetPanels: () => set(DEFAULT_PANEL_STATE),
    }),
    {
      name: 'objectEditor.globalPanelState',
    }
  )
)

/**
 * Публичный хук для использования глобального состояния панелей ObjectEditor.
 * Совместим по API с прежним `useGlobalPanelState`.
 */
export const useGlobalPanelState = () => {
  const store = useObjectPanelVisibilityStore()
  return {
    panelState: {
      leftPanel: store.leftPanel,
      rightPanel: store.rightPanel,
      chatVisible: store.chatVisible,
      propertiesVisible: store.propertiesVisible,
      managerVisible: store.managerVisible,
    },
    togglePanel: store.togglePanel,
    showPanel: store.showPanel,
    hidePanel: store.hidePanel,
    hideAllPanels: store.hideAllPanels,
    resetPanels: store.resetPanels,
  }
}
