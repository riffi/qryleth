import React from 'react'
import { ActionIcon, Tooltip, Stack } from '@mantine/core'
import { EdgeToolbar } from '@/shared/ui'
import { IconFolder, IconTrees, IconLeaf, IconCube } from '@tabler/icons-react'

interface RightToolbarProps {
  /** Свёрнут ли менеджер объектов (правая панель). true = менеджер скрыт. */
  managerCollapsed: boolean
  /** Переключить видимость правой панели (менеджер объектов). */
  onToggleManager: () => void
  /** Свёрнут ли генератор деревьев (правая панель). true = панель скрыта. */
  generatorCollapsed?: boolean
  /** Переключить видимость правой панели (генератор деревьев). */
  onToggleGenerator?: () => void
  /** Свёрнут ли генератор деревьев ez-tree (правая панель). true = панель скрыта. */
  ezTreeGeneratorCollapsed?: boolean
  /** Переключить видимость правой панели (генератор ez-tree). */
  onToggleEzTreeGenerator?: () => void
  /** Свёрнут ли генератор травы (правая панель). true = панель скрыта. */
  grassGeneratorCollapsed?: boolean
  /** Переключить видимость правой панели (генератор травы). */
  onToggleGrassGenerator?: () => void
  /** Свёрнут ли генератор камня (правая панель). true = панель скрыта. */
  rockGeneratorCollapsed?: boolean
  /** Переключить видимость правой панели (генератор камня). */
  onToggleRockGenerator?: () => void
}

/**
 * Правый тулбар ObjectEditor: управление панелью менеджера объектов.
 * Визуально и по UX согласован с тулбаром SceneEditor.
 */
export const RightToolbar: React.FC<RightToolbarProps> = ({ managerCollapsed, onToggleManager, generatorCollapsed, onToggleGenerator, ezTreeGeneratorCollapsed, onToggleEzTreeGenerator, grassGeneratorCollapsed, onToggleGrassGenerator, rockGeneratorCollapsed, onToggleRockGenerator }) => {
  return (
    <EdgeToolbar side={'right'}>
      <Stack gap={2} align="center">
        <Tooltip label={managerCollapsed ? 'Открыть менеджер' : 'Закрыть менеджер'} position="left" withArrow>
          <ActionIcon
            size="lg"
            variant={!managerCollapsed ? 'filled' : 'subtle'}
            color={!managerCollapsed ? 'blue' : 'gray'}
            onClick={onToggleManager}
            aria-label={managerCollapsed ? 'Открыть менеджер' : 'Закрыть менеджер'}
            style={{ borderRadius: 4, transition: 'all 200ms ease' }}
          >
            <IconFolder size={20} />
          </ActionIcon>
        </Tooltip>
        {onToggleGenerator && (
          <Tooltip label={generatorCollapsed ? 'Открыть генератор деревьев' : 'Закрыть генератор деревьев'} position="left" withArrow>
            <ActionIcon
              size="lg"
              variant={!generatorCollapsed ? 'filled' : 'subtle'}
              color={!generatorCollapsed ? 'green' : 'gray'}
              onClick={onToggleGenerator}
              aria-label={generatorCollapsed ? 'Открыть генератор деревьев' : 'Закрыть генератор деревьев'}
              style={{ borderRadius: 4, transition: 'all 200ms ease' }}
            >
              <IconTrees size={20} />
            </ActionIcon>
          </Tooltip>
        )}
        {onToggleEzTreeGenerator && (
          <Tooltip label={ezTreeGeneratorCollapsed ? 'Открыть генератор дерева (ez-tree)' : 'Закрыть генератор дерева (ez-tree)'} position="left" withArrow>
            <ActionIcon
              size="lg"
              variant={!ezTreeGeneratorCollapsed ? 'filled' : 'subtle'}
              color={!ezTreeGeneratorCollapsed ? 'lime' : 'gray'}
              onClick={onToggleEzTreeGenerator}
              aria-label={ezTreeGeneratorCollapsed ? 'Открыть генератор дерева (ez-tree)' : 'Закрыть генератор дерева (ez-tree)'}
              style={{ borderRadius: 4, transition: 'all 200ms ease' }}
            >
              <IconTrees size={20} />
            </ActionIcon>
          </Tooltip>
        )}
        {onToggleGrassGenerator && (
          <Tooltip label={grassGeneratorCollapsed ? 'Открыть генератор травы' : 'Закрыть генератор травы'} position="left" withArrow>
            <ActionIcon
              size="lg"
              variant={!grassGeneratorCollapsed ? 'filled' : 'subtle'}
              color={!grassGeneratorCollapsed ? 'teal' : 'gray'}
              onClick={onToggleGrassGenerator}
              aria-label={grassGeneratorCollapsed ? 'Открыть генератор травы' : 'Закрыть генератор травы'}
              style={{ borderRadius: 4, transition: 'all 200ms ease' }}
            >
              <IconLeaf size={20} />
            </ActionIcon>
          </Tooltip>
        )}
        {onToggleRockGenerator && (
          <Tooltip label={rockGeneratorCollapsed ? 'Открыть генератор камня' : 'Закрыть генератор камня'} position="left" withArrow>
            <ActionIcon
              size="lg"
              variant={!rockGeneratorCollapsed ? 'filled' : 'subtle'}
              color={!rockGeneratorCollapsed ? 'gray' : 'gray'}
              onClick={onToggleRockGenerator}
              aria-label={rockGeneratorCollapsed ? 'Открыть генератор камня' : 'Закрыть генератор камня'}
              style={{ borderRadius: 4, transition: 'all 200ms ease' }}
            >
              <IconCube size={20} />
            </ActionIcon>
          </Tooltip>
        )}
      </Stack>
    </EdgeToolbar>
  )
}
