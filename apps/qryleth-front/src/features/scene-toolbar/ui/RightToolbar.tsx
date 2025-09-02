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
  /**
   * Горизонтальное смещение тулбара от правого края контейнера, px.
   * Используется для сдвига тулбара влево, когда открыта правая панель,
   * чтобы тулбар располагался непосредственно слева от панели.
   * Если не задано — тулбар прижат к правому краю.
   */
  offsetRightPx?: number
}

/**
 * Правый тулбар SceneEditor в стиле JetBrains IDEA.
 * Содержит иконку для управления правой панелью: менеджер объектов.
 * Располагается вертикально у правого края интерфейса.
 */
export const RightToolbar: React.FC<RightToolbarProps> = ({
  objectPanelCollapsed,
  onToggleObjectPanel,
  offsetRightPx = 0,
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
        // Смещение от правого края контейнера: 0, если панель скрыта; ширина панели + разделитель — если открыта
        right: offsetRightPx,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 150,
        width: 40,
        background: `color-mix(in srgb, var(--mantine-color-dark-8) ${bgOpacityPercent}%, transparent)`,
        // Убрали рамку слева по требованию
        borderLeft: 'none',
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
        boxShadow: 'none',
        transition: 'background 160ms ease, box-shadow 160ms ease, right 160ms ease',
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
