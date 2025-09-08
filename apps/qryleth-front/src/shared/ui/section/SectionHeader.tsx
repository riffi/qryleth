import React from 'react'
import { Group, Text, Tooltip, ActionIcon } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'

export interface SectionHeaderProps {
  /** Заголовок секции */
  title: string
  /** Обработчик нажатия на кнопку «Добавить» (опционально) */
  onAdd?: () => void
  /** Подсказка для кнопки «Добавить» */
  addTooltip?: string
  /** Правый контент вместо стандартной кнопки (необязательно) */
  rightSlot?: React.ReactNode
}

/**
 * Чистый UI‑компонент заголовка секции со стандартной кнопкой «+».
 * Не содержит бизнес‑логики: принимает заголовок и колбэки извне.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, onAdd, addTooltip, rightSlot }) => {
  return (
    <Group justify="space-between" align="center">
      <Text size="xs" fw={500} c="dimmed">{title}</Text>
      <Group gap="xs">
        {rightSlot ?? (
          onAdd && (
            <Tooltip label={addTooltip ?? 'Добавить'}>
              <ActionIcon size="sm" variant="light" color="blue" onClick={onAdd}>
                <IconPlus size={14} />
              </ActionIcon>
            </Tooltip>
          )
        )}
      </Group>
    </Group>
  )
}

