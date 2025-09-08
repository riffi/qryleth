import React from 'react'
import { MemoTreeRow as TreeRow } from './TreeRow'
import type { TreeNodeBase } from './types'

export interface TreeListProps {
  /** Узлы дерева верхнего уровня */
  nodes: TreeNodeBase[]
  /** Множество ID развернутых узлов */
  expandedIds: Set<string>
  /** Переключить развёрнутость узла по ID */
  onToggleExpand: (id: string) => void
  /** Текущий уровень вложенности (служебный, для отступов) */
  level?: number
}

/**
 * Универсальный рекурсивный список-дерево, основанный на TreeRow.
 * Не содержит доменной логики; принимает готовые узлы и
 * информацию о том, какие id развернуты.
 */
export const TreeList: React.FC<TreeListProps> = ({ nodes, expandedIds, onToggleExpand, level = 0 }) => {
  return (
    <>
      {nodes.map((node) => {
        const expandable = !!(node.children && node.children.length > 0) || node.isExpandable
        const isExpanded = expandable && expandedIds.has(node.id)
        return (
          <React.Fragment key={node.id}>
            <TreeRow
              id={node.id}
              name={node.name}
              icon={node.icon}
              level={level}
              count={node.count}
              visible={node.visible}
              selected={node.selected}
              isExpandable={expandable}
              isExpanded={!!isExpanded}
              onToggleExpand={expandable ? () => onToggleExpand(node.id) : undefined}
              onClick={node.onClick}
              onToggleVisibility={node.onToggleVisibility}
              actions={node.actions}
              draggable={node.isDraggable}
              onDragStart={node.onDragStart}
              onDragOver={node.onDragOver}
              onDragLeave={node.onDragLeave}
              onDrop={node.onDrop}
              onContextMenu={node.onContextMenu}
              onMouseEnter={node.onMouseEnter}
              onMouseLeave={node.onMouseLeave}
            />
            {isExpanded && node.children && node.children.length > 0 && (
              <TreeList nodes={node.children} expandedIds={expandedIds} onToggleExpand={onToggleExpand} level={level + 1} />
            )}
          </React.Fragment>
        )
      })}
    </>
  )
}

