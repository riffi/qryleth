import React from 'react'
import {
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  ScrollArea,
  ActionIcon,
  Box,
  Tooltip,
  Menu,
  Button
} from '@mantine/core'
import {
  IconEye,
  IconEyeOff,
  IconTrash,
  IconFolderPlus,
  IconPencil,
  IconChevronRight,
  IconChevronDown,
  IconFolder,
  IconFolderOpen
} from '@tabler/icons-react'
import {
  useObjectPrimitives,
  useObjectSelectedPrimitiveIds,
  useObjectHoveredPrimitiveId,
  useObjectStore,
  useObjectPrimitiveGroups,
  usePrimitiveGroupAssignments
} from '../../model/objectStore.ts'
import { getPrimitiveDisplayName, getPrimitiveIcon } from '@/entities/primitive'
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxPrimitiveGroup } from '@/entities/primitiveGroup'
import { GroupNameModal } from './GroupNameModal'

/**
 * Элемент примитива в списке PrimitiveManager
 */
const PrimitiveItem = React.memo<{
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

/**
 * Панель управления примитивами, аналогичная ObjectManager по стилю
 */
export const PrimitiveManager: React.FC = () => {
  const primitives = useObjectPrimitives()
  const selectedPrimitiveIds = useObjectSelectedPrimitiveIds()
  const hoveredPrimitiveId = useObjectHoveredPrimitiveId()

  // Step 1: Add groups hook - test if this causes infinite loop
  const groups = useObjectPrimitiveGroups()

  // Step 5: Add primitiveGroupAssignments hook
  const primitiveGroupAssignments = usePrimitiveGroupAssignments()

  // Step 6: Avoid problematic useUngroupedPrimitives hook - compute directly
  const ungroupedPrimitives = React.useMemo(() =>
    primitives.filter(primitive => !primitiveGroupAssignments[primitive.uuid]),
    [primitives, primitiveGroupAssignments]
  )

  // Use direct values to avoid мемоизации
  const primitivesCount = primitives.length
  const selectedPrimitivesCount = selectedPrimitiveIds.length
  const groupsCount = Object.keys(groups).length

  const {
    selectPrimitive,
    togglePrimitiveSelection,
    setHoveredPrimitive,
    setSelectedPrimitives,
    togglePrimitiveVisibility,
    removePrimitive,
    // Step 2: Add createGroup action - test if this causes infinite loop
    createGroup,
    // Step 4: Add deleteGroup action
    deleteGroup,
    // Step 5: Add assignment actions
    assignPrimitiveToGroup,
    removePrimitiveFromGroup,
    // Add other actions for tree structure
    renameGroup,
    toggleGroupVisibility,
    selectGroup,
    toggleGroupSelection,
    clearGroupSelection
  } = useObjectStore()

  // Храним последний индекс, выбранный пользователем, для поддержки диапазонного выделения
  const lastSelectedRef = React.useRef<number | null>(null)

  // State for expanded groups
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())

  // State for drag and drop
  const [draggedItem, setDraggedItem] = React.useState<{type: 'primitive' | 'group', uuid: string} | null>(null)
  const [dropTarget, setDropTarget] = React.useState<string | null>(null)

  // Состояние для модального окна ввода названия группы
  const [groupModalOpened, setGroupModalOpened] = React.useState(false)
  const [groupModalInitialName, setGroupModalInitialName] = React.useState('')
  const [groupModalGroupUuid, setGroupModalGroupUuid] = React.useState<string | null>(null)

  /**
   * Обработчик клика по примитиву. Поддерживает одиночное, множественное
   * (Ctrl) и диапазонное (Shift) выделение.
   * @param index индекс примитива в списке
   */
  const handlePrimitiveSelect = (index: number) => {
    // При выборе примитива необходимо сбросить выбранный материал,
    // чтобы левая панель переключилась в режим редактирования примитива.
    useObjectStore.getState().selectMaterial(null)

    const event = window.event as KeyboardEvent

    if (event?.shiftKey && lastSelectedRef.current !== null) {
      // Диапазонное выделение между последним выбранным элементом и текущим
      const start = Math.min(lastSelectedRef.current, index)
      const end = Math.max(lastSelectedRef.current, index)
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i)
      setSelectedPrimitives(range)
    } else if (event?.ctrlKey || event?.metaKey) {
      // Множественный выбор с Ctrl или Cmd
      togglePrimitiveSelection(index)
    } else {
      // Одиночный выбор
      selectPrimitive(index)
    }

    lastSelectedRef.current = index
  }

  /**
   * Обработчик наведения курсора на примитив.
   * Передает индекс выделяемого элемента в zustand‑хранилище.
   * @param index индекс примитива или null, если курсор покинул элемент
   */
  const handlePrimitiveHover = (index: number | null) => {
    setHoveredPrimitive(index)
  }

  /**
   * Переключает состояние развёрнутости конкретной группы.
   * При повторном вызове сворачивает уже раскрытую группу и наоборот.
   * @param groupUuid UUID группы, для которой меняется состояние
   */
  const handleToggleGroupExpand = React.useCallback((groupUuid: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupUuid)) {
        newSet.delete(groupUuid)
      } else {
        newSet.add(groupUuid)
      }
      return newSet
    })
  }, [])

  const handleSelectGroup = React.useCallback((groupUuid: string, event?: React.MouseEvent) => {
    // Clear primitive selection when selecting groups
    if (selectedPrimitivesCount > 0) {
      setSelectedPrimitives([])
    }

    if (event?.ctrlKey || event?.metaKey) {
      toggleGroupSelection(groupUuid)
    } else {
      selectGroup(groupUuid)
    }
  }, [selectedPrimitivesCount, setSelectedPrimitives, toggleGroupSelection, selectGroup])
  /**
   * Открывает модальное окно для создания новой корневой группы.
   */
  const handleCreateGroup = React.useCallback(() => {
    setGroupModalInitialName('')
    setGroupModalGroupUuid(null)
    setGroupModalOpened(true)
  }, [])

  /**
   * Открывает модальное окно переименования существующей группы.
   * @param group группа, которую требуется переименовать
   */
  const handleOpenRenameGroup = React.useCallback((group: GfxPrimitiveGroup) => {
    setGroupModalInitialName(group.name)
    setGroupModalGroupUuid(group.uuid)
    setGroupModalOpened(true)
  }, [])

  /**
   * Обрабатывает подтверждение в модальном окне: создаёт новую группу
   * или переименовывает существующую.
   * @param name введённое пользователем название
   */
  const handleGroupModalSubmit = React.useCallback((name: string) => {
    if (groupModalGroupUuid) {
      renameGroup(groupModalGroupUuid, name)
    } else {
      const groupUuid = createGroup(name)
      if (groupUuid) {
        setExpandedGroups(prev => new Set([...prev, groupUuid]))
      }
    }
  }, [groupModalGroupUuid, renameGroup, createGroup])

  /**
   * Закрывает модальное окно и очищает временное состояние.
   */
  const handleGroupModalClose = React.useCallback(() => {
    setGroupModalOpened(false)
    setGroupModalGroupUuid(null)
    setGroupModalInitialName('')
  }, [])

  const handleDeleteGroup = React.useCallback((groupUuid: string) => {
    deleteGroup(groupUuid)
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      newSet.delete(groupUuid)
      return newSet
    })
  }, [deleteGroup])

  const handleToggleGroupVisibility = React.useCallback((groupUuid: string) => {
    toggleGroupVisibility(groupUuid)
  }, [toggleGroupVisibility])

  // Drag and drop handlers - memoized to prevent unnecessary re-renders
  const handleDragStart = React.useCallback((e: React.DragEvent, primitiveUuid: string) => {
    setDraggedItem({ type: 'primitive', uuid: primitiveUuid })
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleGroupDragStart = React.useCallback((e: React.DragEvent, groupUuid: string) => {
    setDraggedItem({ type: 'group', uuid: groupUuid })
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = React.useCallback((e: React.DragEvent, targetGroupUuid?: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(targetGroupUuid || 'ungrouped')
  }, [])

  const handleDragLeave = React.useCallback(() => {
    setDropTarget(null)
  }, [])

  const handleDrop = React.useCallback((e: React.DragEvent, targetGroupUuid?: string) => {
    e.preventDefault()

    if (!draggedItem) return

    if (draggedItem.type === 'primitive') {
      if (targetGroupUuid && targetGroupUuid !== 'ungrouped') {
        // Assign primitive to group
        assignPrimitiveToGroup(draggedItem.uuid, targetGroupUuid)
      } else {
        // Drop on ungrouped area - remove from any group
        removePrimitiveFromGroup(draggedItem.uuid)
      }
    }

    setDraggedItem(null)
    setDropTarget(null)
  }, [draggedItem, assignPrimitiveToGroup, removePrimitiveFromGroup])

  // Special drag over handler for primitives (no target group)
  const handlePrimitiveDragOver = React.useCallback((e: React.DragEvent) => {
    handleDragOver(e)
  }, [handleDragOver])

  // Специальный обработчик сброса для области без групп
  const handleUngroupedDrop = React.useCallback((e: React.DragEvent) => {
    handleDrop(e)
  }, [handleDrop])

  // Функция рендеринга примитива, мемоизированная с корректными зависимостями
  const renderPrimitive = React.useCallback((primitive: GfxPrimitive, index: number) => (
    <PrimitiveItem
      key={primitive.uuid}
      primitive={primitive}
      index={index}
      isSelected={selectedPrimitiveIds.includes(index)}
      isHovered={hoveredPrimitiveId === index}
      onSelect={handlePrimitiveSelect}
      onHover={handlePrimitiveHover}
      onToggleVisibility={togglePrimitiveVisibility}
      onRemove={removePrimitive}
      onDragStart={handleDragStart}
      dragOver={handlePrimitiveDragOver}
      isDropTarget={false}
    />
  ), [selectedPrimitiveIds, hoveredPrimitiveId, handlePrimitiveSelect, handlePrimitiveHover, togglePrimitiveVisibility, removePrimitive, handleDragStart, handlePrimitiveDragOver])

  return (
    <>
      <Paper
      shadow="sm"
      style={{
        width: "100%",
        height: '100%',
        borderRadius: 0,
        userSelect: 'none'
      }}
    >
      <Stack gap={0} style={{ height: '100%', minHeight: 0 }}>
        {/* Заголовок */}
        <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-8)' }}>
          <Group justify="space-between" mb="sm">
            <Text size="lg" fw={500} style={{ userSelect: 'none' }}>
              Примитивы
            </Text>
            <Group gap="xs">
              <Badge variant="light" color="blue" size="sm">
                {primitivesCount}
              </Badge>
              {groupsCount > 0 && (
                <Badge variant="light" color="yellow" size="sm">
                  {groupsCount} групп
                </Badge>
              )}
            </Group>
          </Group>

          {/* Step 2: Add simple group creation button */}
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              leftSection={<IconFolderPlus size={14} />}
              onClick={handleCreateGroup}
            >
              Создать группу
            </Button>
          </Group>

        </Box>

        {/* Древовидная структура примитивов и групп */}
        <ScrollArea style={{ flex: 1 , minHeight: 0 }} p="sm">
          <Stack gap="xs">
            {/* Root level groups - each group shows its primitives inside */}
            {Object.values(groups)
              .filter(group => !group.parentGroupUuid) // Only root level groups
              .map((group) => (
                <Box key={group.uuid}>
                  <Box
                    onDragOver={(e) => handleDragOver(e, group.uuid)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, group.uuid)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 4,
                      backgroundColor: dropTarget === group.uuid
                        ? 'var(--mantine-color-green-8)'
                        : 'transparent',
                      border: dropTarget === group.uuid
                        ? '2px dashed var(--mantine-color-green-4)'
                        : 'none',
                      marginBottom: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <ActionIcon
                          size="xs"
                          variant="transparent"
                          onClick={() => handleToggleGroupExpand(group.uuid)}
                          style={{ width: 16, height: 16, minWidth: 16 }}
                        >
                          {expandedGroups.has(group.uuid) ? (
                            <IconChevronDown size={12} />
                          ) : (
                            <IconChevronRight size={12} />
                          )}
                        </ActionIcon>

                        {expandedGroups.has(group.uuid) ? (
                          <IconFolderOpen size={14}  />
                        ) : (
                          <IconFolder size={14}  />
                        )}

                        <Text
                          size="sm"
                          fw={500}
                          style={{  cursor: 'pointer' }}
                          onClick={() => handleToggleGroupExpand(group.uuid)}
                        >
                          {group.name}
                        </Text>
                      </Group>

                      <Menu shadow="md" width={150}>
                        <Menu.Target>
                          <ActionIcon size="xs" variant="transparent" onClick={(e) => e.stopPropagation()}>
                            <Text size="xs" fw={700} style={{ color: 'var(--mantine-color-yellow-1)' }}>⋮</Text>
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconPencil size={14} />}
                            onClick={() => handleOpenRenameGroup(group)}
                          >
                            Переименовать
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={() => handleDeleteGroup(group.uuid)}
                          >
                            Удалить группу
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Box>

                  {/* Show primitives in this group when expanded */}
                  {expandedGroups.has(group.uuid) && (
                    <Box style={{ paddingLeft: '16px', marginTop: '0px' }}>
                      <Stack gap="xs">
                        {primitives
                          .filter(primitive => primitiveGroupAssignments[primitive.uuid] === group.uuid)
                          .map((primitive, index) => {
                            const originalIndex = primitives.findIndex(p => p.uuid === primitive.uuid)
                            return (
                              <PrimitiveItem
                                key={primitive.uuid}
                                primitive={primitive}
                                index={originalIndex}
                                isSelected={selectedPrimitiveIds.includes(originalIndex)}
                                isHovered={hoveredPrimitiveId === originalIndex}
                                onSelect={handlePrimitiveSelect}
                                onHover={handlePrimitiveHover}
                                onToggleVisibility={togglePrimitiveVisibility}
                                onRemove={removePrimitive}
                                onDragStart={handleDragStart}
                                dragOver={handlePrimitiveDragOver}
                                isDropTarget={false}
                              />
                            )
                          })}
                      </Stack>
                    </Box>
                  )}
                </Box>
              ))}

            {/* Ungrouped primitives */}
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleUngroupedDrop}
              style={{
                padding: '8px',
                borderRadius: 4,
                backgroundColor: dropTarget === 'ungrouped'
                  ? 'var(--mantine-color-green-9)'
                  : 'transparent',
                border: dropTarget === 'ungrouped'
                  ? '2px dashed var(--mantine-color-green-4)'
                  : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              <Text size="sm" fw={500} c="dimmed" mb="xs">Без группы:</Text>
              <Stack gap="xs">
                {ungroupedPrimitives.map((primitive, index) => {
                  const originalIndex = primitives.findIndex(p => p.uuid === primitive.uuid)
                  return (
                    <PrimitiveItem
                      key={primitive.uuid}
                      primitive={primitive}
                      index={originalIndex}
                      isSelected={selectedPrimitiveIds.includes(originalIndex)}
                      isHovered={hoveredPrimitiveId === originalIndex}
                      onSelect={handlePrimitiveSelect}
                      onHover={handlePrimitiveHover}
                      onToggleVisibility={togglePrimitiveVisibility}
                      onRemove={removePrimitive}
                      onDragStart={handleDragStart}
                      dragOver={handlePrimitiveDragOver}
                      isDropTarget={false}
                    />
                  )
                })}
              </Stack>
            </Box>

            {primitivesCount === 0 && (
              <Text
                size="sm"
                c="dimmed"
                ta="center"
                mt="xl"
                style={{ userSelect: 'none' }}
              >
                Нет примитивов
              </Text>
            )}
          </Stack>
        </ScrollArea>

        {/* Статус выбора */}
        {selectedPrimitivesCount > 0 && (
          <Box p="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-8)' }}>
            <Text size="xs" c="dimmed" style={{ userSelect: 'none' }}>
              Выбрано: {selectedPrimitivesCount} примитив(ов)
            </Text>
          </Box>
        )}
      </Stack>
      </Paper>
      <GroupNameModal
        opened={groupModalOpened}
        initialName={groupModalInitialName}
        title={groupModalGroupUuid ? 'Переименовать группу' : 'Новая группа'}
        confirmLabel={groupModalGroupUuid ? 'Сохранить' : 'Создать'}
        onClose={handleGroupModalClose}
        onSubmit={handleGroupModalSubmit}
      />
    </>
  )
}
