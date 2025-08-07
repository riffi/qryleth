/**
 * Тестовая страница для проверки API
 */
import { useState } from 'react'
import { Button, Stack, Text, Code } from '@mantine/core'
import { getTasksWithFilters, TaskFilters } from '../services/apiService'

export function TestPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testAPI = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    
    try {
      const filters: TaskFilters = { page: 1, limit: 2 }
      const result = await getTasksWithFilters(filters)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack gap="md">
      <Text size="xl" fw={700}>Тест API</Text>
      
      <Button onClick={testAPI} loading={loading}>
        Тестировать getTasksWithFilters
      </Button>
      
      {error && (
        <Code color="red">{error}</Code>
      )}
      
      {data && (
        <Stack gap="sm">
          <Text fw={500}>Результат:</Text>
          <Code block>{JSON.stringify(data, null, 2)}</Code>
        </Stack>
      )}
    </Stack>
  )
}