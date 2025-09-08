import React from 'react'
import { ActionIcon, Group, Menu, Text, Box } from '@mantine/core'
import { IconChevronDown, IconChevronRight, IconEye, IconEyeOff } from '@tabler/icons-react'
import type { TreeMenuAction } from './types'

export interface TreeRowProps {
  /** Уникальный идентификатор узла (используется для ключей и DnD) */
  id: string
  /** Текстовое имя, отображаемое в строке */
  name: string
  /** Иконка, показываемая слева от имени */
  icon?: React.ReactNode
  /** Уровень вложенности (для визуального отступа) */
  level?: number
  /** Количество, отображаемое в виде малой подписи справа от имени */
  count?: number
  /** Признак видимости; если undefined — иконка видимости не рисуется */
  visible?: boolean
  /** Признак, что у узла есть дочерние элементы и его можно сворачивать */
  isExpandable?: boolean
  /** Текущее состояние разворота */
  isExpanded?: boolean
  /** Доступность перетаскивания строки (Drag & Drop) */
  draggable?: boolean
  /** Набор действий для контекстного меню справа */
  actions?: TreeMenuAction[]
  /** Выделена ли строка (визуальный акцент) */
  selected?: boolean
  /** Коллбэк по клику на строку (например, выделение) */
  onClick?: () => void
  /** Переключение развёрнутости узла (при нажатии на шеврон) */
  onToggleExpand?: () => void
  /** Переключение видимости (при нажатии на иконку глаза) */
  onToggleVisibility?: () => void
  /** DnD-обработчики (опционально) */
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  /** Обработчик контекстного меню (ПКМ) для строки */
  onContextMenu?: (e: React.MouseEvent) => void
  /** Обработчики наведения мыши (подсветка) */
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * Презентационный компонент «строка дерева».
 * Унифицирует отрисовку имени, иконок (шеврон, видимость, меню) и действий.
 * Не содержит доменной логики — все обработчики приходят через props.
 */
export const TreeRow: React.FC<TreeRowProps> = ({
  id,
  name,
  icon,
  level = 0,
  count,
  visible,
  isExpandable,
  isExpanded,
  draggable,
  actions,
  selected,
  onClick,
  onToggleExpand,
  onToggleVisibility,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}) => {
  /**
   * Обработчик клика по шеврону. Останавливает всплытие, чтобы
   * не срабатывать основной onClick строки (например, выделение).
   */
  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpand?.()
  }

  /**
   * Обработчик нажатия на иконку «глаз».
   * Останавливаем всплытие, чтобы не кликалась вся строка.
   */
  const handleVisibilityClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleVisibility?.()
  }

  return (
    <Box
      data-node-id={id}
      draggable={!!draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        padding: '8px 4px',
        borderRadius: 4,
        border: '1px solid transparent',
        cursor: onClick ? 'pointer' : 'default',
        marginBottom: 1,
        backgroundColor: selected ? 'var(--mantine-color-blue-9)' : 'transparent',
        borderColor: selected ? 'var(--mantine-color-blue-6)' : 'transparent',
        transition: 'all 0.1s ease',
        paddingLeft: 4 + level * 12,
      }}
    >
      <Group justify="space-between" align="center" gap="xs">
        <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
          {isExpandable ? (
            <ActionIcon size="xs" variant="transparent" onClick={handleChevronClick} style={{ width: 16, height: 16, minWidth: 16 }}>
              {isExpanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
            </ActionIcon>
          ) : (
            // Сохраняем выравнивание, если шеврона нет
            <Box style={{ width: 16, height: 16, minWidth: 16 }} />
          )}

          {icon}

          <Text size="xs" fw={500} style={{ userSelect: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </Text>

          {typeof count === 'number' && (
            <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
              ({count})
            </Text>
          )}
        </Group>

        <Group gap="xs">
          {typeof visible !== 'undefined' && (
            <ActionIcon size="xs" variant="transparent" onClick={handleVisibilityClick} style={{ width: 16, height: 16, minWidth: 16 }}>
              {visible ? <IconEye size={12} /> : <IconEyeOff size={12} />}
            </ActionIcon>
          )}

          {actions && actions.length > 0 && (
            <Menu shadow="md" width={220}>
              <Menu.Target>
                <ActionIcon size="xs" variant="transparent" style={{ width: 16, height: 16, minWidth: 16 }} onClick={(e) => e.stopPropagation()}>
                  <Text size="xs" fw={700}>⋮</Text>
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {actions.map((a) => (
                  <Menu.Item key={a.id} leftSection={a.icon} color={a.color} onClick={(e) => { e.stopPropagation(); a.onClick() }}>
                    {a.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>
    </Box>
  )
}

/**
 * Мемоизированная версия строки. Перерисовывается только при изменении входных пропсов.
 */
export const MemoTreeRow = React.memo(TreeRow)
