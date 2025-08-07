/**
 * Компонент списка эпиков
 */
import { Card, Text, Badge, Group, Stack, Title, Loader, Alert } from '@mantine/core'
import { IconAlertCircle, IconCalendar, IconHash, IconTag, IconList } from '@tabler/icons-react'
import { Epic } from '../services/apiService'

interface EpicListProps {
  epics: Epic[]
  loading: boolean
  error: string | null
  onEpicClick?: (epic: Epic) => void
}

/**
 * Получить цвет статуса эпика
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

export function EpicList({ epics, loading, error, onEpicClick }: EpicListProps) {
  if (loading) {
    return (
      <Stack align="center" mt="xl">
        <Loader size="lg" />
        <Text>Загрузка эпиков...</Text>
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

  if (epics.length === 0) {
    return (
      <Alert title="Нет эпиков" color="blue">
        В системе нет эпиков
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      <Title order={2}>Эпики ({epics.length})</Title>
      
      {epics.map((epic) => (
        <Card
          key={epic.id}
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          style={{ cursor: onEpicClick ? 'pointer' : 'default' }}
          onClick={() => onEpicClick?.(epic)}
        >
          <Stack gap="sm">
            {/* Заголовок и статус */}
            <Group justify="space-between">
              <Group>
                <IconHash size={16} color="var(--mantine-color-gray-6)" />
                <Text fw={500} size="lg">{epic.title}</Text>
              </Group>
              <Badge color={getStatusColor(epic.status)} variant="light">
                {getStatusLabel(epic.status)}
              </Badge>
            </Group>

            {/* Метаинформация */}
            <Group gap="lg">
              <Group gap="xs">
                <IconCalendar size={14} color="var(--mantine-color-gray-6)" />
                <Text size="sm" c="dimmed">
                  ID: {epic.id}
                </Text>
              </Group>
              
              <Group gap="xs">
                <IconCalendar size={14} color="var(--mantine-color-gray-6)" />
                <Text size="sm" c="dimmed">
                  Создано: {new Date(epic.created).toLocaleDateString('ru-RU')}
                </Text>
              </Group>

              {/* Количество задач */}
              <Group gap="xs">
                <IconList size={14} color="var(--mantine-color-gray-6)" />
                <Text size="sm" c="dimmed">
                  Задач: {epic.tasks.length}
                </Text>
              </Group>
            </Group>

            {/* Теги */}
            {epic.tags.length > 0 && (
              <Group gap="xs">
                <IconTag size={14} color="var(--mantine-color-gray-6)" />
                <Group gap={4}>
                  {epic.tags.map((tag) => (
                    <Badge key={tag} size="xs" variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              </Group>
            )}

            {/* Краткое описание контента */}
            {epic.content && (
              <Text size="sm" c="dimmed" lineClamp={2}>
                {epic.content.split('\n')[0]}
              </Text>
            )}
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}