/**
 * Модальное окно для редактирования текста фазы в содержимом задачи
 */
import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import {
  Modal,
  Stack,
  Title,
  Button,
  Group,
  Box,
  Text
} from '@mantine/core'
import {
  IconDeviceFloppy
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

interface PhaseEditModalProps {
  /**
   * Открыто ли модальное окно
   */
  opened: boolean
  /**
   * Функция закрытия модального окна
   */
  onClose: () => void
  /**
   * Номер фазы
   */
  phaseNumber: number
  /**
   * Заголовок фазы для отображения
   */
  phaseTitle: string
  /**
   * Текущий текст фазы из содержимого задачи
   */
  phaseText: string
  /**
   * Функция сохранения изменений фазы
   */
  onSave: (phaseNumber: number, newText: string) => Promise<void>
}

export function PhaseEditModal({
  opened,
  onClose,
  phaseNumber,
  phaseTitle,
  phaseText,
  onSave
}: PhaseEditModalProps) {
  // Состояние компонента
  const [editedText, setEditedText] = useState(phaseText)
  const [saving, setSaving] = useState(false)

  /**
   * Обработчик сохранения изменений
   */
  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave(phaseNumber, editedText)
      notifications.show({
        title: 'Фаза обновлена',
        message: `Фаза ${phaseNumber} успешно обновлена`,
        color: 'green'
      })
      onClose()
    } catch (error) {
      notifications.show({
        title: 'Ошибка сохранения',
        message: error instanceof Error ? error.message : 'Не удалось сохранить изменения',
        color: 'red'
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Обработчик отмены редактирования
   */
  const handleCancel = () => {
    setEditedText(phaseText)
    onClose()
  }

  // Сброс состояния при открытии модального окна
  useEffect(() => {
    if (opened) {
      setEditedText(phaseText)
    }
  }, [opened, phaseText])

  return (
    <Modal
      opened={opened}
      onClose={handleCancel}
      title={
        <Title order={3}>
          Редактировать {phaseTitle}
        </Title>
      }
      size="xl"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Редактируйте текст фазы, который будет сохранен в содержимом задачи
        </Text>

        {/* Monaco Editor для редактирования текста фазы */}
        <Box
          style={{
            border: '1px solid var(--mantine-color-gray-3)',
            borderRadius: '8px',
            overflow: 'hidden',
            width: '100%'
          }}
        >
          <Editor
            width="100%"
            height="400px"
            language="markdown"
            theme="vs"
            value={editedText}
            onChange={(value) => setEditedText(value || '')}
            options={{
              minimap: { enabled: false },
              lineNumbers: 'on',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: 14,
              fontFamily: 'Monaco, "Cascadia Code", "Fira Code", Consolas, monospace',
              tabSize: 2,
              insertSpaces: true,
              renderWhitespace: 'boundary',
              folding: true,
              bracketPairColorization: { enabled: true },
              padding: { top: 10, bottom: 10 }
            }}
          />
        </Box>

        {/* Действия */}
        <Group justify="flex-end">
          <Button variant="light" onClick={handleCancel}>
            Отмена
          </Button>
          <Button
            leftSection={<IconDeviceFloppy />}
            color="green"
            loading={saving}
            onClick={handleSave}
          >
            Сохранить
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}