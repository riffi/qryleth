import React, { memo } from 'react'
import { Group, Button, Select, Menu, ActionIcon, Tooltip } from '@mantine/core'
import { IconPlayerPlay, IconDeviceFloppy, IconFolderOpen, IconDotsVertical, IconEdit, IconTrash } from '@tabler/icons-react'
import type { ScriptRecord } from '@/shared/lib/database'

interface ToolbarPanelProps {
  onNewScript: () => void
  savedScripts: ScriptRecord[]
  selectedScriptUuid: string | null
  onLoadScript: (uuid: string) => void
  onSaveScript: () => void
  onEditScript: () => void
  onDeleteScript: (uuid: string) => void
  onExecuteScript: () => void
  /**
   * Открыть полноэкранный выбор шаблонов. Ранее использовалось выпадающее меню —
   * теперь открываем модальное окно с группами слева и карточками справа.
   */
  onOpenTemplatePicker: () => void
}

/**
 * Панель инструментов панели скриптинга.
 * 
 * Отвечает за быстрые действия пользователя: создание нового скрипта,
 * загрузку/сохранение, удаление и выполнение скриптов. Также предоставляет
 * кнопку открытия полноэкранного выбора шаблонов.
 */
export const ToolbarPanel = memo<ToolbarPanelProps>(({ 
  onNewScript,
  savedScripts,
  selectedScriptUuid,
  onLoadScript,
  onSaveScript,
  onEditScript,
  onDeleteScript,
  onExecuteScript,
  onOpenTemplatePicker
}) => {
  return (
    <Group justify="space-between" p="sm" bg="gray.9">
      <Group gap="xs">
        <Button
          size="xs"
          variant="light"
          onClick={onNewScript}
        >
          Новый
        </Button>

        {/* Кнопка выбора шаблонов открывает полноэкранное модальное окно */}
        <Button size="xs" variant="light" onClick={onOpenTemplatePicker}>Шаблоны</Button>

        <Select
          placeholder="Загрузить скрипт"
          data={savedScripts.map(script => ({
            value: script.uuid,
            label: script.name
          }))}
          value={selectedScriptUuid}
          onChange={(value) => value && onLoadScript(value)}
          size="xs"
          style={{ minWidth: 150 }}
          leftSection={<IconFolderOpen size={14} />}
          clearable
        />

        {selectedScriptUuid && (
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon size="sm" variant="light">
                <IconDotsVertical size={14} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item 
                leftSection={<IconEdit size={14} />}
                onClick={onEditScript}
              >
                Переименовать
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={() => onDeleteScript(selectedScriptUuid)}
              >
                Удалить
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      <Group gap="xs">
        <Tooltip label="Сохранить скрипт">
          <Button
            size="xs"
            leftSection={<IconDeviceFloppy size={14} />}
            onClick={onSaveScript}
            variant="light"
          >
            Сохранить
          </Button>
        </Tooltip>

        <Tooltip label="Выполнить скрипт (Ctrl+Enter)">
          <Button
            size="xs"
            leftSection={<IconPlayerPlay size={14} />}
            onClick={onExecuteScript}
            variant="filled"
          >
            Выполнить
          </Button>
        </Tooltip>
      </Group>
    </Group>
  )
})
