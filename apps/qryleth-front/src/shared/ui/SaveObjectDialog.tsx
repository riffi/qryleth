import React, { useState, useEffect } from 'react'
import { Modal, Stack, TextInput, Textarea, Group, Button, Text, Progress } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconX, IconPhoto } from '@tabler/icons-react'

export interface SaveObjectDialogProps {
  opened: boolean
  onClose: () => void
  /**
   * Сохраняет объект и возвращает UUID созданной записи библиотеки
   */
  onSave: (name: string, description?: string) => Promise<string>
  objectName?: string
  /**
   * Колбек для генерации превью объекта (опционально)
   */
  onGeneratePreview?: () => Promise<string | null>
}

export const SaveObjectDialog: React.FC<SaveObjectDialogProps> = ({
  opened,
  onClose,
  onSave,
  objectName,
  onGeneratePreview
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [previewGenerated, setPreviewGenerated] = useState(false)

  useEffect(() => {
    if (opened && objectName && !name) {
      setName(objectName)
    }
    // Сброс состояния превью при открытии диалога
    if (opened) {
      setPreviewGenerated(false)
      setGeneratingPreview(false)
    }
  }, [opened, objectName, name])

  /**
   * Обрабатывает сохранение объекта в библиотеку
   * с автоматической генерацией превью если возможно
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
      // Генерируем превью, если доступен колбек
      if (onGeneratePreview && !generatingPreview && !previewGenerated) {
        setGeneratingPreview(true)
        try {
          const previewResult = await onGeneratePreview()
          setPreviewGenerated(true)
          
          if (!previewResult) {
            console.warn('Не удалось сгенерировать превью, сохранение будет без превью')
          }
        } catch (error) {
          console.error('Ошибка генерации превью:', error)
          // Продолжаем сохранение даже если превью не удалось сгенерировать
        } finally {
          setGeneratingPreview(false)
        }
      }
      
      // Сохраняем объект
      await onSave(name.trim(), description.trim() || undefined)
      setName('')
      setDescription('')
      setPreviewGenerated(false)
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
    setPreviewGenerated(false)
    setGeneratingPreview(false)
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
        
        {/* Индикатор генерации превью */}
        {(generatingPreview || previewGenerated) && (
          <Stack gap="xs">
            <Group gap="xs" align="center">
              <IconPhoto size="1rem" />
              <Text size="sm" fw={500}>
                {generatingPreview ? 'Генерация превью...' : 'Превью готово'}
              </Text>
            </Group>
            {generatingPreview && (
              <Progress
                value={100}
                animated
                size="sm"
                color="blue"
                striped
              />
            )}
          </Stack>
        )}
        
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
