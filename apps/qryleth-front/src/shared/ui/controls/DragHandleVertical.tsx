import React, { useState } from 'react'
import { Box } from '@mantine/core'

interface DragHandleVerticalProps {
  /** Обработчик начала перетаскивания (mousedown) */
  onMouseDown: (e: React.MouseEvent) => void
  /** Подпись для доступности (aria-label) */
  ariaLabel: string
  /** Ширина области перетаскивания, px */
  width?: number
  /** Активное состояние перетаскивания: показывает индикатор, даже если курсор вне зоны */
  active?: boolean
}

/**
 * Вертикальная ручка-резайзер для разделителей панелей.
 * Используется между панелями для начала перетаскивания ширины.
 */
export const DragHandleVertical: React.FC<DragHandleVerticalProps> = ({ onMouseDown, ariaLabel, width = 6, active = false }) => {
  // Локальное состояние наведения мыши для показа индикатора ручки
  const [hovered, setHovered] = useState(false)

  return (
    <Box
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width,
        cursor: 'col-resize',
        alignSelf: 'stretch',
        display: 'flex',
        justifyContent: 'center'
      }}
      aria-label={ariaLabel}
    >
      {/* Индикатор ручки показывается только при наведении */}
      <Box
        style={{
          width: 2,
          height: '48%',
          marginTop: 'auto',
          marginBottom: 'auto',
          background: 'var(--mantine-color-dark-4)',
          borderRadius: 2,
          opacity: hovered || active ? 0.9 : 0,
          transition: 'opacity 120ms ease'
        }}
      />
    </Box>
  )
}
