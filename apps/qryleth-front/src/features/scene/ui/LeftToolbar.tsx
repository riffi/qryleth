import React from 'react'
import { Box, ActionIcon, Tooltip, Stack } from '@mantine/core'
import { IconMessages, IconCode } from '@tabler/icons-react'

interface LeftToolbarProps {
  /**
   * Состояние сворачивания чата. true = панель чата свёрнута.
   */
  chatCollapsed: boolean
  /**
   * Колбэк переключения видимости чата.
   */
  onToggleChat: () => void
  /**
   * Состояние видимости панели скриптинга.
   */
  scriptingPanelVisible: boolean
  /**
   * Колбэк переключения видимости панели скриптинга.
   */
  onToggleScripting: () => void
}

/**
 * Левый тулбар SceneEditor в стиле JetBrains IDEA.
 * Содержит иконки для управления левой панелью: чат и скриптинг.
 * Располагается вертикально у левого края экрана на всю высоту.
 * Позиционируется левее левой панели и не пересекается с ней.
 */
export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  chatCollapsed,
  onToggleChat,
  scriptingPanelVisible,
  onToggleScripting
}) => {
  return (
    <Box
      style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 150,
        width: 40,
        background: 'var(--mantine-color-dark-8)',
        borderRight: '1px solid var(--mantine-color-dark-5)',
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
        boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
        padding: '8px 0'
      }}
    >
      <Stack gap={2} align="center">
        <Tooltip label={chatCollapsed ? 'Открыть чат' : 'Закрыть чат'} position="right" withArrow>
          <ActionIcon
            size="lg"
            variant={!chatCollapsed && !scriptingPanelVisible ? 'filled' : 'subtle'}
            color={!chatCollapsed && !scriptingPanelVisible ? 'blue' : 'gray'}
            onClick={onToggleChat}
            aria-label={chatCollapsed ? 'Открыть чат' : 'Закрыть чат'}
            style={{
              borderRadius: 4,
              transition: 'all 200ms ease'
            }}
          >
            <IconMessages size={20} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label={scriptingPanelVisible ? 'Скрыть скриптинг' : 'Открыть скриптинг'} position="right" withArrow>
          <ActionIcon
            size="lg"
            variant={scriptingPanelVisible ? 'filled' : 'subtle'}
            color={scriptingPanelVisible ? 'blue' : 'gray'}
            onClick={onToggleScripting}
            aria-label={scriptingPanelVisible ? 'Скрыть скриптинг' : 'Открыть скриптинг'}
            style={{
              borderRadius: 4,
              transition: 'all 200ms ease'
            }}
          >
            <IconCode size={20} />
          </ActionIcon>
        </Tooltip>
      </Stack>
    </Box>
  )
}