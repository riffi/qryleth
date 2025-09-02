import React from 'react'
import { ActionIcon, Tooltip, Stack } from '@mantine/core'
import { EdgeToolbar } from '@/shared/ui'
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
  return (
    <EdgeToolbar side={'right'} offsetPx={offsetRightPx}>
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
    </EdgeToolbar>
  )
}
