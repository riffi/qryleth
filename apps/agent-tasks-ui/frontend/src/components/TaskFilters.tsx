/**
 * Компонент фильтров и поиска для агентских задач
 */
import { 
  TextInput, 
  Select, 
  MultiSelect, 
  Group, 
  Button, 
  Paper,
  Stack,
  Collapse,
  ActionIcon,
  Text,
  Checkbox
} from '@mantine/core'
import { 
  IconSearch, 
  IconFilter, 
  IconX, 
  IconChevronDown,
  IconChevronUp
} from '@tabler/icons-react'
import { useState } from 'react'

interface TaskFiltersProps {
  /**
   * Текущие значения фильтров
   */
  filters: {
    search?: string
    tags?: string[]
    status?: string
    epic?: string
    showCompleted?: boolean
  }
  
  /**
   * Колбэк при изменении фильтров
   */
  onFiltersChange: (filters: any) => void
  
  /**
   * Доступные теги для выбора
   */
  availableTags?: string[]
  
  /**
   * Доступные эпики для выбора
   */
  availableEpics?: Array<{ value: string, label: string }>
  
  /**
   * Загрузка
   */
  loading?: boolean
}

/**
 * Доступные статусы задач (без выполненных)
 */
const activeStatusOptions = [
  { value: 'planned', label: 'Запланировано' },
  { value: 'in-progress', label: 'В работе' }
]

/**
 * Все доступные статусы задач
 */
const allStatusOptions = [
  { value: 'planned', label: 'Запланировано' },
  { value: 'in-progress', label: 'В работе' },
  { value: 'done', label: 'Выполнено' }
]

export function TaskFilters({ 
  filters, 
  onFiltersChange, 
  availableTags = [], 
  availableEpics = [],
  loading = false 
}: TaskFiltersProps) {
  const [expanded, setExpanded] = useState(false)
  
  /**
   * Обновить значение фильтра
   */
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    })
  }
  
  /**
   * Очистить все фильтры
   */
  const clearFilters = () => {
    onFiltersChange({})
  }
  
  /**
   * Получить доступные опции статусов в зависимости от чекбокса
   */
  const statusOptions = filters.showCompleted ? allStatusOptions : activeStatusOptions

  /**
   * Проверить есть ли активные фильтры
   */
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'showCompleted') return false // не считаем чекбокс активным фильтром
    return Array.isArray(value) ? value.length > 0 : Boolean(value)
  })
  
  return (
    <Paper shadow="xs" p="md" withBorder>
      <Stack gap="md">
        {/* Строка поиска всегда видна */}
        <Group>
          <TextInput
            placeholder="Поиск по названию и содержимому..."
            leftSection={<IconSearch size={16} />}
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            style={{ flex: 1 }}
            disabled={loading}
          />
          
          <ActionIcon
            variant="light"
            color={expanded ? 'blue' : 'gray'}
            onClick={() => setExpanded(!expanded)}
            disabled={loading}
          >
            {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
          
          {hasActiveFilters && (
            <Button
              variant="light"
              color="red"
              size="xs"
              leftSection={<IconX size={14} />}
              onClick={clearFilters}
              disabled={loading}
            >
              Очистить
            </Button>
          )}
        </Group>
        
        {/* Дополнительные фильтры в свертываемой секции */}
        <Collapse in={expanded}>
          <Stack gap="sm">
            <Group grow>
              {/* Фильтр по статусу */}
              <Select
                label="Статус"
                placeholder="Выберите статус"
                data={statusOptions}
                value={filters.status || null}
                onChange={(value) => updateFilter('status', value)}
                clearable
                disabled={loading}
              />
              
              {/* Фильтр по эпику */}
              <Select
                label="Эпик"
                placeholder="Выберите эпик"
                data={[
                  { value: 'null', label: 'Без эпика' },
                  ...availableEpics
                ]}
                value={filters.epic || null}
                onChange={(value) => updateFilter('epic', value)}
                clearable
                disabled={loading}
              />
            </Group>
            
            {/* Фильтр по тегам */}
            {availableTags.length > 0 && (
              <MultiSelect
                label="Теги"
                placeholder="Выберите теги"
                data={availableTags.map(tag => ({ value: tag, label: tag }))}
                value={filters.tags || []}
                onChange={(value) => updateFilter('tags', value)}
                searchable
                clearable
                disabled={loading}
              />
            )}
            
            {/* Чекбокс показывать выполненные */}
            <Checkbox
              label="Показывать выполненные задачи"
              checked={filters.showCompleted || false}
              onChange={(event) => updateFilter('showCompleted', event.currentTarget.checked)}
              disabled={loading}
            />
            
            {/* Информация о количестве активных фильтров */}
            {hasActiveFilters && (
              <Text size="sm" c="dimmed">
                <IconFilter size={14} style={{ verticalAlign: 'middle' }} />
                {' '}Активных фильтров: {Object.values(filters).filter(value => 
                  Array.isArray(value) ? value.length > 0 : Boolean(value)
                ).length}
              </Text>
            )}
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  )
}