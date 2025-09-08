import type React from 'react'

/**
 * Элемент контекстного меню строки дерева.
 * Описывает подпись, иконку, цвет и обработчик нажатия.
 */
export interface TreeMenuAction {
  /** Уникальный идентификатор пункта меню (для key) */
  id: string
  /** Текст в пункте меню */
  label: string
  /** Необязательная иконка слева от подписи */
  icon?: React.ReactNode
  /** Цвет пункта (поддерживаются значения Mantine, напр. 'red') */
  color?: string
  /** Обработчик выбора пункта меню */
  onClick: () => void
}

/**
 * Базовая модель узла дерева для универсального списка.
 * Используется презентационным слоем для отрисовки строк без знания доменной логики.
 */
export interface TreeNodeBase {
  /** Уникальный идентификатор узла */
  id: string
  /** Отображаемое имя узла */
  name: string
  /** Иконка узла (React-элемент) */
  icon?: React.ReactNode
  /** Количество, которое показывается справа от имени (например, количество объектов) */
  count?: number
  /** Признак видимости узла; если не передан — иконка видимости не отображается */
  visible?: boolean
  /** Дочерние узлы (если есть), для сворачивания/разворачивания */
  children?: TreeNodeBase[]
  /** Наличие шеврона-разворачивания, даже если children не переданы (ленивая подгрузка) */
  isExpandable?: boolean
  /** Признак выделения (для визуального акцента) */
  selected?: boolean
  /** Признак доступности DnD для строки */
  isDraggable?: boolean
  /** Набор действий контекстного меню (иконка ⋮ справа) */
  actions?: TreeMenuAction[]
  /** Обработчик клика по строке (например, выделение узла) */
  onClick?: () => void
  /** Обработчик переключения видимости; показывает/скрывает иконку видимости */
  onToggleVisibility?: () => void
  /** DnD- и hover-обработчики (опционально) */
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}
