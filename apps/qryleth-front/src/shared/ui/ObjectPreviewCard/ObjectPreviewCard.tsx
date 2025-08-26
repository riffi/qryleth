import React, { useState, memo } from 'react'
import {
  Card,
  Group,
  Text,
  Badge,
  Button,
  ActionIcon,
  Tooltip,
  Box,
  Image,
  Skeleton,
  Stack
} from '@mantine/core'
import {
  IconCube,
  IconEdit,
  IconTrash,
  IconCalendar,
  IconPhoto
} from '@tabler/icons-react'
import type { ObjectRecord } from '@/shared/lib/database'
import classes from './ObjectPreviewCard.module.css'

export interface ObjectPreviewCardProps {
  /** Объект из библиотеки */
  object: ObjectRecord
  /** Обработчик для редактирования объекта */
  onEdit?: (object: ObjectRecord) => void
  /** Обработчик для удаления объекта */
  onDelete?: (object: ObjectRecord) => void
  /** Обработчик для добавления объекта в сцену */
  onAdd?: (object: ObjectRecord) => void
  /** Показывать ли кнопку "Добавить" */
  showAddButton?: boolean
  /** Показывать ли кнопку "Удалить" */
  showDeleteButton?: boolean
  /** Показывать ли дату обновления */
  showDate?: boolean
  /** Размер карточки */
  size?: 'sm' | 'md' | 'lg'
  /** Состояние загрузки */
  loading?: boolean
}

/**
 * Карточка для отображения объекта из библиотеки с превью
 * Поддерживает отображение thumbnail, placeholder для объектов без превью,
 * оптимизированное кеширование изображений
 */
export const ObjectPreviewCard = memo<ObjectPreviewCardProps>(({
  object,
  onEdit,
  onDelete,
  onAdd,
  showAddButton = false,
  showDeleteButton = true,
  showDate = true,
  size = 'md',
  loading = false
}) => {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

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

  /**
   * Обработчик успешной загрузки изображения
   */
  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  /**
   * Обработчик ошибки загрузки изображения
   */
  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  /**
   * Получает размеры контейнера превью в зависимости от размера карточки
   */
  const getPreviewSize = () => {
    switch (size) {
      case 'sm':
        return { width: 80, height: 80 }
      case 'lg':
        return { width: 200, height: 200 }
      default:
        return { width: 120, height: 120 }
    }
  }

  const previewSize = getPreviewSize()
  const hasThumbnail = Boolean(object.thumbnail)

  return (
    <Card 
      shadow="sm" 
      padding={size === 'sm' ? 'xs' : 'md'} 
      radius="md" 
      withBorder
      className={classes.card}
    >
      <Stack gap={size === 'sm' ? 'xs' : 'sm'}>
        {/* Превью изображение */}
        <Box className={classes.previewContainer} style={{ height: previewSize.height }}>
          {hasThumbnail && !imageError ? (
            <>
              {imageLoading && (
                <Skeleton
                  width={previewSize.width}
                  height={previewSize.height}
                  radius="sm"
                  className={classes.previewSkeleton}
                />
              )}
              <Image
                src={object.thumbnail}
                alt={`Превью объекта ${object.name}`}
                width={previewSize.width}
                height={previewSize.height}
                fit="contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
                className={classes.previewImage}
                style={{
                  display: imageLoading ? 'none' : 'block',
                  opacity: loading ? 0.5 : 1
                }}
              />
            </>
          ) : (
            <Box
              className={classes.placeholderContainer}
              style={{
                width: previewSize.width,
                height: previewSize.height
              }}
            >
              <IconCube size={size === 'sm' ? 24 : 32} className={classes.placeholderIcon} />
              <Text size={size === 'sm' ? 'xs' : 'sm'} c="dimmed" ta="center">
                {imageError ? 'Ошибка загрузки' : 'Нет превью'}
              </Text>
            </Box>
          )}
        </Box>

        {/* Информация об объекте */}
        <Box style={{ flex: 1 }}>
          <Text 
            fw={500} 
            lineClamp={size === 'sm' ? 1 : 2}
            size={size === 'sm' ? 'sm' : 'md'}
          >
            {object.name}
          </Text>
          
          {object.description && size !== 'sm' && (
            <Text 
              size="sm" 
              c="dimmed" 
              lineClamp={2} 
              mt={4}
            >
              {object.description}
            </Text>
          )}
        </Box>

        {/* Метаданные */}
        <Stack gap="xs">
          {showDate && (
            <Group gap="xs">
              <IconCalendar size={14} />
              <Text size="xs" c="dimmed">
                {formatDate(object.updatedAt)}
              </Text>
            </Group>
          )}

          <Group gap="xs">
            <Badge color="blue" variant="light" size="sm">
              {object.objectData.primitives.length} примитивов
            </Badge>
            {hasThumbnail && (
              <Badge color="green" variant="light" size="sm">
                <IconPhoto size={12} />
              </Badge>
            )}
          </Group>
        </Stack>

        {/* Кнопки действий */}
        <Group gap="xs" mt="xs">
          {showAddButton && onAdd && (
            <Button
              size="xs"
              leftSection={<IconCube size={14} />}
              onClick={() => onAdd(object)}
              loading={loading}
              style={{ flex: 1 }}
            >
              Добавить
            </Button>
          )}

          {onEdit && (
            <Button
              size="xs"
              variant={showAddButton ? 'light' : 'filled'}
              leftSection={<IconEdit size={14} />}
              onClick={() => onEdit(object)}
              loading={loading}
              style={showAddButton ? undefined : { flex: 1 }}
            >
              Редактировать
            </Button>
          )}

          {showDeleteButton && onDelete && (
            <Tooltip label="Удалить объект">
              <ActionIcon
                size="sm"
                color="red"
                variant="subtle"
                onClick={() => onDelete(object)}
                loading={loading}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Stack>
    </Card>
  )
})

ObjectPreviewCard.displayName = 'ObjectPreviewCard'