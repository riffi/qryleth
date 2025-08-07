import React, { useEffect, useState } from 'react'
import {
  Paper,
  Stack,
  Group,
  Text,
  TextInput,
  NumberInput,
  ColorInput
} from '@mantine/core'
import {
  useSelectedMaterial,
  useSelectedMaterialUuid,
  useObjectStore
} from '../../model/objectStore.ts'
import type { GfxMaterial } from '@/entities/material'

/**
 * Левая панель редактирования свойств материала объекта.
 * Позволяет изменить основные параметры материала и сохранить их.
 */
export const MaterialControlPanel: React.FC = () => {
  const selectedMaterial = useSelectedMaterial()
  const selectedUuid = useSelectedMaterialUuid()
  const { updateMaterial } = useObjectStore()

  // Локальное состояние полей формы
  const [name, setName] = useState('')
  const [color, setColor] = useState('#cccccc')
  const [opacity, setOpacity] = useState(1)
  const [metalness, setMetalness] = useState(0)
  const [roughness, setRoughness] = useState(0.5)
  const [emissive, setEmissive] = useState('#000000')
  const [emissiveIntensity, setEmissiveIntensity] = useState(1)

  /**
   * Немедленно обновляет материал в zustand-хранилище.
   * Используется для применения изменений прямо во время редактирования.
   */
  const applyPropertyUpdates = (
    updates: Partial<GfxMaterial['properties']>
  ) => {
    if (!selectedMaterial) return
    updateMaterial(selectedMaterial.uuid, {
      properties: {
        ...selectedMaterial.properties,
        ...updates
      }
    })
  }

  /**
   * Применение изменения имени материала без валидации.
   * Это позволяет увидеть результат сразу в списке материалов.
   */
  const applyNameUpdate = (newName: string) => {
    if (!selectedMaterial) return
    updateMaterial(selectedMaterial.uuid, { name: newName })
  }

  /**
   * Загружает данные выбранного материала в локальное состояние.
   */
  useEffect(() => {
    if (!selectedMaterial) return

    setName(selectedMaterial.name)
    setColor(selectedMaterial.properties.color)
    setOpacity(selectedMaterial.properties.opacity ?? 1)
    setMetalness(selectedMaterial.properties.metalness ?? 0)
    setRoughness(selectedMaterial.properties.roughness ?? 0.5)
    setEmissive(selectedMaterial.properties.emissive ?? '#000000')
    setEmissiveIntensity(selectedMaterial.properties.emissiveIntensity ?? 1)
  }, [selectedUuid, selectedMaterial])

  if (!selectedMaterial) {
    return (
      <Paper
        shadow="sm"
        p="md"
        style={{ width: 260, height: '100%', borderRadius: 0, borderRight: '1px solid var(--mantine-color-gray-8)' }}
      >
        <Text size="sm" c="dimmed">
          Выберите материал для редактирования
        </Text>
      </Paper>
    )
  }

  return (
    <Paper
      shadow="sm"
      p="md"
      style={{ width: 260, height: '100%', borderRadius: 0, borderRight: '1px solid var(--mantine-color-gray-8)' }}
    >
      <Stack gap="sm" style={{ height: '100%' }}>
        <Group>
          <Text size="lg" fw={500}>
            Материал
          </Text>
        </Group>

        <Stack gap="xs" mt="md" style={{ flex: 1 }}>
          <TextInput
            label="Название"
            size="xs"
            value={name}
            onChange={(e) => {
              const val = e.currentTarget.value
              setName(val)
              applyNameUpdate(val)
            }}
          />
          <ColorInput
            label="Цвет"
            size="xs"
            value={color}
            onChange={(val) => {
              setColor(val)
              applyPropertyUpdates({ color: val })
            }}
            withEyeDropper={false}
          />
          <NumberInput
            label="Прозрачность"
            size="xs"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(v) => {
              const val = v ?? 0
              setOpacity(val)
              applyPropertyUpdates({ opacity: val })
            }}
          />
          <NumberInput
            label="Металличность"
            size="xs"
            min={0}
            max={1}
            step={0.05}
            value={metalness}
            onChange={(v) => {
              const val = v ?? 0
              setMetalness(val)
              applyPropertyUpdates({ metalness: val })
            }}
          />
          <NumberInput
            label="Шероховатость"
            size="xs"
            min={0}
            max={1}
            step={0.05}
            value={roughness}
            onChange={(v) => {
              const val = v ?? 0
              setRoughness(val)
              applyPropertyUpdates({ roughness: val })
            }}
          />
          <ColorInput
            label="Эмиссия"
            size="xs"
            value={emissive}
            onChange={(val) => {
              setEmissive(val)
              applyPropertyUpdates({ emissive: val })
            }}
            withEyeDropper={false}
          />
          <NumberInput
            label="Интенс. эмиссии"
            size="xs"
            min={0}
            step={0.1}
            value={emissiveIntensity}
            onChange={(v) => {
              const val = v ?? 0
              setEmissiveIntensity(val)
              applyPropertyUpdates({ emissiveIntensity: val })
            }}
          />
        </Stack>

        </Stack>
      </Paper>
    )
  }
