import React from 'react'
import { Stack, Text } from '@mantine/core'
import { PrimitiveGroupItem } from './PrimitiveGroupItem'
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxPrimitiveGroup, GroupTreeNode } from '@/entities/primitiveGroup'

interface GroupTreeProps {
  groups: Record<string, GfxPrimitiveGroup>
  primitives: GfxPrimitive[]
  primitiveGroupAssignments: Record<string, string>
  groupTree: GroupTreeNode[]
  expandedGroups: Set<string>
  selectedGroupUuids: string[]
  onToggleExpand: (groupUuid: string) => void
  onSelectGroup: (groupUuid: string, event?: React.MouseEvent) => void
  onRenameGroup: (groupUuid: string, newName: string) => void
  onDeleteGroup: (groupUuid: string) => void
  onCreateSubGroup: (parentGroupUuid: string) => void
  onCreateGroup: () => void
  onToggleGroupVisibility: (groupUuid: string) => void
  renderPrimitive: (primitive: GfxPrimitive, index: number) => React.ReactNode
  onGroupDragStart?: (e: React.DragEvent, groupUuid: string) => void
  onDragOver?: (e: React.DragEvent, targetGroupUuid: string) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent, targetGroupUuid: string) => void
  dropTarget?: string | null
}

interface GroupTreeNodeProps {
  node: GroupTreeNode
  groups: Record<string, GfxPrimitiveGroup>
  primitives: GfxPrimitive[]
  primitiveGroupAssignments: Record<string, string>
  expandedGroups: Set<string>
  selectedGroupUuids: string[]
  level: number
  onToggleExpand: (groupUuid: string) => void
  onSelectGroup: (groupUuid: string, event?: React.MouseEvent) => void
  onRenameGroup: (groupUuid: string, newName: string) => void
  onDeleteGroup: (groupUuid: string) => void
  onCreateSubGroup: (parentGroupUuid: string) => void
  onCreateGroup: () => void
  onToggleGroupVisibility: (groupUuid: string) => void
  renderPrimitive: (primitive: GfxPrimitive, index: number) => React.ReactNode
  onGroupDragStart?: (e: React.DragEvent, groupUuid: string) => void
  onDragOver?: (e: React.DragEvent, targetGroupUuid: string) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent, targetGroupUuid: string) => void
  dropTarget?: string | null
}

const GroupTreeNodeComponent = React.memo<GroupTreeNodeProps>(({
  node,
  groups,
  primitives,
  primitiveGroupAssignments,
  expandedGroups,
  selectedGroupUuids,
  level,
  onToggleExpand,
  onSelectGroup,
  onRenameGroup,
  onDeleteGroup,
  onCreateSubGroup,
  onCreateGroup,
  onToggleGroupVisibility,
  renderPrimitive,
  onGroupDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dropTarget
}) => {
  const group = node.group
  if (!group) return null

  // Memoize primitives for this group to prevent recalculation
  const groupPrimitives = React.useMemo(() => 
    primitives.filter(primitive => 
      primitiveGroupAssignments[primitive.uuid] === group.uuid
    ), [primitives, primitiveGroupAssignments, group.uuid]
  )

  // Memoize total primitive count calculation
  const totalPrimitiveCount = React.useMemo(() => {
    const getTotalPrimitiveCount = (nodeToCount: GroupTreeNode): number => {
      const directPrimitives = primitives.filter(primitive => 
        primitiveGroupAssignments[primitive.uuid] === nodeToCount.group.uuid
      ).length
      
      const childPrimitives = nodeToCount.children.reduce((sum, child) => 
        sum + getTotalPrimitiveCount(child), 0
      )
      
      return directPrimitives + childPrimitives
    }
    
    return getTotalPrimitiveCount(node)
  }, [node, primitives, primitiveGroupAssignments])

  const isExpanded = expandedGroups.has(group.uuid)
  const isSelected = selectedGroupUuids.includes(group.uuid)

  return (
    <PrimitiveGroupItem
      group={group}
      isExpanded={isExpanded}
      isSelected={isSelected}
      primitiveCount={totalPrimitiveCount}
      level={level}
      onToggleExpand={onToggleExpand}
      onSelect={onSelectGroup}
      onRename={onRenameGroup}
      onDelete={onDeleteGroup}
      onCreateSubGroup={onCreateSubGroup}
      onCreateGroup={onCreateGroup}
      onToggleVisibility={onToggleGroupVisibility}
      onDragStart={onGroupDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      isDropTarget={dropTarget === group.uuid}
    >
      {isExpanded && (
        <Stack gap="xs">
          {/* Render primitives directly in this group */}
          {groupPrimitives.map((primitive, index) => {
            // Find the original index of this primitive in the full primitives array
            const originalIndex = primitives.findIndex(p => p.uuid === primitive.uuid)
            return renderPrimitive(primitive, originalIndex)
          })}

          {/* Render child groups */}
          {node.children.map(childNode => (
            <GroupTreeNodeComponent
              key={childNode.group.uuid}
              node={childNode}
              groups={groups}
              primitives={primitives}
              primitiveGroupAssignments={primitiveGroupAssignments}
              expandedGroups={expandedGroups}
              selectedGroupUuids={selectedGroupUuids}
              level={level + 1}
              onToggleExpand={onToggleExpand}
              onSelectGroup={onSelectGroup}
              onRenameGroup={onRenameGroup}
              onDeleteGroup={onDeleteGroup}
              onCreateSubGroup={onCreateSubGroup}
              onCreateGroup={onCreateGroup}
              onToggleGroupVisibility={onToggleGroupVisibility}
              renderPrimitive={renderPrimitive}
              onGroupDragStart={onGroupDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              dropTarget={dropTarget}
            />
          ))}

          {/* Show empty message if group has no content */}
          {groupPrimitives.length === 0 && node.children.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" py="sm" style={{ paddingLeft: '32px' }}>
              Пустая группа
            </Text>
          )}
        </Stack>
      )}
    </PrimitiveGroupItem>
  )
})

export const GroupTree = React.memo<GroupTreeProps>(({
  groups,
  primitives,
  primitiveGroupAssignments,
  groupTree,
  expandedGroups,
  selectedGroupUuids,
  onToggleExpand,
  onSelectGroup,
  onRenameGroup,
  onDeleteGroup,
  onCreateSubGroup,
  onCreateGroup,
  onToggleGroupVisibility,
  renderPrimitive,
  onGroupDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dropTarget
}) => {
  return (
    <Stack gap="xs">
      {groupTree.map(node => (
        <GroupTreeNodeComponent
          key={node.group.uuid}
          node={node}
          groups={groups}
          primitives={primitives}
          primitiveGroupAssignments={primitiveGroupAssignments}
          expandedGroups={expandedGroups}
          selectedGroupUuids={selectedGroupUuids}
          level={0}
          onToggleExpand={onToggleExpand}
          onSelectGroup={onSelectGroup}
          onRenameGroup={onRenameGroup}
          onDeleteGroup={onDeleteGroup}
          onCreateSubGroup={onCreateSubGroup}
          onCreateGroup={onCreateGroup}
          onToggleGroupVisibility={onToggleGroupVisibility}
          renderPrimitive={renderPrimitive}
          onGroupDragStart={onGroupDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          dropTarget={dropTarget}
        />
      ))}
    </Stack>
  )
})