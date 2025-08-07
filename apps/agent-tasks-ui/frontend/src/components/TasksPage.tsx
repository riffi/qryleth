/**
 * Страница задач с фильтрами и поиском
 */
import { useState, useEffect, useMemo } from 'react'
import { Stack, Group, Loader, Alert, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import {
  getTasksWithFilters,
  getAllEpics,
  Epic,
  TaskFilters,
  TasksResponse
} from '../services/apiService'
import { TaskList } from './TaskList'
import { TaskFilters as TaskFiltersComponent } from './TaskFilters'
import { TaskPagination } from './TaskPagination'

export function TasksPage() {
  const [tasksData, setTasksData] = useState<TasksResponse | null>(null)
  const [epics, setEpics] = useState<Epic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TaskFilters>({
    page: 1,
    limit: 10
  })

  // Дебаунс для поиска
  const [debouncedFilters] = useDebouncedValue(filters, 300)

  /**
   * Загрузить эпики для фильтров
   */
  const loadEpics = async () => {
    try {
      const epicsData = await getAllEpics()
      setEpics(epicsData)
    } catch (err) {
      console.warn('Ошибка загрузки эпиков для фильтров:', err)
    }
  }

  /**
   * Загрузить задачи с фильтрами
   */
  const loadTasks = async (searchFilters: TaskFilters) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getTasksWithFilters(searchFilters)
      setTasksData(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(message)
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить задачи',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Обработчик изменения фильтров
   */
  const handleFiltersChange = (newFilters: TaskFilters) => {
    setFilters({
      ...newFilters,
      page: 1, // сбрасываем страницу при изменении фильтров
      limit: filters.limit // сохраняем размер страницы
    })
  }

  /**
   * Обработчик изменения страницы
   */
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  /**
   * Обработчик изменения размера страницы
   */
  const handlePageSizeChange = (limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }))
  }

  // Подготовка данных для фильтров
  const availableTags = useMemo(() => {
    if (!tasksData?.data) return []

    const tagsSet = new Set<string>()
    tasksData.data.forEach(task => {
      task.tags.forEach(tag => tagsSet.add(tag))
    })

    return Array.from(tagsSet).sort()
  }, [tasksData])

  const availableEpics = useMemo(() => {
    return epics.map(epic => ({
      value: epic.id.toString(),
      label: epic.title
    }))
  }, [epics])

  // Загрузка данных при изменении фильтров
  useEffect(() => {
    loadTasks(debouncedFilters)
  }, [debouncedFilters])

  // Загрузка эпиков при монтировании
  useEffect(() => {
    loadEpics()
  }, [])

  if (error && !tasksData) {
    return (
      <Alert title="Ошибка" color="red">
        {error}
      </Alert>
    )
  }

  return (
    <Stack gap="lg">
      {/* Фильтры */}
      <TaskFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableTags={availableTags}
        availableEpics={availableEpics}
        loading={loading}
      />

      {/* Информация о результатах */}
      {tasksData && tasksData.pagination && !loading && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {tasksData.pagination.total === 0
              ? 'Задачи не найдены'
              : `Найдено ${tasksData.pagination.total} задач${tasksData.pagination.total > tasksData.pagination.limit ? `, показаны ${tasksData.data?.length || 0}` : ''}`
            }
          </Text>

          {/* Показываем активные фильтры */}
          {Object.values(filters).some(value =>
            Array.isArray(value) ? value.length > 0 : Boolean(value) && value !== 1 && value !== 10
          ) && (
            <Text size="xs" c="blue">
              Применены фильтры
            </Text>
          )}
        </Group>
      )}

      {/* Список задач */}
      {loading && !tasksData ? (
        <Stack align="center" mt="xl">
          <Loader size="lg" />
          <Text>Загрузка задач...</Text>
        </Stack>
      ) : (
        <TaskList
          tasks={tasksData?.data || []}
          loading={loading}
          error={error}
          pagination={tasksData?.pagination}
          showTitle={false}
        />
      )}

      {/* Пагинация */}
      {tasksData && tasksData.pagination && tasksData.pagination.pages > 1 && (
        <TaskPagination
          currentPage={tasksData.pagination.page}
          totalPages={tasksData.pagination.pages}
          total={tasksData.pagination.total}
          pageSize={tasksData.pagination.limit}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          loading={loading}
        />
      )}
    </Stack>
  )
}
