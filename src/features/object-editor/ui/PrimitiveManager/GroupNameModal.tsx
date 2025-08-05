import React, { useState, useEffect } from 'react'
import { Modal, Stack, TextInput, Group, Button } from '@mantine/core'

interface GroupNameModalProps {
  opened: boolean
  initialName?: string
  title: string
  confirmLabel: string
  onClose: () => void
  onSubmit: (name: string) => void
}

/**
 * Модальное окно ввода названия группы примитивов.
 * Используется как при создании новой группы, так и при её переименовании.
 */
export const GroupNameModal: React.FC<GroupNameModalProps> = ({
  opened,
  initialName = '',
  title,
  confirmLabel,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState(initialName)

  // Обновляем поле ввода при открытии модального окна
  useEffect(() => {
    if (opened) {
      setName(initialName)
    }
  }, [opened, initialName])

  /**
   * Закрывает модальное окно и сбрасывает локальное состояние
   */
  const handleClose = () => {
    setName(initialName)
    onClose()
  }

  /**
   * Проверяет корректность введённого названия и передает его во внешний обработчик
   */
  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    handleClose()
  }

  return (
    <Modal opened={opened} onClose={handleClose} title={title} size="sm">
      <Stack gap="md">
        <TextInput
          label="Название"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Введите название"
          autoFocus
        />
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit}>{confirmLabel}</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

