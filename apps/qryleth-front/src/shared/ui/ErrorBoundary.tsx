import React from 'react'
import { Box, Paper, Group, Text, Button, ScrollArea } from '@mantine/core'

/**
 * Тип коллбэка отрисовки запасного интерфейса при ошибке.
 * Позволяет кастомизировать вывод, получая саму ошибку, компонентный стек
 * и функцию сброса границы (повторного монтирования дочернего компонента).
 */
export type ErrorFallback = (
  error?: Error,
  info?: React.ErrorInfo,
  reset?: () => void
) => React.ReactNode

interface ErrorBoundaryProps {
  /** Дочерние элементы, которые нужно защитить границей ошибок */
  children: React.ReactNode
  /**
   * Кастомный рендер запасного интерфейса.
   * Если не указан, будет показан дефолтный блок с деталями ошибки.
   */
  fallback?: React.ReactNode | ErrorFallback
}

interface ErrorBoundaryState {
  /** Флаг наличия ошибки у дочернего дерева */
  hasError: boolean
  /** Объект ошибки, возникшей в дочернем дереве */
  error?: Error
  /** Информация об ошибке (стэк компонентов React) */
  info?: React.ErrorInfo
}

/**
 * Граница ошибок для изоляции падений в конкретных областях UI.
 *
 * Поведение:
 * - Перехватывает исключения в дочернем дереве и показывает fallback UI.
 * - Позволяет отрисовать детали (message/stack) и перезапустить компонент без перезагрузки страницы.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  /**
   * Переводит компонент в состояние ошибки при возникновении исключения.
   * Вызывается React автоматически на фазе рендера-потомка.
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  /**
   * Сохраняет дополнительную информацию об ошибке (компонентный стек) и логирует её в консоль.
   * Срабатывает после getDerivedStateFromError.
   */
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Сохраняем стек компонентов для отображения
    this.setState({ info })
    // Лог в консоль разработчика
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, info)
  }

  /**
   * Сбрасывает состояние границы ошибок, принудительно размонтируя и монтируя заново дочернее дерево.
   * Удобно, когда ошибка временная или уже исправлена.
   */
  private reset = () => {
    this.setState({ hasError: false, error: undefined, info: undefined })
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props
      if (typeof fallback === 'function') {
        return (fallback as ErrorFallback)(this.state.error, this.state.info, this.reset)
      }
      if (fallback) return fallback

      // Дефолтный запасной интерфейс с деталями ошибки
      return (
        <Paper shadow="sm" radius="md" p="md" m="md" style={{ maxWidth: 960 }}>
          <Group justify="space-between" align="center" mb="sm">
            <Text size="lg" fw={600} c="red.5">Произошла ошибка в компоненте</Text>
            <Button variant="light" onClick={this.reset}>Попробовать снова</Button>
          </Group>
          <Text size="sm" fw={500} mb={4}>Сообщение:</Text>
          <Text size="sm" mb="sm" c="red.6">{this.state.error?.message || 'Неизвестная ошибка'}</Text>
          <Text size="sm" fw={500} mb={4}>Стэк:</Text>
          <ScrollArea h={240} offsetScrollbars>
            <Box component="pre" style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.error?.stack || this.state.info?.componentStack || 'Стэк недоступен'}
            </Box>
          </ScrollArea>
        </Paper>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

