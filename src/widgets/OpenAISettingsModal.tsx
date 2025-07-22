import { useEffect, useState } from 'react'
import { Modal, Button, TextInput, Stack, Group, Paper, ActionIcon, Text, Select } from '@mantine/core'
import { IconPlus, IconTrash, IconCheck, IconEdit } from '@tabler/icons-react'
import { nanoid } from 'nanoid'
import {
  getAllConnections,
  setActiveConnection,
  upsertConnection,
  removeConnection,
  getProviderModels,
} from '@/shared/lib/openAISettings'
import type { OpenAISettingsConnection } from '@/shared/lib/openAISettings'

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

  // Добавляет новое соединение и переводит его в режим редактирования
  const handleAdd = () => {
    if (editingId !== null) return
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

  // Сохраняет выбор активного соединения
  const handleActivate = async (id: string) => {
    setActiveId(id)
    await setActiveConnection(id)
  }

  // Завершает редактирование и сохраняет изменения в хранилище
  const handleDone = async (id: string) => {
    setEditingId(null)
    const connection = connections.find(c => c.id === id)
    if (connection) {
      await upsertConnection(connection)
    }
  }

  // Удаляет соединение и синхронно обновляет хранилище
  const handleRemove = async (id: string) => {
    setConnections(prev => prev.filter(g => g.id !== id))
    await removeConnection(id)
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
                  onClick={() => handleActivate(g.id)}
                  leftSection={<IconCheck size="0.9rem" />}
                >
                  Активировать
                </Button>
              </Group>
              <Group>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  disabled={editingId !== null && editingId !== g.id}
                  onClick={() => setEditingId(g.id)}
                >
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
                <Select
                  label="Модель (из списка)"
                  data={getProviderModels(g.provider).map(m => ({ value: m, label: m }))}
                  value={g.model}
                  clearable
                  placeholder="Выберите модель"
                  onChange={val => {
                    if (val) {
                      setConnections(prev => prev.map(it => it.id === g.id ? { ...it, model: val } : it))
                    }
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
                  <Button size="xs" onClick={() => handleDone(g.id)}>Готово</Button>
                </Group>
              </Stack>
            )}
          </Paper>
        ))}
        <Button
          leftSection={<IconPlus size="1rem" />}
          variant="light"
          onClick={handleAdd}
          disabled={editingId !== null}
        >
          Добавить соединение с LLM
        </Button>
      </Stack>
    </Modal>
  )
}
