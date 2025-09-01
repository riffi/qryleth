import React, { useState, useEffect } from 'react'
import { Modal, Stack, TextInput, Textarea, Group, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'

interface SaveModalProps {
  opened: boolean
  onClose: () => void
  onSave: (name: string, description?: string) => Promise<boolean> | boolean
  currentSceneName?: string
}

/**
 * Презентационный модал сохранения сцены. Не содержит бизнес‑логики сохранения —
 * только собирает имя/описание и вызывает onSave.
 */
export const SaveModal: React.FC<SaveModalProps> = ({ opened, onClose, onSave, currentSceneName }) => {
  const [sceneName, setSceneName] = useState('')
  const [sceneDescription, setSceneDescription] = useState('')

  useEffect(() => {
    setSceneName(currentSceneName || '')
    setSceneDescription('')
  }, [currentSceneName, opened])

  const handleSave = async () => {
    if (!sceneName.trim()) {
      notifications.show({ title: 'Ошибка', message: 'Введите название сцены', color: 'red' })
      return
    }
    const ok = await onSave(sceneName, sceneDescription || undefined)
    if (ok) {
      onClose()
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Сохранить сцену" centered size="md">
      <Stack gap="md">
        <TextInput label="Название сцены" placeholder="Например, Лесная поляна" value={sceneName} onChange={(e) => setSceneName(e.currentTarget.value)} />
        <Textarea label="Описание (необязательно)" placeholder="Краткое описание" value={sceneDescription} onChange={(e) => setSceneDescription(e.currentTarget.value)} minRows={3} autosize />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

