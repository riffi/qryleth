import React from 'react'
import { Box } from '@mantine/core'

interface EdgeToolbarProps {
  /**
   * Сторона экрана, у которой должен располагаться тулбар.
   * 'left' — прижат к левому краю контейнера, 'right' — к правому.
   */
  side: 'left' | 'right'
  /**
   * Горизонтальное смещение тулбара от соответствующего края в пикселях.
   * Используется для сдвига тулбара, когда открыта соответствующая боковая панель.
   * По умолчанию 0 — тулбар прижат к краю.
   */
  offsetPx?: number
  /**
   * Ширина тулбара, px. По умолчанию 40.
   */
  width?: number
  /**
   * Дочерние элементы — как правило, вертикальный Stack с ActionIcon/Tooltip.
   */
  children?: React.ReactNode
}

/**
 * EdgeToolbar — общий контейнер для вертикальных боковых тулбаров редакторов.
 *
 * Особенности:
 * - Единый стиль фона: полупрозрачный через color-mix с 30% цвета.
 * - Без теней и рамок для визуальной лёгкости.
 * - Скругление только внутренних углов (в сторону центра сцены).
 * - Позиционирование absolute с выравниванием по вертикали по центру.
 */
export const EdgeToolbar: React.FC<EdgeToolbarProps> = ({ side, offsetPx = 0, width = 40, children }) => {
  const isLeft = side === 'left'
  return (
    <Box
      style={{
        position: 'absolute',
        [isLeft ? 'left' : 'right']: offsetPx,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 150,
        width,
        background: 'color-mix(in srgb, var(--mantine-color-dark-8) 30%, transparent)',
        borderRight: isLeft ? 'none' : undefined,
        borderLeft: !isLeft ? 'none' : undefined,
        borderTopRightRadius: isLeft ? 8 : 0,
        borderBottomRightRadius: isLeft ? 8 : 0,
        borderTopLeftRadius: !isLeft ? 8 : 0,
        borderBottomLeftRadius: !isLeft ? 8 : 0,
        boxShadow: 'none',
        padding: '8px 0',
        transition: 'background 160ms ease, left 160ms ease, right 160ms ease',
      }}
    >
      {children}
    </Box>
  )
}

export default EdgeToolbar

