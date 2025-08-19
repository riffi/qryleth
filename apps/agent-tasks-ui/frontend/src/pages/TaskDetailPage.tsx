/**
 * Страница детального просмотра и редактирования агентской задачи
 */
import { useState, useEffect } from 'react'
// Подключаем тему подсветки (темная)
import 'highlight.js/styles/atom-one-dark.css'
import Editor from '@monaco-editor/react'
import {
  Container,
  Stack,
  Title,
  Paper,
  Group,
  Badge,
  Text,
  Button,
  TextInput,
  MultiSelect,
  LoadingOverlay,
  Alert,
  Tabs,
  Box,
  ActionIcon
} from '@mantine/core'
import {
  IconEdit,
  IconDeviceFloppy,
  IconX,
  IconAlertCircle,
  IconArrowLeft,
  IconCalendar,
  IconHash,
  IconTag,
  IconEye
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { AgentTask, getTaskById, updateTask } from '../services/apiService'
import { useNavigate, useParams } from 'react-router-dom'
import { PhaseReportModal } from '../components/PhaseReportModal'
import { EditableMarkdown } from '../components/EditableMarkdown'
/**
 * Компонент детальной страницы задачи, использующий параметр маршрута `:id`.
 * Переход назад осуществляется через роутер.
 */

interface TaskFormData {
  title: string
  tags: string[]
  content: string
}

/**
 * Получить цвет статуса задачи
 */
const getStatusColor = (status: string) => {
  switch (status) {
    case 'planned':
      return 'blue'
    case 'in-progress':
      return 'yellow'
    case 'done':
      return 'green'
    default:
      return 'gray'
  }
}

/**
 * Получить название статуса на русском
 */
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'planned':
      return 'Запланировано'
    case 'in-progress':
      return 'В работе'
    case 'done':
      return 'Выполнено'
    default:
      return status
  }
}

export function TaskDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const taskId = Number(id)
  /**
   * Возвращает текущую дату в формате YYYY-MM-DD
   */
  const getCurrentDateString = (): string => new Date().toISOString().split('T')[0]

  // Состояние компонента
  const [task, setTask] = useState<AgentTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('content')
  const [phaseReportModal, setPhaseReportModal] = useState<{
    opened: boolean;
    phaseId: string;
    phaseTitle: string;
  }>({
    opened: false,
    phaseId: '',
    phaseTitle: ''
  })

  // Форма редактирования
  const form = useForm<TaskFormData>({
    initialValues: {
      title: '',
      tags: [],
      content: ''
    },
    validate: {
      title: (value) => {
        if (!value || value.trim().length < 3) {
          return 'Название должно содержать минимум 3 символа'
        }
        if (value.trim().length > 200) {
          return 'Название не должно превышать 200 символов'
        }
        return null
      },
      tags: (value) => {
        if (value.length > 10) {
          return 'Максимум 10 тегов'
        }
        for (const tag of value) {
          if (tag.length > 50) {
            return 'Тег не должен превышать 50 символов'
          }
          if (!/^[a-zA-Z0-9а-яёА-ЯЁ\-_]+$/.test(tag)) {
            return 'Теги могут содержать только буквы, цифры, дефисы и подчеркивания'
          }
        }
        return null
      },
      content: (value) => {
        if (!value || value.trim().length < 10) {
          return 'Содержимое должно содержать минимум 10 символов'
        }
        if (value.length > 50000) {
          return 'Содержимое не должно превышать 50000 символов'
        }
        return null
      }
    }
  })

  /**
   * Загрузка данных задачи
   */
  const loadTask = async () => {
    try {
      setLoading(true)
      setError(null)

      const taskData = await getTaskById(taskId)
      setTask(taskData)

      // Инициализация формы
      form.setValues({
        title: taskData.title,
        tags: taskData.tags,
        content: taskData.content
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки задачи'
      setError(errorMessage)
      notifications.show({
        title: 'Ошибка загрузки',
        message: errorMessage,
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Сохранение изменений
   */
  const handleSave = async () => {
    const validation = form.validate()

    if (validation.hasErrors) {
      notifications.show({
        title: 'Ошибка валидации',
        message: 'Пожалуйста, исправьте ошибки в форме',
        color: 'red'
      })
      return
    }

    if (!task) return

    try {
      setSaving(true)
      setError(null)

      // Сохраняем изменения через API
      const updatedTask = await updateTask(task.id, {
        title: form.values.title,
        tags: form.values.tags,
        content: getContentWithoutYaml(form.values.content)
      })

      // Обновляем локальное состояние данными с сервера
      setTask(updatedTask)

      setEditMode(false)

      notifications.show({
        title: 'Задача сохранена',
        message: 'Изменения успешно сохранены',
        color: 'green'
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка сохранения'
      setError(errorMessage)
      notifications.show({
        title: 'Ошибка сохранения',
        message: errorMessage,
        color: 'red'
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Отмена редактирования
   */
  const handleCancel = () => {
    if (task) {
      form.setValues({
        title: task.title,
        tags: task.tags,
        content: task.content
      })
    }
    setEditMode(false)
  }

  /**
   * Извлечение контента без YAML шапки
   */
  const getContentWithoutYaml = (content: string): string => {
    const lines = content.split('\n')
    let startIndex = 0

    // Пропускаем YAML шапку если она есть
    if (lines[0] === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          startIndex = i + 1
          break
        }
      }
    }

    return lines.slice(startIndex).join('\n').trim()
  }

  /**
   * Создание полного контента с YAML шапкой
   */
  const createFullContent = (contentWithoutYaml: string): string => {
    if (!task) return contentWithoutYaml

    const yamlHeader = `---
id: ${task.id}
epic: ${task.epic}
title: ${form.values.title}
status: ${task.status}
created: ${task.created}
updated: ${getCurrentDateString()}
tags: [${form.values.tags.map(tag => `"${tag}"`).join(', ')}]
phases:
  total: ${task.phases.length}
  completed: ${task.phases.filter(p => p.status === 'done').length}
---`

    return `${yamlHeader}\n\n${contentWithoutYaml}`
  }

  /**
   * Открыть модальное окно с отчетом фазы
   */
  const handleOpenPhaseReport = (phaseNumber: number, title: string) => {
    setPhaseReportModal({
      opened: true,
      phaseId: phaseNumber.toString(),
      phaseTitle: title
    })
  }

  /**
   * Закрыть модальное окно отчета фазы
   */
  const handleClosePhaseReport = () => {
    setPhaseReportModal({
      opened: false,
      phaseId: '',
      phaseTitle: ''
    })
  }

  /**
   * Обработчик редактирования фазы
   */
  const handlePhaseEdit = async (phaseNumber: number, newPhaseText: string) => {
    if (!task) return

    try {
      // Заменяем текст фазы в содержимом задачи
      const lines = getContentWithoutYaml(task.content).split('\n')
      const phasePatterns = [
        new RegExp(`^###\\s+[⏳✅]\\s*Фаза\\s+${phaseNumber}(?:\\.\\d+)?\\s*:`, 'i'),
        new RegExp(`^##\\s+[⏳✅]\\s*Фаза\\s+${phaseNumber}(?:\\.\\d+)?\\s*:`, 'i')
      ]
      
      let startIndex = -1
      let endIndex = lines.length
      
      // Находим начало фазы
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (phasePatterns.some(pattern => pattern.test(line))) {
          startIndex = i
          break
        }
      }
      
      if (startIndex === -1) {
        throw new Error('Фаза не найдена в содержимом задачи')
      }
      
      // Находим конец фазы (следующий заголовок фазы или секции)
      for (let i = startIndex + 1; i < lines.length; i++) {
        const line = lines[i]
        if (line.match(/^##[#]?\s+[⏳✅]?\s*Фаза\s+\d+/i) || 
            line.match(/^##\s+[А-Яа-яA-Za-z]/)) {
          endIndex = i
          break
        }
      }
      
      // Заменяем содержимое фазы
      const newLines = [
        ...lines.slice(0, startIndex),
        ...newPhaseText.split('\n'),
        ...lines.slice(endIndex)
      ]
      
      const updatedContent = newLines.join('\n')
      
      // Сохраняем обновленную задачу
      const updatedTask = await updateTask(task.id, {
        title: form.values.title,
        tags: form.values.tags,
        content: updatedContent
      })

      // Обновляем локальное состояние
      setTask(updatedTask)
      form.setFieldValue('content', createFullContent(updatedContent))

    } catch (error) {
      throw new Error(`Ошибка обновления фазы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  // Загрузка данных при монтировании
  useEffect(() => {
    if (!Number.isFinite(taskId)) {
      setError('Некорректный идентификатор задачи')
      setLoading(false)
      return
    }
    loadTask()
  }, [taskId])

  if (loading) {
    return (
      <Container size="xl">
        <LoadingOverlay visible />
        <div style={{ height: '400px' }} />
      </Container>
    )
  }

  if (error || !task) {
    return (
      <Container size="xl">
        <Stack gap="md">
          <Button leftSection={<IconArrowLeft />} variant="light" onClick={() => navigate('/tasks')}>
            Назад к списку
          </Button>
          <Alert icon={<IconAlertCircle size={16} />} title="Ошибка" color="red">
            {error || 'Задача не найдена'}
          </Alert>
        </Stack>
      </Container>
    )
  }

  return (
    <Container size="xl" style={{ width: '100%', maxWidth: 'none' }}>
      <Stack gap="md">
        {/* Хлебные крошки и действия */}
        <Group justify="space-between">
          <Button leftSection={<IconArrowLeft />} variant="light" onClick={() => navigate('/tasks')}>
            Назад к списку
          </Button>

          <Group>
            {editMode ? (
              <>
                <Button
                  leftSection={<IconDeviceFloppy />}
                  color="green"
                  loading={saving}
                  onClick={handleSave}
                >
                  Сохранить
                </Button>
                <ActionIcon variant="light" color="gray" onClick={handleCancel}>
                  <IconX size={16} />
                </ActionIcon>
              </>
            ) : (
              <Button
                leftSection={<IconEdit />}
                variant="light"
                onClick={() => setEditMode(true)}
              >
                Редактировать
              </Button>
            )}
          </Group>
        </Group>

        {/* Основная информация о задаче */}
        <Paper withBorder shadow="sm" p="lg">
          <Stack gap="md">
            {/* Заголовок */}
            {editMode ? (
              <TextInput
                label="Название задачи"
                {...form.getInputProps('title')}
                size="lg"
              />
            ) : (
              <Title order={2}>{task.title}</Title>
            )}

            {/* Метаинформация */}
            <Group gap="xl">
              <Group gap="xs">
                <IconHash size={16} color="var(--mantine-color-gray-6)" />
                <Text size="sm" c="dimmed">ID: {task.id}</Text>
              </Group>

              <Group gap="xs">
                <IconCalendar size={16} color="var(--mantine-color-gray-6)" />
                <Text size="sm" c="dimmed">
                  Создано: {new Date(task.created).toLocaleDateString('ru-RU')}
                </Text>
              </Group>

              {task.folderName && (
                <Text size="sm" c="dimmed">
                  Папка: {task.folderName}
                </Text>
              )}

              {task.epic && (
                <Text size="sm" c="dimmed">
                  Эпик: {task.epic}
                </Text>
              )}

              <Badge color={getStatusColor(task.status)} variant="light" size="sm">
                {getStatusLabel(task.status)}
              </Badge>
            </Group>

            {/* Теги */}
            <Group gap="xs">
              <IconTag size={16} color="var(--mantine-color-gray-6)" />
              {editMode ? (
                <MultiSelect
                  label="Теги"
                  data={[]}
                  searchable
                  {...form.getInputProps('tags')}
                  style={{ flex: 1 }}
                />
              ) : (
                <Group gap={4}>
                  {task.tags.length > 0 ? (
                    task.tags.map((tag) => (
                      <Badge key={tag} size="xs" variant="outline">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <Text size="sm" c="dimmed">Нет тегов</Text>
                  )}
                </Group>
              )}
            </Group>

            {/* Фазы */}
            {task.phases.length > 0 && (
              <Group gap="xs">
                <Text size="sm" fw={500}>Прогресс фаз:</Text>
                <Text size="sm">
                  {task.phases.filter(p => p.status === 'done').length} / {task.phases.length} выполнено
                </Text>
                <Badge
                  variant="light"
                  color={task.phases.every(p => p.status === 'done') ? 'green' : 'blue'}
                >
                  {Math.round((task.phases.filter(p => p.status === 'done').length / task.phases.length) * 100)}%
                </Badge>
              </Group>
            )}
          </Stack>
        </Paper>

        {/* Табы с содержимым */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'content')}>
          <Tabs.List>
            <Tabs.Tab value="content">Содержимое</Tabs.Tab>
            <Tabs.Tab value="phases">Фазы ({task.phases.length})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="content" pt="md">
            <Paper withBorder p="lg">
              <Stack gap="md">

                {editMode ? (
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Markdown содержимое (без YAML шапки)</Text>
                    <Box
                      style={{
                        border: '1px solid var(--mantine-color-gray-3)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        width: '100%'
                      }}
                    >
                      <Editor
                        width="100%"
                        height="500px"
                        language="markdown"
                        theme="vs"
                        value={getContentWithoutYaml(form.values.content)}
                        onChange={(value) => {
                          const contentWithoutYaml = value || ''
                          const fullContent = createFullContent(contentWithoutYaml)
                          form.setFieldValue('content', fullContent)
                        }}
                        options={{
                          minimap: { enabled: false },
                          lineNumbers: 'on',
                          wordWrap: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          fontSize: 14,
                          fontFamily: 'Monaco, "Cascadia Code", "Fira Code", Consolas, monospace',
                          tabSize: 2,
                          insertSpaces: true,
                          renderWhitespace: 'boundary',
                          folding: true,
                          bracketPairColorization: { enabled: true },
                          padding: { top: 10, bottom: 10 }
                        }}
                      />
                    </Box>
                    {form.errors.content && (
                      <Text size="sm" c="red">
                        {form.errors.content}
                      </Text>
                    )}
                  </Stack>
                ) : (
                  <Box
                    style={{
                      background: 'var(--mantine-color-gray-0)',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid var(--mantine-color-gray-3)'
                    }}
                  >
                    <EditableMarkdown onPhaseEdit={handlePhaseEdit}>
                      {getContentWithoutYaml(task.content)}
                    </EditableMarkdown>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="phases" pt="md">
            <Paper withBorder p="lg">
              <Stack gap="md">
                <Title order={3}>Фазы задачи</Title>
                {task.phases.length > 0 ? (
                  <Stack gap="sm">
                    {task.phases.map((phase, index) => (
                      <Group key={index} justify="space-between" p="sm" style={{
                        border: '1px solid var(--mantine-color-gray-3)',
                        borderRadius: '8px'
                      }}>
                        <Group>
                          <Text fw={500}>Фаза {phase.phaseNumber}</Text>
                          <Text>{phase.title}</Text>
                        </Group>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => handleOpenPhaseReport(phase.phaseNumber, phase.title)}
                            title="Посмотреть отчет"
                          >
                            <IconEye size={14} />
                          </ActionIcon>
                          <Badge color={getStatusColor(phase.status)} variant="light">
                            {getStatusLabel(phase.status)}
                          </Badge>
                        </Group>
                      </Group>
                    ))}
                  </Stack>
                ) : (
                  <Text c="dimmed">У задачи нет фаз</Text>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>

        {/* Модальное окно отчета фазы */}
        {task && (
          <PhaseReportModal
            opened={phaseReportModal.opened}
            onClose={handleClosePhaseReport}
            taskId={task.id}
            phaseId={phaseReportModal.phaseId}
            phaseTitle={phaseReportModal.phaseTitle}
          />
        )}
      </Stack>
    </Container>
  )
}
