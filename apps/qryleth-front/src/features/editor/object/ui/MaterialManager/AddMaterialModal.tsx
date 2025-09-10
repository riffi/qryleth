import React, { useState } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  ColorInput,
  Button,
  Group,
  Select,
  Switch,
  Collapse,
  Divider,
  Text
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
  const [role, setRole] = useState<string>('wood')
  const [useManualHex, setUseManualHex] = useState(false)

  /**
   * Сбрасывает состояние и закрывает модальное окно.
   */
  const handleClose = () => {
    setName('')
    setColor('#cccccc')
    setRole('wood')
    setUseManualHex(false)
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
        // Базовый цвет хранится всегда как fallback для отрисовки без палитры
        color,
        opacity: 1,
        transparent: false,
        metalness: 0,
        roughness: 0.5,
        // По умолчанию интенсивность эмиссии у нового материала равна нулю,
        // чтобы материал не светился, если пользователь не задал эмиссию явно
        emissiveIntensity: 0,
        // Источник цвета: по умолчанию — роль палитры; при выборе ручного HEX — fixed
        colorSource: useManualHex
          ? ({ type: 'fixed' } as any)
          : ({ type: 'role', role: role as any } as any)
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
        {/*
         * Выбор роли палитры. Эта настройка задаёт источник цвета "role" для материала.
         * Слайдер Tint намеренно отсутствует в модалке и доступен только в панели "Свойства".
         */}
        <Select
          label="Роль палитры"
          value={role}
          data={['sky','fog','water','foliage','wood','rock','metal','sand','ground','snow','accent'].map(r => ({ value: r, label: r }))}
          onChange={(v) => setRole(v || 'wood')}
          withinPortal={false}
        />

        <Divider label={<Text size="xs" c="dimmed">Дополнительно</Text>} labelPosition="left" />
        <Switch
          size="sm"
          checked={useManualHex}
          onChange={(e) => setUseManualHex(e.currentTarget.checked)}
          label="Использовать ручной HEX (вместо палитры)"
        />
        <Collapse in={useManualHex}>
          <ColorInput
            label="Цвет (HEX)"
            value={color}
            onChange={setColor}
            withEyeDropper={false}
          />
        </Collapse>
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
