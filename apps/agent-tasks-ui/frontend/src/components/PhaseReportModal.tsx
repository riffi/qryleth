/**
 * Модальное окно для отображения отчета фазы с возможностью просмотра и редактирования
 */
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import {
  Modal,
  Stack,
  Title,
  Paper,
  Text,
  Button,
  Group,
  LoadingOverlay,
  Alert,
  Badge,
  Box
} from '@mantine/core'
import {
  IconAlertCircle
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { PhaseReport, getPhaseReport } from '../services/apiService'
import 'highlight.js/styles/atom-one-dark.css'

interface PhaseReportModalProps {
  /**
   * Открыто ли модальное окно
   */
  opened: boolean
  /**
   * Функция закрытия модального окна
   */
  onClose: () => void
  /**
   * ID задачи
   */
  taskId: number
  /**
   * Номер фазы
   */
  phaseId: string
  /**
   * Заголовок фазы для отображения
   */
  phaseTitle?: string
}

/**
 * Получить цвет статуса фазы
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

export function PhaseReportModal({
  opened,
  onClose,
  taskId,
  phaseId,
  phaseTitle
}: PhaseReportModalProps) {
  // Состояние компонента
  const [phaseReport, setPhaseReport] = useState<PhaseReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Загрузка отчета фазы
   */
  const loadPhaseReport = async () => {
    if (!opened || !taskId || !phaseId) return

    try {
      setLoading(true)
      setError(null)

      const report = await getPhaseReport(taskId, phaseId)
      setPhaseReport(report)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки отчета фазы'
      setError(errorMessage)
      notifications.show({
        title: 'Ошибка загрузки',
        message: errorMessage,
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Обработчик закрытия модального окна
   */
  const handleClose = () => {
    setPhaseReport(null)
    setError(null)
    onClose()
  }

  // Загрузка данных при открытии модального окна
  useEffect(() => {
    if (opened) {
      loadPhaseReport()
    }
  }, [opened, taskId, phaseId])

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group>
          <Title order={3}>
            {phaseTitle || `Фаза ${phaseId}`}
          </Title>
          {phaseReport && (
            <Badge color={getStatusColor(phaseReport.status)} variant="light">
              {getStatusLabel(phaseReport.status)}
            </Badge>
          )}
        </Group>
      }
      size="xl"
      centered
    >
      <Stack gap="md">
        {loading && (
          <Box style={{ position: 'relative', minHeight: '200px' }}>
            <LoadingOverlay visible />
          </Box>
        )}

        {error && !loading && (
          <Alert icon={<IconAlertCircle size={16} />} title="Ошибка" color="red">
            {error}
          </Alert>
        )}

        {phaseReport && !loading && (
          <Stack gap="md">
            {/* Заголовок отчета */}
            <Title order={4}>{phaseReport.title}</Title>

            {/* Содержимое отчета */}
            <Paper withBorder p="lg">
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
                    h1: ({ children }) => <Title order={2} mb="md" c="var(--mantine-color-gray-6)">{children}</Title>,
                    h2: ({ children }) => <Title order={3} mb="md" c="var(--mantine-color-gray-6)">{children}</Title>,
                    h3: ({ children }) => <Title order={4} mb="md" c="var(--mantine-color-gray-6)">{children}</Title>,
                    h4: ({ children }) => <Title order={5} mb="md" c="var(--mantine-color-gray-6)">{children}</Title>,
                    h5: ({ children }) => <Title order={6} mb="md" c="var(--mantine-color-gray-6)">{children}</Title>,
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
                  {phaseReport.content}
                </ReactMarkdown>
              </Box>
            </Paper>

            {/* Действия */}
            <Group justify="flex-end">
              <Button variant="light" onClick={handleClose}>
                Закрыть
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}