import React from 'react'
import { Group, ActionIcon, Tooltip } from '@mantine/core'
import { IconArrowRightBar, IconRotate, IconResize } from '@tabler/icons-react'

export type TransformMode = 'translate' | 'rotate' | 'scale'

interface TransformModeButtonsProps {
  /** Текущий режим трансформации */
  mode: TransformMode
  /** Колбэк смены режима трансформации */
  onChange: (mode: TransformMode) => void
  /** Размер кнопок (Mantine ActionIcon size) */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Набор кнопок для переключения режима трансформации (перемещение/поворот/масштаб).
 * Универсальный компонент для SceneEditor и ObjectEditor.
 */
export const TransformModeButtons: React.FC<TransformModeButtonsProps> = ({ mode, onChange, size = 'md' }) => {
  return (
    <Group gap="xs">
      <Tooltip label="Перемещение">
        <ActionIcon
          size={size}
          variant={mode === 'translate' ? 'filled' : 'light'}
          color="blue"
          onClick={() => onChange('translate')}
          aria-label="Перемещение"
        >
          <IconArrowRightBar size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Поворот">
        <ActionIcon
          size={size}
          variant={mode === 'rotate' ? 'filled' : 'light'}
          color="green"
          onClick={() => onChange('rotate')}
          aria-label="Поворот"
        >
          <IconRotate size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Масштаб">
        <ActionIcon
          size={size}
          variant={mode === 'scale' ? 'filled' : 'light'}
          color="orange"
          onClick={() => onChange('scale')}
          aria-label="Масштаб"
        >
          <IconResize size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  )
}

