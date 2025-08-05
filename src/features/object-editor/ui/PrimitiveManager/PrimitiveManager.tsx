import React from 'react'
import {
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  ScrollArea,
  Box,
  Button
} from '@mantine/core'
import { IconFolderPlus } from '@tabler/icons-react'
import {
  useObjectPrimitives,
  useObjectSelectedPrimitiveIds,
  useObjectHoveredPrimitiveId,
  useObjectStore,
  useObjectPrimitiveGroups,
  usePrimitiveGroupAssignments,
  useSelectedGroupUuids
} from '../../model/objectStore.ts'
import type { GfxPrimitive } from '@/entities/primitive'
import type { GroupTreeNode } from '@/entities/primitiveGroup'
import { buildGroupTree, findGroupChildren } from '@/entities/primitiveGroup'
import { movePrimitiveToGroup } from '@/entities/primitiveGroup/lib/coordinateUtils'
import { GroupNameModal } from './GroupNameModal'
import { PrimitiveItem } from './PrimitiveItem'
import { PrimitiveGroupItem } from './PrimitiveGroupItem'


/**
 * Панель управления примитивами, аналогичная ObjectManager по стилю
 */
export const PrimitiveManager: React.FC = () => {
  const primitives = useObjectPrimitives()
  const selectedPrimitiveIds = useObjectSelectedPrimitiveIds()
  const hoveredPrimitiveId = useObjectHoveredPrimitiveId()

  // Список всех групп
  const groups = useObjectPrimitiveGroups()
  const selectedGroupUuids = useSelectedGroupUuids()

  // Строим дерево групп локально, чтобы избежать бесконечных рендеров
  const groupTree = React.useMemo<GroupTreeNode[]>(
    () => buildGroupTree(groups),
    [groups]
  )

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
    createSubGroup,
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
    moveGroup,
    updatePrimitive
  } = useObjectStore()

  // Храним последний индекс, выбранный пользователем, для поддержки диапазонного выделения
  const lastSelectedRef = React.useRef<number | null>(null)

  // State for expanded groups
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())

  // State for drag and drop
  const [draggedItem, setDraggedItem] = React.useState<{type: 'primitive' | 'group', uuids: string[]} | null>(null)
  const [dropTarget, setDropTarget] = React.useState<string | null>(null)

  // Состояние для модального окна ввода названия группы
  const [groupModalOpened, setGroupModalOpened] = React.useState(false)
  const [groupModalParentUuid, setGroupModalParentUuid] = React.useState<string | null>(null)

  /**
   * Обработчик клика по примитиву. Поддерживает одиночное, множественное
   * (Ctrl) и диапазонное (Shift) выделение.
   * @param index индекс примитива в списке
   */
  const handlePrimitiveSelect = (index: number) => {
    // При выборе примитива необходимо сбросить выбранный материал,
    // чтобы левая панель переключилась в режим редактирования примитива.
    useObjectStore.getState().selectMaterial(null)
    
    // При выборе примитива сбрасываем выделение групп
    useObjectStore.getState().setSelectedGroups([])

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

  /**
   * Обрабатывает выбор группы. Выделяет только саму группу,
   * не затрагивая примитивы.
   * @param groupUuid UUID группы, которую требуется выделить
   * @param event Событие клика для поддержки множественного выбора
   */
  const handleSelectGroup = React.useCallback((groupUuid: string, event?: React.MouseEvent) => {
    // При выборе группы сбрасываем выделение примитивов
    setSelectedPrimitives([])
    
    if (event?.ctrlKey || event?.metaKey) {
      toggleGroupSelection(groupUuid)
    } else {
      selectGroup(groupUuid)
    }
  }, [setSelectedPrimitives, toggleGroupSelection, selectGroup])
  /**
   * Открывает модальное окно для создания новой корневой группы.
   */
  const handleCreateGroup = React.useCallback(() => {
    setGroupModalParentUuid(null)
    setGroupModalOpened(true)
  }, [])

  /**
   * Открывает модальное окно для создания подгруппы указанной группы.
   * @param parentGroupUuid UUID родительской группы
   */
  const handleCreateSubGroup = React.useCallback((parentGroupUuid: string) => {
    setGroupModalParentUuid(parentGroupUuid)
    setGroupModalOpened(true)
  }, [])

  /**
   * Обрабатывает подтверждение в модальном окне: создаёт новую группу
   * или подгруппу в зависимости от выбранного родителя.
   * @param name введённое пользователем название
   */
  const handleGroupModalSubmit = React.useCallback((name: string) => {
    let groupUuid: string
    if (groupModalParentUuid) {
      groupUuid = createSubGroup(name, groupModalParentUuid)
      setExpandedGroups(prev => new Set([...prev, groupModalParentUuid!, groupUuid]))
    } else {
      groupUuid = createGroup(name)
      setExpandedGroups(prev => new Set([...prev, groupUuid]))
    }
  }, [groupModalParentUuid, createSubGroup, createGroup])

  /**
   * Закрывает модальное окно и очищает временное состояние.
   */
  const handleGroupModalClose = React.useCallback(() => {
    setGroupModalOpened(false)
    setGroupModalParentUuid(null)
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

  /**
   * Инициирует перетаскивание примитива. Если перетаскиваемый элемент
   * входит в набор выделенных, в состояние заносятся UUID всех выделенных
   * примитивов, иначе — только текущий примитив.
   * @param e объект события перетаскивания
   * @param primitiveUuid UUID примитива, с которого начато перетаскивание
   */
  const handlePrimitiveDragStart = React.useCallback(
    (e: React.DragEvent, primitiveUuid: string) => {
      const selectedUuids = selectedPrimitiveIds.map(index => primitives[index].uuid)
      const uuidsToDrag = selectedUuids.includes(primitiveUuid)
        ? selectedUuids
        : [primitiveUuid]

      setDraggedItem({ type: 'primitive', uuids: uuidsToDrag })
      e.dataTransfer.effectAllowed = 'move'
    },
    [selectedPrimitiveIds, primitives]
  )

  /**
   * Инициирует перетаскивание группы. Если перетаскиваемая группа
   * присутствует в текущем выделении, в состояние помещаются UUID всех
   * выбранных групп, иначе — только перетаскиваемая группа.
   * @param e объект события перетаскивания
   * @param groupUuid UUID группы, с которой начато перетаскивание
   */
  const handleGroupDragStart = React.useCallback(
    (e: React.DragEvent, groupUuid: string) => {
      const uuidsToDrag = selectedGroupUuids.includes(groupUuid)
        ? selectedGroupUuids
        : [groupUuid]

      setDraggedItem({ type: 'group', uuids: uuidsToDrag })
      e.dataTransfer.effectAllowed = 'move'
    },
    [selectedGroupUuids]
  )

  /**
   * Разрешает сброс и подсвечивает текущую цель перетаскивания.
   * @param e объект события перетаскивания
   * @param targetGroupUuid UUID целевой группы
   */
  const handleDragOver = React.useCallback((e: React.DragEvent, targetGroupUuid?: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(targetGroupUuid || 'ungrouped')
  }, [])

  /**
   * Сбрасывает подсветку потенциальной зоны сброса при выходе курсора.
   */
  const handleDragLeave = React.useCallback(() => {
    setDropTarget(null)
  }, [])

  /**
   * Завершает операцию перетаскивания. В зависимости от типа
   * перетаскиваемого элемента назначает примитивы группе либо
   * перемещает группы в новую родительскую группу.
   * При перемещении примитивов пересчитывает их координаты.
   * @param e объект события сброса
   * @param targetGroupUuid UUID целевой группы или undefined для корня
   */
  const handleDrop = React.useCallback(
    (e: React.DragEvent, targetGroupUuid?: string) => {
      e.preventDefault()

      if (!draggedItem) return

      if (draggedItem.type === 'primitive') {
        draggedItem.uuids.forEach(primitiveUuid => {
          // Получаем текущую группу примитива
          const fromGroupUuid = primitiveGroupAssignments[primitiveUuid] || null
          const toGroupUuid = targetGroupUuid && targetGroupUuid !== 'ungrouped' ? targetGroupUuid : null
          
          // Пересчитываем координаты при перемещении между группами
          if (fromGroupUuid !== toGroupUuid) {
            const updatedPrimitive = movePrimitiveToGroup(
              primitiveUuid,
              fromGroupUuid,
              toGroupUuid,
              primitives,
              groups
            )
            
            if (updatedPrimitive) {
              // Находим индекс примитива для обновления
              const primitiveIndex = primitives.findIndex(p => p.uuid === primitiveUuid)
              if (primitiveIndex !== -1) {
                // Передаём только изменения в transform, не весь примитив
                updatePrimitive(primitiveIndex, { transform: updatedPrimitive.transform })
              }
            }
          }
          
          // Обновляем привязку к группе
          if (toGroupUuid) {
            assignPrimitiveToGroup(primitiveUuid, toGroupUuid)
          } else {
            removePrimitiveFromGroup(primitiveUuid)
          }
        })
      } else if (draggedItem.type === 'group') {
        const newParent = targetGroupUuid && targetGroupUuid !== 'ungrouped'
          ? targetGroupUuid
          : undefined
        draggedItem.uuids
          .filter(uuid => uuid !== targetGroupUuid)
          .forEach(uuid => moveGroup(uuid, newParent))
      }

      setDraggedItem(null)
      setDropTarget(null)
    },
    [draggedItem, assignPrimitiveToGroup, removePrimitiveFromGroup, moveGroup, primitiveGroupAssignments, primitives, groups, updatePrimitive]
  )

  /**
   * Обработчик наведения на примитив, передающий событие в общий
   * обработчик для поддержки областей без группы.
   * @param e объект события перетаскивания
   */
  const handlePrimitiveDragOver = React.useCallback((e: React.DragEvent) => {
    handleDragOver(e)
  }, [handleDragOver])

  /**
   * Обработчик сброса в область "без группы", удаляет привязку
   * всех перетаскиваемых примитивов к группам.
   * @param e объект события сброса
   */
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
      onDragStart={handlePrimitiveDragStart}
      dragOver={handlePrimitiveDragOver}
      isDropTarget={false}
    />
  ), [
    selectedPrimitiveIds,
    hoveredPrimitiveId,
    handlePrimitiveSelect,
    handlePrimitiveHover,
    togglePrimitiveVisibility,
    removePrimitive,
    handlePrimitiveDragStart,
    handlePrimitiveDragOver
  ])

  /**
   * Рекурсивно рендерит узел дерева групп вместе с принадлежащими ему примитивами.
   * @param node узел дерева групп
   */
  const renderGroupNode = (node: GroupTreeNode): React.ReactNode => {
    const primitivesInGroup = primitives.filter(
      p => primitiveGroupAssignments[p.uuid] === node.group.uuid
    )

    return (
      <PrimitiveGroupItem
        key={node.group.uuid}
        group={node.group}
        isExpanded={expandedGroups.has(node.group.uuid)}
        isSelected={selectedGroupUuids.includes(node.group.uuid)}
        primitiveCount={primitivesInGroup.length}
        level={node.depth}
        onToggleExpand={handleToggleGroupExpand}
        onSelect={handleSelectGroup}
        onRename={renameGroup}
        onDelete={handleDeleteGroup}
        onCreateSubGroup={handleCreateSubGroup}
        onCreateGroup={handleCreateGroup}
        onToggleVisibility={handleToggleGroupVisibility}
        onDragStart={(e) => handleGroupDragStart(e, node.group.uuid)}
        onDragOver={(e) => handleDragOver(e, node.group.uuid)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, node.group.uuid)}
        isDropTarget={dropTarget === node.group.uuid}
      >
        <Stack gap="xs">
          {node.children.map(renderGroupNode)}
          {primitivesInGroup.map(primitive => {
            const originalIndex = primitives.findIndex(p => p.uuid === primitive.uuid)
            return renderPrimitive(primitive, originalIndex)
          })}
        </Stack>
      </PrimitiveGroupItem>
    )
  }

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
            {groupTree.map(renderGroupNode)}

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
                {ungroupedPrimitives.map(primitive => {
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
                      onDragStart={handlePrimitiveDragStart}
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
        initialName=""
        title={groupModalParentUuid ? 'Новая подгруппа' : 'Новая группа'}
        confirmLabel="Создать"
        onClose={handleGroupModalClose}
        onSubmit={handleGroupModalSubmit}
      />
    </>
  )
}
