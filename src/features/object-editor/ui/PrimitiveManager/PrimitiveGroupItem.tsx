import React from 'react'
import {
  Group,
  Text,
  Box,
  ActionIcon,
  Menu,
  Collapse,
  Stack,
  Badge,
  Tooltip
} from '@mantine/core'
import {
  IconFolder,
  IconFolderOpen,
  IconEye,
  IconEyeOff,
  IconEdit,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
  IconPlus,
  IconFolderPlus,
  IconDownload
} from '@tabler/icons-react'
import type { GfxPrimitiveGroup } from '@/entities/primitiveGroup'

interface PrimitiveGroupItemProps {
  group: GfxPrimitiveGroup
  isExpanded: boolean
  isSelected: boolean
  children?: React.ReactNode
  primitiveCount: number
  level: number
  onToggleExpand: (groupUuid: string) => void
  onSelect: (groupUuid: string, event?: React.MouseEvent) => void
  onRename: (groupUuid: string, newName: string) => void
  onDelete: (groupUuid: string) => void
  onCreateSubGroup: (parentGroupUuid: string) => void
  onCreateGroup: () => void
  onToggleVisibility: (groupUuid: string) => void
  onDragStart?: (e: React.DragEvent, groupUuid: string) => void
  onDragOver?: (e: React.DragEvent, targetGroupUuid: string) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent, targetGroupUuid: string) => void
  isDropTarget?: boolean
}

/**
 * Элемент дерева групп с действиями управления.
 * Отображает одну группу, её подгруппы и примитивы.
 */
export const PrimitiveGroupItem: React.FC<PrimitiveGroupItemProps> = ({
  group,
  isExpanded,
  isSelected,
  children,
  primitiveCount,
  level,
  onToggleExpand,
  onSelect,
  onRename,
  onDelete,
  onCreateSubGroup,
  onCreateGroup,
  onToggleVisibility,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDropTarget
}) => {
  const [isRenaming, setIsRenaming] = React.useState(false)
  const [nameValue, setNameValue] = React.useState(group.name)
  const inputRef = React.useRef<HTMLInputElement>(null)

  /**
   * Включает режим переименования группы и устанавливает фокус на поле ввода.
   */
  const handleRenameStart = () => {
    setIsRenaming(true)
    setNameValue(group.name)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  /**
   * Подтверждает новое имя группы, если оно изменилось и не пустое.
   */
  const handleRenameSubmit = () => {
    if (nameValue.trim() && nameValue !== group.name) {
      onRename(group.uuid, nameValue.trim())
    }
    setIsRenaming(false)
  }

  /**
   * Отменяет переименование и возвращает исходное имя группы.
   */
  const handleRenameCancel = () => {
    setNameValue(group.name)
    setIsRenaming(false)
  }

  /**
   * Обрабатывает нажатия клавиш в поле ввода имени группы.
   * Enter подтверждает изменение, Escape отменяет.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      handleRenameCancel()
    }
  }

  /**
   * Обрабатывает выбор группы при клике по её области.
   */
  const handleClick = (event: React.MouseEvent) => {
    if (!isRenaming) {
      onSelect(group.uuid, event)
    }
  }

  /**
   * Переключает видимость текущей группы.
   */
  const handleToggleVisibilityClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleVisibility(group.uuid)
  }

  const isImported = !!group.sourceObjectUuid
  const FolderIcon = isExpanded ? IconFolderOpen : IconFolder

  return (
    <div>
      <Box
        draggable={!!onDragStart}
        onDragStart={onDragStart ? (e) => onDragStart(e, group.uuid) : undefined}
        onDragOver={onDragOver ? (e) => onDragOver(e, group.uuid) : undefined}
        onDragLeave={onDragLeave}
        onDrop={onDrop ? (e) => onDrop(e, group.uuid) : undefined}
        style={{
          backgroundColor: isSelected
            ? 'var(--mantine-color-blue-9)'
            : isDropTarget
            ? 'var(--mantine-color-green-8)'
            : 'transparent',
          marginBottom: '2px',
          borderRadius: '4px',
          padding: '6px 8px',
          border: isSelected
            ? '1px solid var(--mantine-color-blue-6)'
            : isDropTarget
            ? '1px dashed var(--mantine-color-green-4)'
            : '1px solid transparent',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          paddingLeft: `${8 + level * 16}px`
        }}
        onClick={handleClick}
      >
        <Group justify="space-between" align="center" gap="xs">
          <Group gap="xs" style={{ flex: 1 }}>
            <ActionIcon
              size="xs"
              variant="transparent"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand(group.uuid)
              }}
              style={{
                width: '16px',
                height: '16px',
                minWidth: '16px'
              }}
            >
              {primitiveCount > 0 || children ? (
                isExpanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />
              ) : null}
            </ActionIcon>

            <FolderIcon size={14} color="var(--mantine-color-yellow-6)" />

            {isRenaming ? (
              <input
                ref={inputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--mantine-color-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: 0,
                  outline: 'none',
                  width: '150px'
                }}
              />
            ) : (
              <Text size="sm" fw={500} style={{ userSelect: 'none' }}>
                {group.name}
              </Text>
            )}

            {isImported && (
              <Tooltip label="Импортированная группа">
                <Badge size="xs" variant="light" color="orange">
                  <IconDownload size={10} />
                </Badge>
              </Tooltip>
            )}

            <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
              ({primitiveCount})
            </Text>
          </Group>

          <Group gap="xs">
            <Tooltip label={group.visible === false ? 'Показать группу' : 'Скрыть группу'}>
              <ActionIcon
                size="xs"
                variant="subtle"
                color={group.visible === false ? 'gray' : 'yellow'}
                onClick={handleToggleVisibilityClick}
                style={{
                  width: '16px',
                  height: '16px',
                  minWidth: '16px'
                }}
              >
                {group.visible === false ? <IconEyeOff size={12} /> : <IconEye size={12} />}
              </ActionIcon>
            </Tooltip>

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon
                  size="xs"
                  variant="transparent"
                  style={{
                    width: '16px',
                    height: '16px',
                    minWidth: '16px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Text size="xs" fw={700}>⋮</Text>
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconPlus size={14} />}
                  onClick={onCreateGroup}
                >
                  Создать группу
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFolderPlus size={14} />}
                  onClick={() => onCreateSubGroup(group.uuid)}
                >
                  Создать подгруппу
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={handleRenameStart}
                >
                  Переименовать
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={() => onDelete(group.uuid)}
                >
                  Удалить группу
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Box>

      <Collapse in={isExpanded}>
        <div style={{ paddingLeft: '16px' }}>
          {children}
        </div>
      </Collapse>
    </div>
  )
}
