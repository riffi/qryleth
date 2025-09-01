import React from 'react'
import { Group, Badge } from '@mantine/core'
import type { ReactNode } from 'react'

export interface BadgeItem {
  /** Текст бейджа */
  label: string
  /** Цвет бейджа */
  color?: string
  /** Иконка для отображения в бейдже */
  icon?: ReactNode
  /** Вариант отображения бейджа */
  variant?: 'light' | 'filled' | 'outline'
}

export interface MetadataBadgesProps {
  /** Массив бейджей для отображения */
  badges: BadgeItem[]
  /** Размер бейджей */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Расстояние между бейджами */
  gap?: 'xs' | 'sm' | 'md'
}

/**
 * Компонент для отображения группы бейджей с метаданными
 * Используется для показа дополнительной информации об объектах
 */
export const MetadataBadges: React.FC<MetadataBadgesProps> = ({ 
  badges, 
  size = 'sm', 
  gap = 'xs' 
}) => {
  if (badges.length === 0) return null

  return (
    <Group gap={gap}>
      {badges.map((badge, index) => (
        <Badge
          key={index}
          color={badge.color}
          variant={badge.variant || 'light'}
          size={size}
          leftSection={badge.icon}
        >
          {badge.label}
        </Badge>
      ))}
    </Group>
  )
}