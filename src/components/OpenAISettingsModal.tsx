import { useEffect, useState } from 'react'
import { Modal, Button, TextInput, Stack, Group, Paper, ActionIcon } from '@mantine/core'
import { IconPlus, IconTrash, IconCheck } from '@tabler/icons-react'
import { nanoid } from 'nanoid'
import {
  getAllGroups,
  saveGroups,
  setActiveGroup
} from '../utils/openAISettings'
import type { OpenAISettingsGroup } from '../utils/openAISettings'

interface Props {
  opened: boolean
  onClose: () => void
}

export const OpenAISettingsModal: React.FC<Props> = ({ opened, onClose }) => {
  const [groups, setGroups] = useState<OpenAISettingsGroup[]>([])
  const [activeId, setActiveId] = useState<string | undefined>()

  useEffect(() => {
    if (opened) {
      const data = getAllGroups()
      setGroups(data.groups)
      setActiveId(data.activeId)
    }
  }, [opened])

  const handleAdd = () => {
    setGroups(prev => [
      ...prev,
      {
        id: nanoid(),
        name: 'New',
        url: '',
        model: '',
        apiKey: ''
      }
    ])
  }

  const handleSave = () => {
    saveGroups(groups, activeId)
    if (activeId) setActiveGroup(activeId)
    onClose()
  }

  const handleRemove = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id))
    if (activeId === id) {
      setActiveId(undefined)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="OpenAI API Settings" size="lg">
      <Stack>
        {groups.map(g => (
          <Paper key={g.id} withBorder p="md">
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <TextInput
                  label="Название"
                  value={g.name}
                  onChange={e => {
                    const val = e.currentTarget.value
                    setGroups(prev => prev.map(it => it.id === g.id ? { ...it, name: val } : it))
                  }}
                />
                <Button
                  size="xs"
                  variant={activeId === g.id ? 'filled' : 'outline'}
                  onClick={() => setActiveId(g.id)}
                  leftSection={<IconCheck size="0.9rem" />}
                >
                  Активировать
                </Button>
                <ActionIcon color="red" variant="subtle" onClick={() => handleRemove(g.id)}>
                  <IconTrash size="1rem" />
                </ActionIcon>
              </Group>
              <TextInput
                label="OPENAI_URL"
                value={g.url}
                onChange={e => {
                  const val = e.currentTarget.value
                  setGroups(prev => prev.map(it => it.id === g.id ? { ...it, url: val } : it))
                }}
              />
              <TextInput
                label="OPENAI_MODEL"
                value={g.model}
                onChange={e => {
                  const val = e.currentTarget.value
                  setGroups(prev => prev.map(it => it.id === g.id ? { ...it, model: val } : it))
                }}
              />
              <TextInput
                label="OPENAI_API_KEY"
                value={g.apiKey}
                onChange={e => {
                  const val = e.currentTarget.value
                  setGroups(prev => prev.map(it => it.id === g.id ? { ...it, apiKey: val } : it))
                }}
              />
            </Stack>
          </Paper>
        ))}
        <Button leftSection={<IconPlus size="1rem" />} variant="light" onClick={handleAdd}>
          Добавить группу
        </Button>
        <Group justify="flex-end">
          <Button onClick={handleSave}>Сохранить</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
