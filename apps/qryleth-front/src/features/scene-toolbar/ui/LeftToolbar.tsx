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
  /**
   * Горизонтальное смещение тулбара от левого края контейнера, px.
   * Используется для сдвига тулбара вправо, когда открыта левая панель,
   * чтобы тулбар располагался непосредственно справа от панели.
   * Если не задано — тулбар прижат к левому краю.
   */
  offsetLeftPx?: number
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
  onToggleScripting,
  offsetLeftPx = 0,
}) => {
  /**
   * Упрощённое правило: одинаковая прозрачность 0.3 для любых состояний,
   * что эквивалентно 70% цвета в color-mix. Тень выключена всегда.
   */
  const bgOpacityPercent = 30
  return (
    <Box
      style={{
        position: 'absolute',
        // Смещение от левого края контейнера: 0, если панель скрыта; ширина панели + разделитель — если открыта
        left: offsetLeftPx,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 150,
        width: 40,
        background: `color-mix(in srgb, var(--mantine-color-dark-8) ${bgOpacityPercent}%, transparent)`,
        // Убрали рамку справа по требованию
        borderRight: 'none',
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
        boxShadow: 'none',
        transition: 'background 160ms ease, box-shadow 160ms ease, left 160ms ease',
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
