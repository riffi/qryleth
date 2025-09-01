import React from 'react'
import { Stack, Box, Text, Group } from '@mantine/core'
import { IconCube, IconCalendar, IconPhoto } from '@tabler/icons-react'
import { BaseCard, PreviewImage, MetadataBadges, ActionButtons } from '@/shared/ui'
import type { ActionButton } from '@/shared/ui'
import type { ReactNode } from 'react'
import type { GfxObject } from '../model/types'

export interface ObjectCardAction {
  /** Тип действия */
  type: 'edit' | 'delete' | 'add' | 'select' | 'custom'
  /** Текст кнопки */
  label: string
  /** Обработчик клика */
  onClick: (object: GfxObject) => void
  /** Иконка кнопки */
  icon?: ReactNode
  /** Отображать как иконку */
  iconOnly?: boolean
  /** Tooltip для иконочной кнопки */
  tooltip?: string
}

export interface ObjectCardProps {
  /** Объект для отображения */
  object: GfxObject
  /** URL превью изображения */
  thumbnailSrc?: string
  /** Размер карточки */
  size?: 'sm' | 'md' | 'lg'
  /** Показывать ли превью изображение */
  showThumbnail?: boolean
  /** Показывать ли метаданные */
  showMetadata?: boolean
  /** Показывать ли дату обновления */
  showDate?: boolean
  /** Состояние загрузки */
  loading?: boolean
  /** Действия для выполнения с объектом */
  actions?: ObjectCardAction[]
  /** Overlay контент поверх превью (например, интерактивное 3D превью) */
  previewOverlay?: ReactNode
  /** Дата обновления объекта (если отличается от объекта) */
  updatedAt?: Date
}

/**
 * Карточка для отображения объекта с настраиваемыми действиями и контентом
 * Использует композицию shared UI компонентов для максимальной гибкости
 */
export const ObjectCard: React.FC<ObjectCardProps> = ({
  object,
  thumbnailSrc,
  size = 'md',
  showThumbnail = true,
  showMetadata = true,
  showDate = false,
  loading = false,
  actions = [],
  previewOverlay,
  updatedAt
}) => {
  /**
   * Получает размеры превью в зависимости от размера карточки
   */
  const getPreviewSize = () => {
    switch (size) {
      case 'sm':
        return { width: 256, height: 256 }
      case 'lg':
        return { width: 256, height: 256 }
      default:
        return { width: 256, height: 256 }
    }
  }

  /**
   * Формирует список бейджей с метаданными объекта
   */
  const badges = [
    {
      label: `${object.primitives.length} примитивов`,
      color: 'blue',
      icon: <IconCube size={12} />
    },
    ...(object.materials?.length ? [{
      label: `${object.materials.length} материалов`,
      color: 'green'
    }] : []),
    ...(showThumbnail && object.boundingBox ? [{
      label: '',
      color: 'green',
      icon: <IconPhoto size={12} />
    }] : [])
  ]

  /**
   * Преобразует действия объекта в формат ActionButtons
   */
  const buttonActions: ActionButton[] = actions.map(action => ({
    label: action.label,
    icon: action.icon,
    onClick: () => action.onClick(object),
    variant: action.type === 'delete' ? 'subtle' : 'filled',
    color: action.type === 'delete' ? 'red' : undefined,
    iconOnly: action.iconOnly,
    tooltip: action.tooltip
  }))

  /**
   * Форматирует дату в читаемый формат
   */
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <BaseCard size={size} loading={loading}>
      <Stack gap={size === 'sm' ? 'xs' : 'sm'}>
        {/* Превью изображение */}
        {showThumbnail && (
          <PreviewImage
            src={thumbnailSrc}
            alt={`Превью объекта ${object.name}`}
            square={true}
            loading={loading}
            fallbackIcon={<IconCube size={size === 'sm' ? 24 : 32} />}
            overlay={previewOverlay}
          />
        )}

        {/* Информация об объекте */}
        <Box style={{ flex: 1 }}>
          <Text
            fw={500}
            lineClamp={size === 'sm' ? 1 : 2}
            size={size === 'sm' ? 'sm' : 'md'}
          >
            {object.name}
          </Text>
        </Box>

        {/* Дата обновления */}
        {showDate && updatedAt && (
          <Group gap="xs">
            <IconCalendar size={14} />
            <Text size="xs" c="dimmed">
              {formatDate(updatedAt)}
            </Text>
          </Group>
        )}

        {/* Метаданные */}
        {showMetadata && (
          <MetadataBadges badges={badges} size="sm" />
        )}

        {/* Кнопки действий */}
        {actions.length > 0 && (
          <ActionButtons buttons={buttonActions} size="xs" />
        )}
      </Stack>
    </BaseCard>
  )
}