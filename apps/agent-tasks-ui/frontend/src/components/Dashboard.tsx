/**
 * Компонент дашборда с общей информацией и статистикой
 */
import { SimpleGrid, Card, Text, Group, RingProgress, Stack, Title, Loader, Alert } from '@mantine/core'
import { IconChecklist, IconBulb, IconClock, IconCheck } from '@tabler/icons-react'
import { ManagerState, AgentTask, Epic } from '../services/apiService'

interface DashboardProps {
  managerState: ManagerState | null
  tasks: AgentTask[]
  epics: Epic[]
  loading: boolean
  error: string | null
}

export function Dashboard({ managerState, tasks, epics, loading, error }: DashboardProps) {
  if (loading) {
    return (
      <Stack align="center" mt="xl">
        <Loader size="lg" />
        <Text>Загрузка статистики...</Text>
      </Stack>
    )
  }

  if (error) {
    return (
      <Alert title="Ошибка" color="red">
        {error}
      </Alert>
    )
  }

  // Подсчет статистики
  const completedTasks = tasks.filter(task => task.status === 'done').length
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length
  const plannedTasks = tasks.filter(task => task.status === 'planned').length

  const completedEpics = epics.filter(epic => epic.status === 'done').length
  const inProgressEpics = epics.filter(epic => epic.status === 'in-progress').length

  const totalPhases = tasks.reduce((sum, task) => sum + task.phases.length, 0)
  const completedPhases = tasks.reduce((sum, task) => 
    sum + task.phases.filter(phase => phase.status === 'done').length, 0
  )

  const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0
  const phaseCompletionRate = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0

  return (
    <Stack gap="lg">
      <Title order={2}>Обзор системы агентских задач</Title>
      
      {/* Основная статистика */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="apart" mb="xs">
            <Text size="sm" c="dimmed">
              Всего задач
            </Text>
            <IconChecklist size={18} color="var(--mantine-color-blue-6)" />
          </Group>
          <Text fw={700} size="xl">
            {tasks.length}
          </Text>
          <Text size="xs" c="dimmed">
            {completedTasks} выполнено, {inProgressTasks} в работе
          </Text>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="apart" mb="xs">
            <Text size="sm" c="dimmed">
              Всего эпиков
            </Text>
            <IconBulb size={18} color="var(--mantine-color-yellow-6)" />
          </Group>
          <Text fw={700} size="xl">
            {epics.length}
          </Text>
          <Text size="xs" c="dimmed">
            {completedEpics} выполнено, {inProgressEpics} в работе
          </Text>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="apart" mb="xs">
            <Text size="sm" c="dimmed">
              Всего фаз
            </Text>
            <IconClock size={18} color="var(--mantine-color-green-6)" />
          </Group>
          <Text fw={700} size="xl">
            {totalPhases}
          </Text>
          <Text size="xs" c="dimmed">
            {completedPhases} выполнено
          </Text>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="apart" mb="xs">
            <Text size="sm" c="dimmed">
              Следующий ID
            </Text>
            <IconCheck size={18} color="var(--mantine-color-teal-6)" />
          </Group>
          <Text fw={700} size="xl">
            {managerState?.nextTaskId || '—'}
          </Text>
          <Text size="xs" c="dimmed">
            Версия: {managerState?.version || '—'}
          </Text>
        </Card>
      </SimpleGrid>

      {/* Прогресс выполнения */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="apart" align="flex-start">
            <Stack gap="xs">
              <Text fw={500}>Прогресс задач</Text>
              <Group>
                <Text size="xs" c="blue">Выполнено: {completedTasks}</Text>
                <Text size="xs" c="yellow">В работе: {inProgressTasks}</Text>
                <Text size="xs" c="gray">Запланировано: {plannedTasks}</Text>
              </Group>
            </Stack>
            <RingProgress
              size={80}
              thickness={8}
              sections={[
                { value: taskCompletionRate, color: 'green', tooltip: `Выполнено: ${completedTasks}` },
                { value: (inProgressTasks / tasks.length) * 100, color: 'yellow', tooltip: `В работе: ${inProgressTasks}` },
              ]}
              label={
                <Text c="dimmed" fw={700} ta="center" size="xs">
                  {Math.round(taskCompletionRate)}%
                </Text>
              }
            />
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="apart" align="flex-start">
            <Stack gap="xs">
              <Text fw={500}>Прогресс фаз</Text>
              <Group>
                <Text size="xs" c="green">Выполнено: {completedPhases}</Text>
                <Text size="xs" c="gray">Всего: {totalPhases}</Text>
              </Group>
            </Stack>
            <RingProgress
              size={80}
              thickness={8}
              sections={[
                { value: phaseCompletionRate, color: 'green', tooltip: `Выполнено: ${completedPhases}` }
              ]}
              label={
                <Text c="dimmed" fw={700} ta="center" size="xs">
                  {Math.round(phaseCompletionRate)}%
                </Text>
              }
            />
          </Group>
        </Card>
      </SimpleGrid>

      {/* Дополнительная информация */}
      {managerState && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="xs">
            <Text fw={500}>Информация системы</Text>
            <Group>
              <Text size="sm">
                <Text span fw={500}>Последнее обновление:</Text>{' '}
                {new Date(managerState.lastModified).toLocaleString('ru-RU')}
              </Text>
            </Group>
            <Group>
              <Text size="sm">
                <Text span fw={500}>Активных эпиков:</Text> {managerState.metadata.activeEpics}
              </Text>
              <Text size="sm">
                <Text span fw={500}>Общее количество элементов:</Text> {managerState.metadata.totalItems}
              </Text>
            </Group>
          </Stack>
        </Card>
      )}
    </Stack>
  )
}