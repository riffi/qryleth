import React from 'react'
import { Group, ActionIcon, Tooltip } from '@mantine/core'
import { IconMessages, IconSettings, IconFolder } from '@tabler/icons-react'
import type { PanelToggleProps, PanelType, PanelConfig } from './types'

const PANEL_CONFIG: Record<PanelType, PanelConfig> = {
  chat: {
    type: 'chat',
    position: 'left',
    icon: IconMessages,
    label: 'Чат',
    tooltip: 'Открыть/закрыть чат с AI агентом'
  },
  properties: {
    type: 'properties',
    position: 'left',
    icon: IconSettings,
    label: 'Свойства',
    tooltip: 'Открыть/закрыть панель свойств объекта'
  },
  manager: {
    type: 'manager',
    position: 'right',
    icon: IconFolder,
    label: 'Менеджер',
    tooltip: 'Открыть/закрыть менеджер примитивов и материалов'
  }
}

export const PanelToggleButtons: React.FC<PanelToggleProps> = ({
  activeLeftPanel,
  activeRightPanel,
  onToggle,
  disabled = false,
  size = 'md'
}) => {
  const getIconSize = () => {
    switch (size) {
      case 'sm': return 16
      case 'lg': return 24
      default: return 20
    }
  }

  const getActionIconSize = () => {
    switch (size) {
      case 'sm': return 'sm'
      case 'lg': return 'lg'
      default: return 'md'
    }
  }

  const isActive = (panelType: PanelType): boolean => {
    const config = PANEL_CONFIG[panelType]
    if (config.position === 'left') {
      return activeLeftPanel === panelType
    } else {
      return activeRightPanel === panelType
    }
  }

  const renderToggleButton = (panelType: PanelType) => {
    const config = PANEL_CONFIG[panelType]
    const Icon = config.icon
    const active = isActive(panelType)

    return (
      <Tooltip
        key={panelType}
        label={config.tooltip}
        position="bottom"
        withArrow
      >
        <ActionIcon
          size={getActionIconSize()}
          variant={active ? 'filled' : 'subtle'}
          color={active ? 'blue' : 'gray'}
          onClick={() => onToggle(panelType)}
          disabled={disabled}
          aria-label={config.tooltip}
        >
          <Icon size={getIconSize()} />
        </ActionIcon>
      </Tooltip>
    )
  }

  return (
    <Group gap="xs">
      {renderToggleButton('chat')}
      {renderToggleButton('properties')}
      {renderToggleButton('manager')}
    </Group>
  )
}
