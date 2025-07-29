import React, { memo } from 'react'
import { Group, Button, Select, Menu, ActionIcon, Tooltip } from '@mantine/core'
import { IconPlayerPlay, IconCode, IconDeviceFloppy, IconFolderOpen, IconDotsVertical, IconEdit, IconTrash } from '@tabler/icons-react'
import type { ScriptRecord } from '@/shared/lib/database'
import type { LanguageMode } from '../constants/scriptTemplates'

interface ToolbarPanelProps {
  languageMode: LanguageMode
  onLanguageModeChange: (mode: LanguageMode) => void
  onNewScript: () => void
  savedScripts: ScriptRecord[]
  selectedScriptUuid: string | null
  onLoadScript: (uuid: string) => void
  onSaveScript: () => void
  onEditScript: () => void
  onDeleteScript: (uuid: string) => void
  onExecuteScript: () => void
}

export const ToolbarPanel = memo<ToolbarPanelProps>(({
  languageMode,
  onLanguageModeChange,
  onNewScript,
  savedScripts,
  selectedScriptUuid,
  onLoadScript,
  onSaveScript,
  onEditScript,
  onDeleteScript,
  onExecuteScript
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

        <Select
          size="xs"
          value={languageMode}
          onChange={(value) => onLanguageModeChange(value as LanguageMode)}
          data={[
            { value: 'javascript', label: 'JavaScript' },
            { value: 'typescript', label: 'TypeScript' }
          ]}
          leftSection={<IconCode size={14} />}
          style={{ minWidth: 120 }}
        />

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