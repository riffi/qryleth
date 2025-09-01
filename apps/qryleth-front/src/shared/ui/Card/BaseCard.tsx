import React from 'react'
import { Card } from '@mantine/core'
import type { ReactNode } from 'react'

export interface BaseCardProps {
  /** Содержимое карточки */
  children: ReactNode
  /** Размер карточки */
  size?: 'sm' | 'md' | 'lg'
  /** Состояние загрузки */
  loading?: boolean
  /** Обработчик клика по карточке */
  onClick?: () => void
  /** Дополнительный CSS класс */
  className?: string
}

/**
 * Базовая карточка для отображения контента
 * Предоставляет единообразный стиль и поведение для всех карточек в приложении
 */
export const BaseCard: React.FC<BaseCardProps> = ({ 
  children, 
  size = 'md', 
  loading = false, 
  onClick, 
  className 
}) => {
  return (
    <Card
      shadow="sm"
      padding={size === 'sm' ? 'xs' : 'md'}
      radius="md"
      withBorder
      className={className}
      onClick={onClick}
      style={{ 
        opacity: loading ? 0.5 : 1,
        cursor: onClick ? 'pointer' : undefined
      }}
    >
      {children}
    </Card>
  )
}