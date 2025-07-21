import React, { useState, useEffect } from 'react'
import { Modal, Stack, TextInput, Textarea, Group, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconX } from '@tabler/icons-react'

export interface SaveObjectDialogProps {
  opened: boolean
  onClose: () => void
  onSave: (name: string, description?: string) => Promise<void>
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
      await onSave(name.trim(), description.trim() || undefined)
      setName('')
      setDescription('')
    } finally {
      setLoading(false)
    }
  }

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
