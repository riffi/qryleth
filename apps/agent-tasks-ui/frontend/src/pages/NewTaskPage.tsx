/**
 * Страница создания новой агентской задачи
 */
import { useState } from 'react'
import { Container, Stack, Title, Paper, TextInput, TagsInput, Button, Group, Alert, Text, Box } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconDeviceFloppy, IconAlertCircle, IconArrowLeft } from '@tabler/icons-react'
import { createTask } from '../services/apiService'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'

interface NewTaskForm {
  title: string
  tags: string[]
  content: string
}

/**
 * Формирует стартовый шаблон Markdown для новой задачи
 */
function makeDefaultContent(title: string) {
  const safeTitle = title && title.trim().length > 0 ? title.trim() : 'Новая задача'
  return `# ${safeTitle}

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)

## Цели
- Опишите цели задачи

## Контекст
Кратко опишите контекст задачи.

## Список фаз

### ⏳ Фаза 1: Инициация
- Сформировать детали задачи и критерии готовности`
}

export function NewTaskPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Форма создания задачи
  const form = useForm<NewTaskForm>({
    initialValues: {
      title: '',
      tags: [],
      content: makeDefaultContent('')
    },
    validate: {
      title: (value) => {
        if (!value || value.trim().length < 3) return 'Название должно содержать минимум 3 символа'
        if (value.trim().length > 200) return 'Название не должно превышать 200 символов'
        return null
      },
      tags: (value) => {
        if (value.length > 10) return 'Максимум 10 тегов'
        for (const tag of value) {
          if (tag.length > 50) return 'Тег не должен превышать 50 символов'
          if (!/^[a-zA-Z0-9а-яёА-ЯЁ\-_]+$/.test(tag)) return 'Теги: буквы/цифры/дефисы/подчеркивания'
        }
        return null
      },
      content: (value) => {
        if (!value || value.trim().length < 10) return 'Контент должен содержать минимум 10 символов'
        if (value.length > 50000) return 'Контент не должен превышать 50000 символов'
        return null
      }
    }
  })

  /**
   * Извлекает контент без YAML-шапки (на случай, если пользователь вставит её вручную)
   */
  const getContentWithoutYaml = (content: string): string => {
    const lines = content.split('\n')
    let startIndex = 0
    if (lines[0] === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') { startIndex = i + 1; break }
      }
    }
    return lines.slice(startIndex).join('\n').trim()
  }

  /**
   * Обработчик создания задачи
   */
  const handleCreate = async () => {
    const validation = form.validate()
    if (validation.hasErrors) {
      notifications.show({ title: 'Ошибка валидации', message: 'Проверьте форму', color: 'red' })
      return
    }

    try {
      setSaving(true)
      setError(null)
      const result = await createTask({
        title: form.values.title,
        tags: form.values.tags,
        content: getContentWithoutYaml(form.values.content),
        epic: null
      })
      notifications.show({ title: 'Задача создана', message: `ID ${result.id}`, color: 'green' })
      navigate(`/tasks/${result.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка создания задачи'
      setError(message)
      notifications.show({ title: 'Ошибка', message, color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    // Контейнер растянут по ширине аналогично странице редактирования задачи
    <Container size="xl" style={{ width: '100%', maxWidth: 'none' }}>
      <Stack gap="md">
        <Group justify="space-between">
          <Button variant="light" leftSection={<IconArrowLeft />} onClick={() => navigate('/tasks')}>
            Назад к списку
          </Button>
          <Title order={2}>Новая задача</Title>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Ошибка" color="red">{error}</Alert>
        )}

        <Paper withBorder p="lg" shadow="sm">
          <Stack gap="md">
            <TextInput label="Название задачи" placeholder="Например: Импорт моделей из CAD" {...form.getInputProps('title')} />

            {/* Ввод тегов через специализированный компонент Mantine */}
            <TagsInput
              label="Теги"
              placeholder="Введите тег и нажмите Enter"
              splitChars={[',', ' ']}
              maxTags={10}
              clearable
              {...form.getInputProps('tags')}
            />

            <Stack gap="xs">
              <Text size="sm" fw={500}>Markdown содержимое (без YAML шапки)</Text>
              <Box style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8, overflow: 'hidden' }}>
                <Editor
                  width="100%"
                  height="400px"
                  language="markdown"
                  theme="vs"
                  value={form.values.content}
                  onChange={(val) => form.setFieldValue('content', val || '')}
                  options={{ minimap: { enabled: false }, wordWrap: 'on', fontSize: 14 }}
                />
              </Box>
            </Stack>

            <Group justify="flex-end">
              <Button leftSection={<IconDeviceFloppy />} loading={saving} onClick={handleCreate} color="green">
                Создать задачу
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}

export default NewTaskPage
