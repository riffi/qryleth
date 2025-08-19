/**
 * Страница детального просмотра эпика.
 *
 * Задачи:
 * - Загрузить эпик по идентификатору из URL-параметра `:id`.
 * - Загрузить список задач, относящихся к этому эпику.
 * - Отобразить метаинформацию эпика и список его задач.
 * - Обеспечить навигацию: клик по задаче ведёт на `/tasks/:id`, кнопка «Назад» ведёт на `/epics`.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Container,
  Stack,
  Title,
  Paper,
  Group,
  Badge,
  Text,
  Button,
  Alert,
  Loader,
  Box,
  Tabs
} from '@mantine/core'
import { IconArrowLeft, IconCalendar, IconHash, IconTag } from '@tabler/icons-react'
import { Epic, AgentTask, getEpicById, getEpicTasks } from '../services/apiService'
import { TaskList } from '../components/TaskList'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/atom-one-dark.css'

export function EpicDetailPage() {
  /**
   * Извлекает `id` эпика из параметров маршрута и предоставляет средства навигации.
   */
  const { id } = useParams()
  const navigate = useNavigate()
  const epicId = Number(id)

  // Состояние данных страницы
  const [epic, setEpic] = useState<Epic | null>(null)
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('content')

  /**
   * Загружает данные эпика и связанные задачи по `epicId`.
   */
  const loadEpic = async () => {
    try {
      setLoading(true)
      setError(null)

      const [epicData, epicTasks] = await Promise.all([
        getEpicById(epicId),
        getEpicTasks(epicId)
      ])

      setEpic(epicData)
      setTasks(epicTasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки эпика')
    } finally {
      setLoading(false)
    }
  }

  // Загрузка при монтировании/смене параметра
  useEffect(() => {
    if (!Number.isFinite(epicId)) {
      setError('Некорректный идентификатор эпика')
      setLoading(false)
      return
    }
    loadEpic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epicId])

  if (loading) {
    return (
      <Container size="xl" style={{ width: '100%', maxWidth: 'none' }}>
        <Stack align="center" mt="xl">
          <Loader size="lg" />
          <Text>Загрузка эпика...</Text>
        </Stack>
      </Container>
    )
  }

  if (error || !epic) {
    return (
      <Container size="xl" style={{ width: '100%', maxWidth: 'none' }}>
        <Stack gap="md">
          <Button leftSection={<IconArrowLeft />} variant="light" onClick={() => navigate('/epics')}>
            Назад к списку эпиков
          </Button>
          <Alert title="Ошибка" color="red">
            {error || 'Эпик не найден'}
          </Alert>
        </Stack>
      </Container>
    )
  }

  /**
   * Извлекает Markdown без YAML-шапки (если она присутствует в начале контента).
   */
  const getContentWithoutYaml = (content: string): string => {
    const lines = (content || '').split('\n')
    let startIndex = 0
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
   * Возвращает цвет бейджа по статусу эпика.
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
   * Возвращает человекочитаемую метку статуса на русском.
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

  return (
    <Container size="xl" style={{ width: '100%', maxWidth: 'none' }}>
      <Stack gap="md">
        {/* Панель действий */}
        <Group justify="space-between">
          <Button leftSection={<IconArrowLeft />} variant="light" onClick={() => navigate('/epics')}>
            Назад к списку эпиков
          </Button>
        </Group>

        {/* Основная карточка эпика */}
        <Paper withBorder shadow="sm" p="lg">
          <Stack gap="md">
            <Title order={2}>{epic.title}</Title>

            <Group gap="xl">
              <Group gap="xs">
                <IconHash size={16} color="var(--mantine-color-gray-6)" />
                <Text size="sm" c="dimmed">ID: {epic.id}</Text>
              </Group>
              <Group gap="xs">
                <IconCalendar size={16} color="var(--mantine-color-gray-6)" />
                <Text size="sm" c="dimmed">
                  Создано: {new Date(epic.created).toLocaleDateString('ru-RU')}
                </Text>
              </Group>
              <Badge color={getStatusColor(epic.status)} variant="light" size="sm">
                {getStatusLabel(epic.status)}
              </Badge>
            </Group>

            {/* Теги */}
            {epic.tags.length > 0 && (
              <Group gap="xs">
                <IconTag size={16} color="var(--mantine-color-gray-6)" />
                <Group gap={4}>
                  {epic.tags.map((tag) => (
                    <Badge key={tag} size="xs" variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              </Group>
            )}
          </Stack>
        </Paper>

        {/* Вкладки: содержимое и задачи эпика */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'content')}>
          <Tabs.List>
            <Tabs.Tab value="content">Содержимое</Tabs.Tab>
            <Tabs.Tab value="tasks">Задачи ({tasks.length})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="content" pt="md">
            <Paper withBorder p="lg">
              <Stack gap="md">
                {epic.content ? (
                  <Box
                    style={{
                      background: 'var(--mantine-color-gray-0)',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid var(--mantine-color-gray-3)'
                    }}
                  >
                    <ReactMarkdown
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        h1: ({ children }) => <Title order={1} mb="md" c="var(--mantine-color-gray-6)">{children}</Title>,
                        h2: ({ children }) => <Title order={2} mb="md" c="var(--mantine-color-gray-6)">{children}</Title>,
                        h3: ({ children }) => <Title order={3} mb="md" c="var(--mantine-color-gray-6)">{children}</Title>,
                        h4: ({ children }) => <Title order={4} mb="md" c="var(--mantine-color-gray-6)">{children}</Title>,
                        h5: ({ children }) => <Title order={5} mb="md" c="var(--mantine-color-gray-6)">{children}</Title>,
                        h6: ({ children }) => <Title order={6} mb="md" c="var(--mantine-color-gray-6)">{children}</Title>,
                        p: ({ children }) => <Text mb="md" c="var(--mantine-color-gray-7)">{children}</Text>,
                        pre: ({ children }) => (
                          <Box
                            component="pre"
                            style={{
                              background: 'var(--mantine-color-dark-8)',
                              color: 'var(--mantine-color-gray-0)',
                              padding: '12px',
                              borderRadius: '4px',
                              overflow: 'auto',
                              fontFamily: 'monospace',
                              fontSize: '14px'
                            }}
                            mb="md"
                          >
                            {children}
                          </Box>
                        ),
                        code: ({ children, inline }: any) => {
                          if (!inline) {
                            return (
                              <Box component="code" style={{ fontFamily: 'monospace' }}>
                                {children}
                              </Box>
                            )
                          }
                          return (
                            <Box
                              component="code"
                              style={{
                                background: 'var(--mantine-color-gray-6)',
                                padding: '2px 4px',
                                borderRadius: '3px',
                                fontFamily: 'monospace',
                                fontSize: '0.9em'
                              }}
                            >
                              {children}
                            </Box>
                          )
                        },
                        ul: ({ children }) => <Box component="ul" mb="md" pl="md">{children}</Box>,
                        ol: ({ children }) => <Box component="ol" mb="md" pl="md">{children}</Box>,
                        li: ({ children }) => <Text component="li" mb="xs" c="var(--mantine-color-gray-7)">{children}</Text>,
                        blockquote: ({ children }) => (
                          <Box
                            style={{
                              borderLeft: '4px solid var(--mantine-color-blue-5)',
                              paddingLeft: '16px',
                              fontStyle: 'italic',
                              background: 'var(--mantine-color-blue-0)',
                              padding: '8px 16px',
                              margin: '16px 0'
                            }}
                          >
                            {children}
                          </Box>
                        )
                      }}
                    >
                      {getContentWithoutYaml(epic.content)}
                    </ReactMarkdown>
                  </Box>
                ) : (
                  <Text c="dimmed">Для эпика нет содержимого</Text>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="tasks" pt="md">
            <Paper withBorder p="lg">
              <Stack gap="md">
                <Title order={3}>Задачи эпика</Title>
                <TaskList
                  tasks={tasks}
                  loading={false}
                  error={null}
                  showTitle={false}
                  onTaskClick={(task) => navigate(`/tasks/${task.id}`)}
                />
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  )
}
