/**
 * Страница 404 (не найдено).
 * Отображает краткое сообщение и предлагает перейти на главную страницу.
 */
import { Container, Stack, Title, Text, Button } from '@mantine/core'
import { IconHome } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

export function NotFoundPage() {
  /**
   * Обрабатывает переход на главную страницу.
   */
  const navigate = useNavigate()

  return (
    <Container size="sm">
      <Stack align="center" gap="md" mt="xl">
        <Title order={2}>Страница не найдена</Title>
        <Text c="dimmed">Похоже, вы попали на несуществующий маршрут.</Text>
        <Button leftSection={<IconHome />} onClick={() => navigate('/')}>На главную</Button>
      </Stack>
    </Container>
  )
}

