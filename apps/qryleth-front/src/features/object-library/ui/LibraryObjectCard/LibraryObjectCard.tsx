import React, { useState } from 'react'
import { IconCube, IconEdit, IconTrash } from '@tabler/icons-react'
import { ObjectCard } from '@/entities/object/ui'
import type { ObjectCardAction } from '@/entities/object/ui'
import type { ObjectRecord } from '@/shared/api/types'
import { HoverInteractivePreview } from './HoverInteractivePreview'

export interface LibraryObjectCardProps {
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
 * Карточка объекта из библиотеки с интерактивным 3D превью при наведении
 * Использует композицию ObjectCard из entities и добавляет специфичную для библиотеки логику
 */
export const LibraryObjectCard: React.FC<LibraryObjectCardProps> = ({
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
  const [hovered, setHovered] = useState(false)
  const [hoverPreviewReady, setHoverPreviewReady] = useState(false)

  /**
   * Формирует список действий для карточки объекта
   */
  const actions: ObjectCardAction[] = [
    ...(showAddButton && onAdd ? [{
      type: 'add' as const,
      label: 'Добавить',
      onClick: () => onAdd(object),
      icon: <IconCube size={14} />
    }] : []),
    ...(onEdit ? [{
      type: 'edit' as const,
      label: 'Редактировать',
      onClick: () => onEdit(object),
      icon: <IconEdit size={14} />
    }] : []),
    ...(showDeleteButton && onDelete ? [{
      type: 'delete' as const,
      label: 'Удалить',
      onClick: () => onDelete(object),
      icon: <IconTrash size={14} />,
      iconOnly: true,
      tooltip: 'Удалить объект'
    }] : [])
  ]

  /**
   * Создает интерактивное превью при наведении курсора
   */
  const previewOverlay = hovered ? (
    <HoverInteractivePreview
      gfxObject={object.objectData}
      onReadyChange={setHoverPreviewReady}
    />
  ) : undefined

  return (
    <div
      onMouseEnter={() => {
        setHovered(true)
        setHoverPreviewReady(false)
      }}
      onMouseLeave={() => {
        setHovered(false)
        setHoverPreviewReady(false)
      }}
    >
      <ObjectCard
        object={object.objectData}
        thumbnailSrc={object.thumbnail}
        size={size}
        showThumbnail={true}
        showMetadata={true}
        showDate={showDate}
        loading={loading}
        actions={actions}
        previewOverlay={previewOverlay}
        updatedAt={object.updatedAt}
      />
    </div>
  )
}