import { useState, useCallback, useEffect } from 'react'
import type { PanelState, PanelType } from '../types'

const STORAGE_KEY = 'objectEditor.panelState'

const DEFAULT_PANEL_STATE: PanelState = {
  leftPanel: null,
  rightPanel: null,
  chatVisible: false,
  propertiesVisible: false,
  managerVisible: false
}

interface UsePanelStateReturn {
  panelState: PanelState
  togglePanel: (panel: PanelType) => void
  showPanel: (panel: PanelType) => void
  hidePanel: (panel: PanelType) => void
  hideAllPanels: () => void
  resetPanels: () => void
}

/**
 * Хук для управления состоянием панелей ObjectEditor
 * Реализует логику взаимоисключающих левых панелей (чат vs свойства)
 * Сохраняет состояние в localStorage
 */
export const usePanelState = (): UsePanelStateReturn => {
  const [panelState, setPanelState] = useState<PanelState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : DEFAULT_PANEL_STATE
    } catch {
      return DEFAULT_PANEL_STATE
    }
  })

  // Сохранение в localStorage при изменении состояния
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(panelState))
    } catch (error) {
      console.warn('Failed to save panel state to localStorage:', error)
    }
  }, [panelState])

  const togglePanel = useCallback((panel: PanelType) => {
    setPanelState(prev => {
      const newState = { ...prev }

      switch (panel) {
        case 'chat':
          if (prev.leftPanel === 'chat') {
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
          if (prev.leftPanel === 'properties') {
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
          if (prev.rightPanel === 'manager') {
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
  }, [])

  const showPanel = useCallback((panel: PanelType) => {
    setPanelState(prev => {
      const newState = { ...prev }

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
  }, [])

  const hidePanel = useCallback((panel: PanelType) => {
    setPanelState(prev => {
      const newState = { ...prev }

      switch (panel) {
        case 'chat':
          if (prev.leftPanel === 'chat') {
            newState.leftPanel = null
          }
          newState.chatVisible = false
          break

        case 'properties':
          if (prev.leftPanel === 'properties') {
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
  }, [])

  const hideAllPanels = useCallback(() => {
    setPanelState({
      leftPanel: null,
      rightPanel: null,
      chatVisible: false,
      propertiesVisible: false,
      managerVisible: false
    })
  }, [])

  const resetPanels = useCallback(() => {
    setPanelState(DEFAULT_PANEL_STATE)
  }, [])

  return {
    panelState,
    togglePanel,
    showPanel,
    hidePanel,
    hideAllPanels,
    resetPanels
  }
}
