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
   * Набор доступных шаблонов: ключ — название, значение — текст скрипта
   */
  templates?: Record<string, string>
  /** Применить шаблон по названию */
  onApplyTemplate?: (name: string) => void
}

export const ToolbarPanel = memo<ToolbarPanelProps>(({ 
  onNewScript,
  savedScripts,
  selectedScriptUuid,
  onLoadScript,
  onSaveScript,
  onEditScript,
  onDeleteScript,
  onExecuteScript,
  templates,
  onApplyTemplate
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

        {templates && Object.keys(templates).length > 0 && (
          <Menu shadow="md" width={260}>
            <Menu.Target>
              <Button size="xs" variant="light">Шаблоны</Button>
            </Menu.Target>
            <Menu.Dropdown>
              {Object.keys(templates).map(name => (
                <Menu.Item key={name} onClick={() => onApplyTemplate && onApplyTemplate(name)}>
                  {name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        )}

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
