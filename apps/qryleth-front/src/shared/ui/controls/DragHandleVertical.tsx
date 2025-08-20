import React from 'react'
import { Box } from '@mantine/core'

interface DragHandleVerticalProps {
  /** Обработчик начала перетаскивания (mousedown) */
  onMouseDown: (e: React.MouseEvent) => void
  /** Подпись для доступности (aria-label) */
  ariaLabel: string
  /** Ширина области перетаскивания, px */
  width?: number
}

/**
 * Вертикальная ручка-резайзер для разделителей панелей.
 * Используется между панелями для начала перетаскивания ширины.
 */
export const DragHandleVertical: React.FC<DragHandleVerticalProps> = ({ onMouseDown, ariaLabel, width = 6 }) => {
  return (
    <Box
      onMouseDown={onMouseDown}
      style={{
        width,
        cursor: 'col-resize',
        alignSelf: 'stretch',
        display: 'flex',
        justifyContent: 'center',
        opacity: 0.6
      }}
      aria-label={ariaLabel}
    >
      <Box style={{ width: 2, height: '48%', marginTop: 'auto', marginBottom: 'auto', background: 'var(--mantine-color-dark-4)', borderRadius: 2 }} />
    </Box>
  )
}

