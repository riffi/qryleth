import React, { memo } from 'react'
import { Modal, Stack, TextInput, Group, Button } from '@mantine/core'

interface SaveScriptModalProps {
  opened: boolean
  onClose: () => void
  isEditing: boolean
  scriptName: string
  scriptDescription: string
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onSave: () => void
}

export const SaveScriptModal = memo<SaveScriptModalProps>(({
  opened,
  onClose,
  isEditing,
  scriptName,
  scriptDescription,
  onNameChange,
  onDescriptionChange,
  onSave
}) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? 'Редактировать скрипт' : 'Сохранить скрипт'}
    >
      <Stack gap="md">
        <TextInput
          label="Название скрипта"
          value={scriptName}
          onChange={(e) => onNameChange(e.currentTarget.value)}
          required
        />
        <TextInput
          label="Описание (опционально)"
          value={scriptDescription}
          onChange={(e) => onDescriptionChange(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={onSave}>
            Сохранить
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
})