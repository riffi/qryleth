import React from 'react'
import { SegmentedControl } from '@mantine/core'

export type RenderMode = 'solid' | 'wireframe'

interface RenderModeSegmentProps {
  /** Текущий режим рендеринга */
  value: RenderMode
  /** Колбэк изменения режима рендеринга */
  onChange: (mode: RenderMode) => void
  /** Применить легкий фон для контраста на 3D сцене */
  frosted?: boolean
  /** Размер сегмент-контрола */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Переключатель режима рендеринга (заливка/каркас).
 * Универсальный и компактный контрол для HUD сцены.
 */
export const RenderModeSegment: React.FC<RenderModeSegmentProps> = ({ value, onChange, frosted = false, size = 'xs' }) => {
  return (
    <SegmentedControl
      value={value}
      onChange={(v) => onChange(v as RenderMode)}
      data={[
        { value: 'solid', label: 'Solid' },
        { value: 'wireframe', label: 'Wireframe' }
      ]}
      size={size}
      styles={frosted ? { root: { background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' } } : undefined}
    />
  )
}

