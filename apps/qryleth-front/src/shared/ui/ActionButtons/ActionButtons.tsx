import React from 'react'
import { Group, Button, ActionIcon, Tooltip } from '@mantine/core'
import type { ReactNode } from 'react'

export interface ActionButton {
  /** Текст кнопки */
  label: string
  /** Иконка кнопки */
  icon?: ReactNode
  /** Обработчик клика */
  onClick: () => void
  /** Вариант отображения кнопки */
  variant?: 'filled' | 'light' | 'outline' | 'subtle'
  /** Цвет кнопки */
  color?: string
  /** Состояние загрузки */
  loading?: boolean
  /** Отображать как иконку (без текста) */
  iconOnly?: boolean
  /** Tooltip для иконочной кнопки */
  tooltip?: string
}

export interface ActionButtonsProps {
  /** Массив кнопок для отображения */
  buttons: ActionButton[]
  /** Размер кнопок */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Расположение кнопок */
  layout?: 'horizontal' | 'vertical'
  /** Расстояние между кнопками */
  gap?: 'xs' | 'sm' | 'md'
}

/**
 * Компонент для отображения группы кнопок действий
 * Поддерживает обычные кнопки и кнопки-иконки с тултипами
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  buttons, 
  size = 'sm', 
  layout = 'horizontal',
  gap = 'xs'
}) => {
  if (buttons.length === 0) return null

  const direction = layout === 'vertical' ? 'column' : 'row'

  return (
    <Group gap={gap} style={{ flexDirection: direction }}>
      {buttons.map((button, index) => {
        if (button.iconOnly) {
          const actionIcon = (
            <ActionIcon
              key={index}
              size={size}
              color={button.color}
              variant={button.variant || 'filled'}
              onClick={button.onClick}
              loading={button.loading}
            >
              {button.icon}
            </ActionIcon>
          )

          return button.tooltip ? (
            <Tooltip key={index} label={button.tooltip}>
              {actionIcon}
            </Tooltip>
          ) : actionIcon
        }

        return (
          <Button
            key={index}
            size={size}
            variant={button.variant || 'filled'}
            color={button.color}
            leftSection={button.icon}
            onClick={button.onClick}
            loading={button.loading}
            style={{ flex: layout === 'horizontal' ? 1 : undefined }}
          >
            {button.label}
          </Button>
        )
      })}
    </Group>
  )
}