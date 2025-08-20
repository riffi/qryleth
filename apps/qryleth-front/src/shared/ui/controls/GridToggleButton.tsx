import React from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import { IconGridDots } from '@tabler/icons-react'

interface GridToggleButtonProps {
  /** Текущее состояние видимости сетки */
  visible: boolean
  /** Обработчик переключения видимости сетки */
  onToggle: () => void
  /** Размер кнопки (Mantine ActionIcon size) */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Кнопка переключения сетки на сцене/редакторе объекта.
 * Отображает иконку сетки и меняет стиль в зависимости от состояния.
 */
export const GridToggleButton: React.FC<GridToggleButtonProps> = ({ visible, onToggle, size = 'md' }) => {
  return (
    <Tooltip label={visible ? 'Скрыть сетку' : 'Показать сетку'}>
      <ActionIcon
        variant={visible ? 'filled' : 'light'}
        c={visible ? 'white' : 'gray'}
        onClick={onToggle}
        size={size}
        aria-label={visible ? 'Скрыть сетку' : 'Показать сетку'}
      >
        <IconGridDots size={18} />
      </ActionIcon>
    </Tooltip>
  )
}

