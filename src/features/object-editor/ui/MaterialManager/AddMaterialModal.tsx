import React, { useState } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  ColorInput,
  Button,
  Group
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import type { CreateGfxMaterial } from '@/entities/material'

export interface AddMaterialModalProps {
  opened: boolean
  onClose: () => void
  onAdd: (material: CreateGfxMaterial) => void
  isNameUnique: (name: string) => boolean
}

/**
 * Модальное окно создания нового материала объекта.
 * Позволяет ввести название и выбрать базовый цвет.
 */
export const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  opened,
  onClose,
  onAdd,
  isNameUnique
}) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#cccccc')

  /**
   * Сбрасывает состояние и закрывает модальное окно.
   */
  const handleClose = () => {
    setName('')
    setColor('#cccccc')
    onClose()
  }

  /**
   * Проверяет данные и создаёт материал с параметрами по умолчанию.
   * Показывает уведомление, если имя не уникально.
   */
  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) return

    if (!isNameUnique(trimmed)) {
      notifications.show({
        title: 'Ошибка',
        message: 'Материал с таким именем уже существует',
        color: 'red'
      })
      return
    }

    const newMaterial: CreateGfxMaterial = {
      name: trimmed,
      type: 'custom',
      properties: {
        color,
        opacity: 1,
        transparent: false,
        metalness: 0,
        roughness: 0.5
      },
      isGlobal: false
    }

    onAdd(newMaterial)
    handleClose()
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="Новый материал" size="sm">
      <Stack gap="md">
        <TextInput
          label="Название"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Введите название"
          autoFocus
        />
        <ColorInput
          label="Цвет"
          value={color}
          onChange={setColor}
          withEyeDropper={false}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Отмена
          </Button>
          <Button onClick={handleCreate}>Создать</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
