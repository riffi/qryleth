import { useEffect, useState } from 'react'
import { Modal, Button, TextInput, Stack, Group, Paper, ActionIcon, Text, Select } from '@mantine/core'
import { IconPlus, IconTrash, IconCheck, IconEdit } from '@tabler/icons-react'
import { nanoid } from 'nanoid'
import {
  getAllConnections,
  saveConnections,
  setActiveConnection
} from '../utils/openAISettings'
import type { OpenAISettingsConnection } from '../utils/openAISettings'

const PROVIDER_URLS = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions'
} as const

interface Props {
  opened: boolean
  onClose: () => void
}

export const OpenAISettingsModal: React.FC<Props> = ({ opened, onClose }) => {
  const [connections, setConnections] = useState<OpenAISettingsConnection[]>([])
  const [activeId, setActiveId] = useState<string | undefined>()
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (opened) {
      getAllConnections().then(data => {
        setConnections(data.connections)
        setActiveId(data.activeId)
      })
    }
  }, [opened])

  const handleAdd = () => {
    const id = nanoid()
    setConnections(prev => [
      ...prev,
      {
        id,
        name: 'New',
        provider: 'openrouter',
        url: PROVIDER_URLS.openrouter,
        model: '',
        apiKey: ''
      }
    ])
    setEditingId(id)
  }

  const handleSave = async () => {
    await saveConnections(connections, activeId)
    if (activeId) await setActiveConnection(activeId)
    onClose()
  }

  const handleRemove = (id: string) => {
    setConnections(prev => prev.filter(g => g.id !== id))
    if (activeId === id) {
      setActiveId(undefined)
    }
    if (editingId === id) {
      setEditingId(null)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="OpenAI API Settings" fullScreen>
      <Stack>
        {connections.map(g => (
          <Paper key={g.id} withBorder p="md">
            <Group justify="space-between" align="center">
              <Group>
                <Text fw={500}>{g.name}</Text>
                <Button
                  size="xs"
                  variant={activeId === g.id ? 'filled' : 'outline'}
                  onClick={() => setActiveId(g.id)}
                  leftSection={<IconCheck size="0.9rem" />}
                >
                  Активировать
                </Button>
              </Group>
              <Group>
                <ActionIcon variant="subtle" color="blue" onClick={() => setEditingId(g.id)}>
                  <IconEdit size="1rem" />
                </ActionIcon>
                <ActionIcon color="red" variant="subtle" onClick={() => handleRemove(g.id)}>
                  <IconTrash size="1rem" />
                </ActionIcon>
              </Group>
            </Group>

            {editingId === g.id && (
              <Stack gap="xs" mt="xs">
                <TextInput
                  label="Название"
                  value={g.name}
                  onChange={e => {
                    const val = e.currentTarget.value
                    setConnections(prev => prev.map(it => it.id === g.id ? { ...it, name: val } : it))
                  }}
                />
                <Select
                  label="Провайдер"
                  data={[
                    { value: 'openrouter', label: 'OpenRouter' },
                    { value: 'openai', label: 'OpenAi' },
                    { value: 'compatible', label: 'OpenAi compatible provider' }
                  ]}
                  value={g.provider}
                  onChange={(val) => {
                    const provider = (val ?? 'openrouter') as OpenAISettingsConnection['provider']
                    setConnections(prev => prev.map(it => it.id === g.id ? {
                      ...it,
                      provider,
                      url: provider === 'compatible' ? it.url : PROVIDER_URLS[provider]
                    } : it))
                  }}
                />
                <TextInput
                  label="OPENAI_URL"
                  value={g.url}
                  disabled={g.provider !== 'compatible'}
                  onChange={e => {
                    const val = e.currentTarget.value
                    setConnections(prev => prev.map(it => it.id === g.id ? { ...it, url: val } : it))
                  }}
                />
                <TextInput
                  label="OPENAI_MODEL"
                  value={g.model}
                  onChange={e => {
                    const val = e.currentTarget.value
                    setConnections(prev => prev.map(it => it.id === g.id ? { ...it, model: val } : it))
                  }}
                />
                <TextInput
                  label="OPENAI_API_KEY"
                  value={g.apiKey}
                  onChange={e => {
                    const val = e.currentTarget.value
                    setConnections(prev => prev.map(it => it.id === g.id ? { ...it, apiKey: val } : it))
                  }}
                />
                <Group justify="flex-end">
                  <Button size="xs" onClick={() => setEditingId(null)}>Готово</Button>
                </Group>
              </Stack>
            )}
          </Paper>
        ))}
        <Button leftSection={<IconPlus size="1rem" />} variant="light" onClick={handleAdd}>
          Добавить соединение с LLM
        </Button>
        <Group justify="flex-end">
          <Button onClick={handleSave}>Сохранить</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
