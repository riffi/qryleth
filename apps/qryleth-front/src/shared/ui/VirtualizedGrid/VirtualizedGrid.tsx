import React, { useState, useEffect, useRef } from 'react'
import { Box, Grid, Skeleton } from '@mantine/core'
import type { ReactNode } from 'react'

export interface VirtualizedGridProps<T> {
  /** Массив элементов для отображения */
  items: T[]
  /** Функция рендеринга элемента */
  renderItem: (item: T, index: number) => ReactNode
  /** Функция получения уникального ключа элемента */
  getItemKey: (item: T, index: number) => string
  /** Высота контейнера */
  height?: number
  /** Количество колонок в ряду */
  columnsPerRow?: number
  /** Пороговое значение для включения виртуализации */
  virtualizationThreshold?: number
  /** Конфигурация колонок для разных экранов */
  columnSpan?: {
    base?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}

/**
 * Компонент для ленивой загрузки элемента сетки
 */
const LazyGridItem: React.FC<{
  children: ReactNode
  itemKey: string
  skeletonHeight?: number
}> = ({ children, itemKey, skeletonHeight = 200 }) => {
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
        rootMargin: '100px',
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

  return (
    <div ref={ref} style={{ minHeight: skeletonHeight }}>
      {isVisible ? (
        children
      ) : (
        <Skeleton height={skeletonHeight} radius="md" />
      )}
    </div>
  )
}

/**
 * Универсальная виртуализированная сетка для оптимальной производительности
 * при отображении большого количества элементов
 */
export const VirtualizedGrid = <T,>({
  items,
  renderItem,
  getItemKey,
  height = 600,
  columnsPerRow = 4,
  virtualizationThreshold = 20,
  columnSpan = { base: 12, sm: 6, md: 4, lg: 3 }
}: VirtualizedGridProps<T>) => {
  // Если элементов мало, отображаем обычную сетку без ленивой загрузки
  if (items.length <= virtualizationThreshold) {
    return (
      <Grid>
        {items.map((item, index) => (
          <Grid.Col key={getItemKey(item, index)} span={columnSpan}>
            {renderItem(item, index)}
          </Grid.Col>
        ))}
      </Grid>
    )
  }

  // Для большого количества элементов используем ленивую загрузку
  return (
    <Box style={{ maxHeight: height, overflowY: 'auto', overflowX: 'hidden' }}>
      <Grid>
        {items.map((item, index) => (
          <Grid.Col key={getItemKey(item, index)} span={columnSpan}>
            <LazyGridItem
              itemKey={getItemKey(item, index)}
              skeletonHeight={200}
            >
              {renderItem(item, index)}
            </LazyGridItem>
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  )
}