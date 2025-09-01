/**
 * Типы для управления состоянием панелей ObjectEditor
 */

export interface PanelState {
  leftPanel: 'chat' | 'properties' | null
  rightPanel: 'manager' | null
  chatVisible: boolean
  propertiesVisible: boolean
  managerVisible: boolean
}

export type PanelType = 'chat' | 'properties' | 'manager'

export interface PanelToggleProps {
  activeLeftPanel: 'chat' | 'properties' | null
  activeRightPanel: 'manager' | null
  onToggle: (panel: PanelType) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export interface PanelConfig {
  type: PanelType
  position: 'left' | 'right'
  icon: React.ComponentType<{ size?: number }>
  label: string
  tooltip: string
}
