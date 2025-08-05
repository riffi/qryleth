import React from 'react'
import {
  Box,
  Group,
  Text,
  Tooltip,
  ActionIcon,
  Menu
} from '@mantine/core'
import { IconEye, IconEyeOff, IconTrash } from '@tabler/icons-react'
import { getPrimitiveDisplayName, getPrimitiveIcon } from '@/entities/primitive'
import type { GfxPrimitive } from '@/entities/primitive'

/**
 * Отдельный элемент списка примитивов с действиями управления.
 */
export const PrimitiveItem = React.memo<{
  primitive: GfxPrimitive
  index: number
  isSelected: boolean
  isHovered: boolean
  onSelect: (index: number) => void
  onHover: (index: number | null) => void
  onToggleVisibility: (index: number) => void
  onRemove: (index: number) => void
  onDragStart?: (e: React.DragEvent, primitiveUuid: string) => void
  dragOver?: (e: React.DragEvent) => void
  isDropTarget?: boolean
}>(({
  primitive,
  index,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onToggleVisibility,
  onRemove,
  onDragStart,
  dragOver,
  isDropTarget
}) => {
  return (
    <Box
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, primitive.uuid) : undefined}
      onDragOver={dragOver}
      style={{
        padding: '4px 12px',
        borderRadius: 4,
        cursor: 'pointer',
        backgroundColor: isSelected
          ? 'var(--mantine-color-blue-9)'
          : isDropTarget
          ? 'var(--mantine-color-green-8)'
          : 'transparent',
        border: isSelected
          ? '1px solid var(--mantine-color-blue-6)'
          : isDropTarget
          ? '1px dashed var(--mantine-color-green-4)'
          : '1px solid transparent',
        transition: 'all 0.15s ease'
      }}
      onClick={() => onSelect(index)}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <Group gap="xs" wrap="nowrap">
        {(() => {
          const Icon = getPrimitiveIcon(primitive.type)
          return <Icon size={16} color="var(--mantine-color-blue-4)" />
        })()}

        <Text size="sm" style={{ flex: 1, userSelect: 'none' }} fw={500}>
          {getPrimitiveDisplayName(primitive, index)}
        </Text>

        <Group gap="xs">
          <Tooltip label={primitive.visible === false ? 'Показать примитив' : 'Скрыть примитив'}>
            <ActionIcon
              size="xs"
              variant="subtle"
              color={primitive.visible === false ? 'gray' : 'blue'}
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility(index)
              }}
            >
              {primitive.visible === false ? <IconEyeOff size={12} /> : <IconEye size={12} />}
            </ActionIcon>
          </Tooltip>
          <Menu shadow="md" width={150}>
            <Menu.Target>
              <ActionIcon size="xs" variant="transparent" onClick={(e) => e.stopPropagation()}>
                <Text size="xs" fw={700}>⋮</Text>
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={() => onRemove(index)}
              >
                Удалить примитив
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Box>
  )
})
