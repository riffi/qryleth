import React from 'react'
import { Box, ActionIcon, Tooltip, Stack } from '@mantine/core'
import { IconMessages, IconAdjustments } from '@tabler/icons-react'

interface LeftToolbarProps {
  /**
   * Свёрнут ли чат (левая панель: chat). true = панель чата скрыта.
   */
  chatCollapsed: boolean
  /** Переключить видимость чата. */
  onToggleChat: () => void

  /**
   * Свёрнуты ли свойства (левая панель: properties). true = панель свойств скрыта.
   */
  propertiesCollapsed: boolean
  /** Переключить видимость панели свойств. */
  onToggleProperties: () => void

  /**
   * Показывать ли кнопку «Свойства». Если false — кнопка скрыта.
   * Используется для ограничения показа действия только при выборе примитива или материала.
   */
  showPropertiesAction?: boolean
}

/**
 * Левый тулбар ObjectEditor: быстрые кнопки для открытия «Чат» и «Свойства».
 * Стиль и поведение — в духе тулбаров SceneEditor.
 */
export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  chatCollapsed,
  onToggleChat,
  propertiesCollapsed,
  onToggleProperties,
  showPropertiesAction = true,
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
        padding: '8px 0',
      }}
    >
      <Stack gap={2} align="center">
        <Tooltip label={chatCollapsed ? 'Открыть чат' : 'Закрыть чат'} position="right" withArrow>
          <ActionIcon
            size="lg"
            variant={!chatCollapsed && propertiesCollapsed ? 'filled' : 'subtle'}
            color={!chatCollapsed && propertiesCollapsed ? 'blue' : 'gray'}
            onClick={onToggleChat}
            aria-label={chatCollapsed ? 'Открыть чат' : 'Закрыть чат'}
            style={{ borderRadius: 4, transition: 'all 200ms ease' }}
          >
            <IconMessages size={20} />
          </ActionIcon>
        </Tooltip>

        {showPropertiesAction && (
          <Tooltip label={propertiesCollapsed ? 'Открыть свойства' : 'Закрыть свойства'} position="right" withArrow>
            <ActionIcon
              size="lg"
              variant={!propertiesCollapsed && chatCollapsed ? 'filled' : 'subtle'}
              color={!propertiesCollapsed && chatCollapsed ? 'blue' : 'gray'}
              onClick={onToggleProperties}
              aria-label={propertiesCollapsed ? 'Открыть свойства' : 'Закрыть свойства'}
              style={{ borderRadius: 4, transition: 'all 200ms ease' }}
            >
              <IconAdjustments size={20} />
            </ActionIcon>
          </Tooltip>
        )}
      </Stack>
    </Box>
  )
}
