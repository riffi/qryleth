import React from 'react'
import { Box, ActionIcon, Tooltip, Stack } from '@mantine/core'
import { IconFolder } from '@tabler/icons-react'

interface RightToolbarProps {
  /** Свёрнут ли менеджер объектов (правая панель). true = менеджер скрыт. */
  managerCollapsed: boolean
  /** Переключить видимость правой панели (менеджер объектов). */
  onToggleManager: () => void
}

/**
 * Правый тулбар ObjectEditor: управление панелью менеджера объектов.
 * Визуально и по UX согласован с тулбаром SceneEditor.
 */
export const RightToolbar: React.FC<RightToolbarProps> = ({ managerCollapsed, onToggleManager }) => {
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
        padding: '8px 0',
      }}
    >
      <Stack gap={2} align="center">
        <Tooltip label={managerCollapsed ? 'Открыть менеджер' : 'Закрыть менеджер'} position="left" withArrow>
          <ActionIcon
            size="lg"
            variant={!managerCollapsed ? 'filled' : 'subtle'}
            color={!managerCollapsed ? 'blue' : 'gray'}
            onClick={onToggleManager}
            aria-label={managerCollapsed ? 'Открыть менеджер' : 'Закрыть менеджер'}
            style={{ borderRadius: 4, transition: 'all 200ms ease' }}
          >
            <IconFolder size={20} />
          </ActionIcon>
        </Tooltip>
      </Stack>
    </Box>
  )
}

