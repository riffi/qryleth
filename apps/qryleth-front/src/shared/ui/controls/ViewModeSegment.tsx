import React from 'react'
import { Group, SegmentedControl } from '@mantine/core'
import { IconPlanet, IconRun, IconPlaneTilt, IconDrone } from '@tabler/icons-react'

export type ViewMode = 'orbit' | 'walk' | 'fly' | 'flyover'

interface ViewModeSegmentProps {
  /** Текущий режим камеры */
  value: ViewMode
  /** Колбэк изменения режима камеры */
  onChange: (mode: ViewMode) => void
  /** Использовать полупрозрачный фон (на поверхности сцены) */
  frosted?: boolean
  /** Размер контролла */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Переключатель режима управления камерой сцены: Orbit/Walk/Fly/Flyover.
 * Отдельный компонент, так как только SceneEditor использует его.
 */
export const ViewModeSegment: React.FC<ViewModeSegmentProps> = ({ value, onChange, frosted = false, size = 'xs' }) => {
  return (
    <SegmentedControl
      value={value}
      onChange={(v) => onChange(v as ViewMode)}
      data={[
        {
          value: 'orbit',
          label: (
            <Group gap={4} wrap="nowrap">
              <IconPlanet size={14} />
              <span>Orbit</span>
            </Group>
          )
        },
        {
          value: 'walk',
          label: (
            <Group gap={4} wrap="nowrap">
              <IconRun size={14} />
              <span>Walk</span>
            </Group>
          )
        },
        {
          value: 'fly',
          label: (
            <Group gap={4} wrap="nowrap">
              <IconPlaneTilt size={14} />
              <span>Fly</span>
            </Group>
          )
        },
        {
          value: 'flyover',
          label: (
            <Group gap={4} wrap="nowrap">
              <IconDrone size={14} />
              <span>Облёт</span>
            </Group>
          )
        }
      ]}
      size={size}
      styles={frosted ? { root: { background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' } } : undefined}
    />
  )
}

