import React from 'react'
import { VirtualizedGrid } from '@/shared/ui/VirtualizedGrid'
import type { ObjectRecord } from '@/shared/api/types'
import { LibraryObjectCard } from '../LibraryObjectCard'

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
 * Виртуализированная сетка объектов библиотеки
 * Использует универсальную VirtualizedGrid и LibraryObjectCard для отображения
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
  return (
    <VirtualizedGrid
      items={objects}
      renderItem={(object) => (
        <LibraryObjectCard
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
      )}
      getItemKey={(object) => object.uuid}
      height={height}
      virtualizationThreshold={20}
      columnSpan={{ base: 12, sm: 6, md: 4, lg: 3 }}
    />
  )
}