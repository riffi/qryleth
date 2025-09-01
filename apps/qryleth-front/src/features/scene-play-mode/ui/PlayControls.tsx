import React, { useEffect, useState } from 'react'
import { Box, Group, Tooltip, ActionIcon, Stack, Text } from '@mantine/core'
import { IconPlayerStop } from '@tabler/icons-react'
import { ViewModeSegment } from '@/shared/ui'

export interface PlayControlsProps {
  /** Текущий режим просмотра камеры в Play (orbit/walk/fly). */
  viewMode: 'orbit' | 'walk' | 'fly'
  /** Обработчик смены режима просмотра. */
  onChangeViewMode: (mode: 'orbit' | 'walk' | 'fly') => void
  /** Выход из Play‑режима. */
  onExitPlay: () => void
  /** Текущая скорость полёта (для Fly), если доступна. */
  flySpeed?: number
}

/**
 * PlayControls — презентационная панель управления камерами в Play‑режиме.
 * Не имеет зависимостей от стора; принимает все значения через пропсы.
 */
export const PlayControls: React.FC<PlayControlsProps> = ({ viewMode, onChangeViewMode, onExitPlay, flySpeed }) => {
  return (
    <Box
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 20,
        display: 'flex',
        gap: 12,
        padding: 6,
        background: 'color-mix(in srgb, var(--mantine-color-dark-7) 72%, transparent)',
        backdropFilter: 'blur(8px)',
        borderRadius: '10px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
        transition: 'opacity 200ms ease'
      }}
    >
      <Group gap={8} wrap="nowrap" align="center">
        <Stack gap={0} align="start">
          <ViewModeSegment value={viewMode} onChange={onChangeViewMode} frosted size="xs" />
          {viewMode === 'fly' && typeof flySpeed === 'number' && (
            <Text size="xs" c="dimmed" style={{ marginLeft: 2, marginTop: 2, userSelect: 'none' }}>
              Скорость полёта: <b>{flySpeed}</b>
            </Text>
          )}
        </Stack>
        <Tooltip label="Выйти из Play" withArrow>
          <ActionIcon size="md" variant="filled" color="red" onClick={onExitPlay} aria-label="Выйти из Play">
            <IconPlayerStop size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  )
}

