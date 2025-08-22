import React from 'react'
import { Box, ActionIcon, Tooltip, Stack } from '@mantine/core'
import { IconFolder } from '@tabler/icons-react'

interface RightToolbarProps {
  /**
   * Состояние сворачивания правой панели (менеджера объектов). true = панель свёрнута.
   */
  objectPanelCollapsed: boolean
  /**
   * Колбэк переключения видимости правой панели (менеджера объектов).
   */
  onToggleObjectPanel: () => void
}

/**
 * Правый тулбар SceneEditor в стиле JetBrains IDEA.
 * Содержит иконку для управления правой панелью: менеджер объектов.
 * Располагается вертикально у правого края интерфейса.
 */
export const RightToolbar: React.FC<RightToolbarProps> = ({
  objectPanelCollapsed,
  onToggleObjectPanel
}) => {
  return (
    <Box
      style={{
        position: 'absolute',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 150,
        width: 40,
        background: 'var(--mantine-color-dark-8)',
        borderLeft: '1px solid var(--mantine-color-dark-5)',
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
        boxShadow: '-2px 0 8px rgba(0,0,0,0.2)',
        padding: '8px 0'
      }}
    >
      <Stack gap={2} align="center">
        <Tooltip label={objectPanelCollapsed ? 'Открыть менеджер' : 'Закрыть менеджер'} position="left" withArrow>
          <ActionIcon
            size="lg"
            variant={!objectPanelCollapsed ? 'filled' : 'subtle'}
            color={!objectPanelCollapsed ? 'blue' : 'gray'}
            onClick={onToggleObjectPanel}
            aria-label={objectPanelCollapsed ? 'Открыть менеджер' : 'Закрыть менеджер'}
            style={{
              borderRadius: 4,
              transition: 'all 200ms ease'
            }}
          >
            <IconFolder size={20} />
          </ActionIcon>
        </Tooltip>
      </Stack>
    </Box>
  )
}