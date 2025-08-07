/**
 * Компонент пагинации для списка задач
 */
import { Group, Pagination, Text, Select } from '@mantine/core'

interface TaskPaginationProps {
  /**
   * Текущая страница
   */
  currentPage: number
  
  /**
   * Общее количество страниц
   */
  totalPages: number
  
  /**
   * Общее количество элементов
   */
  total: number
  
  /**
   * Количество элементов на странице
   */
  pageSize: number
  
  /**
   * Колбэк при изменении страницы
   */
  onPageChange: (page: number) => void
  
  /**
   * Колбэк при изменении размера страницы
   */
  onPageSizeChange: (pageSize: number) => void
  
  /**
   * Загрузка
   */
  loading?: boolean
}

/**
 * Доступные размеры страниц
 */
const pageSizeOptions = [
  { value: '5', label: '5 на странице' },
  { value: '10', label: '10 на странице' },
  { value: '20', label: '20 на странице' },
  { value: '50', label: '50 на странице' }
]

export function TaskPagination({ 
  currentPage, 
  totalPages, 
  total, 
  pageSize, 
  onPageChange, 
  onPageSizeChange,
  loading = false 
}: TaskPaginationProps) {
  // Не показываем пагинацию если элементов нет или все помещаются на одну страницу
  if (total === 0 || totalPages <= 1) {
    return null
  }
  
  // Вычисляем диапазон отображаемых элементов
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, total)
  
  return (
    <Group justify="space-between" mt="md">
      <Group>
        <Text size="sm" c="dimmed">
          Показано {startItem}-{endItem} из {total} задач
        </Text>
        
        <Select
          size="xs"
          data={pageSizeOptions}
          value={pageSize.toString()}
          onChange={(value) => value && onPageSizeChange(parseInt(value))}
          disabled={loading}
          w={140}
        />
      </Group>
      
      <Pagination
        total={totalPages}
        value={currentPage}
        onChange={onPageChange}
        disabled={loading}
        size="sm"
        withEdges
      />
    </Group>
  )
}