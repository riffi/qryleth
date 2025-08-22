import React from 'react'
import { useParams } from 'react-router-dom'
import { SceneEditorR3F } from '@/features/scene'
import { ErrorBoundary } from '@/shared/ui'
import { Paper, Text, Group, Button, ScrollArea, Box } from '@mantine/core'


const SceneEditorPage: React.FC = () => {
  const { id } = useParams()
  const isNew = !id

    return (
      <ErrorBoundary
        fallback={(error, info, reset) => (
          <Paper shadow="sm" radius="md" p="md" m="md">
            <Group justify="space-between" mb="sm">
              <Text size="lg" fw={600} c="red.5">Ошибка в SceneEditorR3F</Text>
              <Button variant="light" onClick={reset}>Перезапустить редактор</Button>
            </Group>
            <Text size="sm" fw={500} mb={4}>Сообщение:</Text>
            <Text size="sm" mb="sm" c="red.6">{error?.message || 'Неизвестная ошибка'}</Text>
            <Text size="sm" fw={500} mb={4}>Стэк:</Text>
            <ScrollArea h={260} offsetScrollbars>
              <Box component="pre" style={{ whiteSpace: 'pre-wrap' }}>
                {error?.stack || info?.componentStack || 'Стэк недоступен'}
              </Box>
            </ScrollArea>
          </Paper>
        )}
      >
        <SceneEditorR3F
          uuid={id}
          isNew={isNew}
          showObjectManager
        />
      </ErrorBoundary>
    )
}

export default SceneEditorPage
