/**
 * Компонент списка агентских задач
 */
import { Card, Text, Badge, Group, Stack, Title, Loader, Alert } from '@mantine/core'
import { IconAlertCircle, IconCalendar, IconHash, IconTag } from '@tabler/icons-react'
import { AgentTask, PaginationInfo } from '../services/apiService'

interface TaskListProps {
  tasks: AgentTask[]
  loading: boolean
  error: string | null
  onTaskClick?: (task: AgentTask) => void
  pagination?: PaginationInfo
  showTitle?: boolean
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

export function TaskList({ 
  tasks, 
  loading, 
  error, 
  onTaskClick, 
  pagination,
  showTitle = true 
}: TaskListProps) {
  if (loading) {
    return (
      <Stack align="center" mt="xl">
        <Loader size="lg" />
        <Text>Загрузка задач...</Text>
      </Stack>
    )
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Ошибка" color="red">
        {error}
      </Alert>
    )
  }

  if (tasks.length === 0) {
    return (
      <Alert title="Нет задач" color="blue">
        В системе нет агентских задач
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      {showTitle && (
        <Title order={2}>
          Агентские задачи 
          {pagination ? `(${pagination.total})` : `(${tasks.length})`}
        </Title>
      )}
      
      {tasks.map((task) => (
        <Card
          key={task.id}
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
          onClick={() => onTaskClick?.(task)}
        >
          <Stack gap="sm">
            {/* Заголовок и статус */}
            <Group justify="space-between">
              <Group>
                <IconHash size={16} color="var(--mantine-color-gray-6)" />
                <Text fw={500} size="lg">{task.title}</Text>
              </Group>
              <Badge color={getStatusColor(task.status)} variant="light">
                {getStatusLabel(task.status)}
              </Badge>
            </Group>

            {/* Метаинформация */}
            <Group gap="lg">
              <Group gap="xs">
                <IconCalendar size={14} color="var(--mantine-color-gray-6)" />
                <Text size="sm" c="dimmed">
                  ID: {task.id}
                </Text>
              </Group>
              
              <Group gap="xs">
                <IconCalendar size={14} color="var(--mantine-color-gray-6)" />
                <Text size="sm" c="dimmed">
                  Создано: {new Date(task.created).toLocaleDateString('ru-RU')}
                </Text>
              </Group>
              
              {task.epic && (
                <Group gap="xs">
                  <Text size="sm" c="dimmed">
                    Эпик: {task.epic}
                  </Text>
                </Group>
              )}
            </Group>

            {/* Фазы */}
            {task.phases.length > 0 && (
              <Group gap="xs">
                <Text size="sm" c="dimmed">Фазы:</Text>
                <Text size="sm">
                  {task.phases.filter(p => p.status === 'done').length} / {task.phases.length} выполнено
                </Text>
                <Group gap={4}>
                  {task.phases.slice(0, 5).map((phase) => (
                    <Badge
                      key={phase.phaseNumber}
                      size="xs"
                      color={getStatusColor(phase.status)}
                      variant="dot"
                    >
                      {phase.phaseNumber}
                    </Badge>
                  ))}
                  {task.phases.length > 5 && (
                    <Text size="xs" c="dimmed">+{task.phases.length - 5}</Text>
                  )}
                </Group>
              </Group>
            )}

            {/* Теги */}
            {task.tags.length > 0 && (
              <Group gap="xs">
                <IconTag size={14} color="var(--mantine-color-gray-6)" />
                <Group gap={4}>
                  {task.tags.map((tag) => (
                    <Badge key={tag} size="xs" variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              </Group>
            )}
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}