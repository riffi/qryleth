import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Box, Grid, Skeleton } from '@mantine/core'
import type { ObjectRecord } from '@/shared/lib/database'
import { ObjectPreviewCard, type ObjectPreviewCardProps } from '../ObjectPreviewCard'

export interface VirtualizedObjectGridProps {
  /** Массив объектов для отображения */
  objects: ObjectRecord[]
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
  /** Высота контейнера */
  height?: number
  /** Количество колонок в ряду */
  columnsPerRow?: number
}

/**
 * Компонент для ленивой загрузки элемента сетки
 */
const LazyObjectCard: React.FC<{
  object: ObjectRecord
  onEdit?: (object: ObjectRecord) => void
  onDelete?: (object: ObjectRecord) => void
  onAdd?: (object: ObjectRecord) => void
  showAddButton?: boolean
  showDeleteButton?: boolean
  showDate?: boolean
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}> = ({
  object,
  onEdit,
  onDelete,
  onAdd,
  showAddButton,
  showDeleteButton,
  showDate,
  size,
  loading
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true)
          setHasLoaded(true)
        }
      },
      {
        rootMargin: '100px', // Загружаем элементы за 100px до их появления
        threshold: 0.1
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [hasLoaded])

  const getCardHeight = () => {
    switch (size) {
      case 'sm':
        return 200
      case 'lg':
        return 400
      default:
        return 300
    }
  }

  return (
    <div ref={ref} style={{ minHeight: getCardHeight() }}>
      {isVisible ? (
        <ObjectPreviewCard
          object={object}
          onEdit={onEdit}
          onDelete={onDelete}
          onAdd={onAdd}
          showAddButton={showAddButton}
          showDeleteButton={showDeleteButton}
          showDate={showDate}
          size={size}
          loading={loading}
        />
      ) : (
        <Skeleton height={getCardHeight()} radius="md" />
      )}
    </div>
  )
}

/**
 * Виртуализированная сетка объектов для оптимальной производительности
 * при отображении большого количества превью объектов
 */
/**
 * Виртуализированная сетка объектов для оптимальной производительности
 * при отображении большого количества превью объектов.
 *
 * Важные детали реализации:
 * - Для больших списков контейнер ограничен по высоте и получает вертикальную
 *   прокрутку (`overflowY: 'auto'`) при отключённой горизонтальной (`overflowX: 'hidden'`).
 *   Это предотвращает появление горизонтальной полосы прокрутки из-за гаттеров/округлений.
 */
export const VirtualizedObjectGrid: React.FC<VirtualizedObjectGridProps> = ({
  objects,
  onEdit,
  onDelete,
  onAdd,
  showAddButton = false,
  showDeleteButton = true,
  showDate = true,
  size = 'md',
  loading = false,
  height = 600,
  columnsPerRow = 4
}) => {
  // Если объектов мало (до 20), отображаем обычную сетку без ленивой загрузки
  if (objects.length <= 20) {
    return (
      <Grid>
        {objects.map((object) => (
          <Grid.Col 
            key={object.uuid} 
            span={{ base: 12, sm: 6, md: 4, lg: 3 }}
          >
            <ObjectPreviewCard
              object={object}
              onEdit={onEdit}
              onDelete={onDelete}
              onAdd={onAdd}
              showAddButton={showAddButton}
              showDeleteButton={showDeleteButton}
              showDate={showDate}
              size={size}
              loading={loading}
            />
          </Grid.Col>
        ))}
      </Grid>
    )
  }

  // Для большого количества объектов используем ленивую загрузку
  return (
    <Box style={{ maxHeight: height, overflowY: 'auto', overflowX: 'hidden' }}>
      <Grid>
        {objects.map((object) => (
          <Grid.Col 
            key={object.uuid} 
            span={{ base: 12, sm: 6, md: 4, lg: 3 }}
          >
            <LazyObjectCard
              object={object}
              onEdit={onEdit}
              onDelete={onDelete}
              onAdd={onAdd}
              showAddButton={showAddButton}
              showDeleteButton={showDeleteButton}
              showDate={showDate}
              size={size}
              loading={loading}
            />
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  )
}

export default VirtualizedObjectGrid
