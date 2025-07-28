import React, { useState, useEffect } from 'react'
import { Modal, Stack, TextInput, Textarea, Group, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconX } from '@tabler/icons-react'

export interface SaveObjectDialogProps {
  opened: boolean
  onClose: () => void
  /**
   * Сохраняет объект и возвращает UUID созданной записи библиотеки
   */
  onSave: (name: string, description?: string) => Promise<string>
  objectName?: string
}

export const SaveObjectDialog: React.FC<SaveObjectDialogProps> = ({
  opened,
  onClose,
  onSave,
  objectName
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (opened && objectName && !name) {
      setName(objectName)
    }
  }, [opened, objectName, name])

  /**
   * Обрабатывает сохранение объекта в библиотеку
   * и передаёт введённые данные во внешний обработчик
   */
  const handleSave = async () => {
    if (!name.trim()) {
      notifications.show({
        title: 'Ошибка',
        message: 'Введите название объекта',
        color: 'red',
        icon: <IconX size="1rem" />
      })
      return
    }

    setLoading(true)
    try {
      // Получить UUID сохранённого объекта, но здесь он не используется
      await onSave(name.trim(), description.trim() || undefined)
      setName('')
      setDescription('')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Сбрасывает состояние модального окна и закрывает его
   */
  const handleClose = () => {
    setName('')
    setDescription('')
    onClose()
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="Сохранить объект" size="md">
      <Stack gap="md">
        <TextInput
          label="Название объекта"
          placeholder="Введите название..."
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />
        <Textarea
          label="Описание (необязательно)"
          placeholder="Краткое описание объекта..."
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={3}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSave} loading={loading}>
            Сохранить
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
