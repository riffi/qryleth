import { notifications } from '@mantine/notifications'

export type ErrorHandler = (error: unknown, message?: string) => void

export function useErrorHandler(): ErrorHandler {
  return (error: unknown, message = 'Произошла ошибка') => {
    // TODO: integrate real logging system (e.g., Sentry)
    console.error(error)
    notifications.show({
      title: 'Ошибка',
      message,
      color: 'red'
    })
  }
}
