import React, { useMemo, useState } from 'react'
import { Modal, Box, ScrollArea, NavLink, Group, Text, Button, Card, Title } from '@mantine/core'
import type { TemplateGroup, TemplateData } from '../templates/types'

interface TemplatePickerModalProps {
  /**
   * Признак открытия модального окна. Если true — окно занимает всю ширину/высоту экрана.
   */
  opened: boolean
  /** Закрыть модальное окно выбора. */
  onClose: () => void
  /** Список групп с шаблонами: слева — группы, справа — карточки шаблонов. */
  groups: TemplateGroup[]
  /** Колбэк при выборе шаблона — возвращает код шаблона. */
  onSelect: (template: TemplateData) => void
}

/**
 * Полноэкранный выбор шаблонов скриптов с левой навигацией по группам
 * и правым списком карточек шаблонов (имя + краткое описание).
 * На десктопе быстрее ориентироваться, чем через длинное выпадающее меню.
 */
/**
 * Компонент модального окна выбора шаблонов.
 * 
 * Содержит двухколоночный лэйаут: слева список групп, справа — карточки шаблонов.
 * Выбор шаблона вызывает колбэк `onSelect`, передавая данные шаблона.
 */
export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({ opened, onClose, groups, onSelect }) => {
  // Активная группа — по умолчанию первая.
  const [activeGroupId, setActiveGroupId] = useState<string>(() => groups[0]?.id ?? '')

  const activeGroup = useMemo(() => groups.find(g => g.id === activeGroupId) ?? groups[0], [groups, activeGroupId])

  return (
    <Modal opened={opened} onClose={onClose} fullScreen withCloseButton title={<Title order={4}>Выбор шаблона</Title>}>
      <Box style={{ display: 'flex', height: '100%' }}>
        {/* Левая колонка: список групп */}
        <Box style={{ width: 260, borderRight: '1px solid var(--mantine-color-dark-5)' }}>
          <ScrollArea h="100%">
            {groups.map(group => (
              <NavLink
                key={group.id}
                label={group.title}
                active={group.id === activeGroupId}
                onClick={() => setActiveGroupId(group.id)}
              />
            ))}
          </ScrollArea>
        </Box>

        {/* Правая колонка: карточки шаблонов активной группы */}
        <Box style={{ flex: 1, padding: 'var(--mantine-spacing-md)' }}>
          <ScrollArea h="100%">
            <Group align="stretch" gap="md">
              {activeGroup?.templates.map(tpl => (
                <Card key={tpl.id} withBorder shadow="sm" style={{ width: 380 }}>
                  <Text fw={600}>{tpl.name}</Text>
                  <Text c="dimmed" size="sm" mt={6}>{tpl.description}</Text>
                  <Group mt="md" justify="space-between">
                    <Button size="xs" variant="light" onClick={() => onSelect(tpl)}>Выбрать</Button>
                  </Group>
                </Card>
              ))}
            </Group>
          </ScrollArea>
        </Box>
      </Box>
    </Modal>
  )
}
