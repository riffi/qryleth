import React, { useEffect, useState } from 'react'
import {
  Paper,
  Stack,
  Group,
  Text,
  TextInput,
  NumberInput,
  ColorInput,
  SegmentedControl,
  Select,
  Slider
} from '@mantine/core'
import {
  useSelectedMaterial,
  useSelectedMaterialUuid,
  useObjectStore
} from '../../model/objectStore.ts'
import type { GfxMaterial } from '@/entities/material'
import type { ColorSource } from '@/entities/palette'

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
  const [emissiveIntensity, setEmissiveIntensity] = useState(0)
  // Источник цвета
  const [colorSourceType, setColorSourceType] = useState<'fixed' | 'role'>('fixed')
  const [role, setRole] = useState<string>('wood')
  const [tint, setTint] = useState<number>(0)

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
    // Если интенсивность эмиссии у материала не задана, используем 0 по умолчанию,
    // чтобы исключить ненамеренное свечение при первичном создании материала
    setEmissiveIntensity(selectedMaterial.properties.emissiveIntensity ?? 0)

    const src = (selectedMaterial.properties as any).colorSource as ColorSource | undefined
    if (!src || src.type === 'fixed') {
      setColorSourceType('fixed')
      setRole('wood')
      setTint(0)
    } else if (src.type === 'role') {
      setColorSourceType('role')
      setRole(src.role)
      setTint(src.tint ?? 0)
    }
  }, [selectedUuid, selectedMaterial])

  if (!selectedMaterial) {
    return (
      <Paper
        shadow="sm"
        p="md"
        // Панель материалов должна занимать всю доступную ширину левой панели
        style={{ width: '100%', height: '100%', borderRadius: 0 }}
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
      // Занимаем всю ширину родительской левой панели (которая управляет своей шириной)
      style={{ width: '100%', height: '100%', borderRadius: 0 }}
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
          <Group gap="xs">
            <SegmentedControl
              size="xs"
              data={[{ label: 'Fixed', value: 'fixed' }, { label: 'Role', value: 'role' }]}
              value={colorSourceType}
              onChange={(v) => {
                const next = v as 'fixed' | 'role'
                setColorSourceType(next)
                if (next === 'fixed') {
                  applyPropertyUpdates({ colorSource: { type: 'fixed' } as any })
                } else {
                  applyPropertyUpdates({ colorSource: { type: 'role', role: (role as any), tint } as any })
                }
              }}
            />
          </Group>

          {colorSourceType === 'fixed' && (
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
          )}

          {colorSourceType === 'role' && (
            <>
              <Select
                label="Роль палитры"
                size="xs"
                value={role}
                data={['sky','fog','water','foliage','wood','rock','metal','sand','ground','snow','accent'].map(r => ({ value: r, label: r }))}
                onChange={(v) => {
                  const value = v || 'wood'
                  setRole(value)
                  applyPropertyUpdates({ colorSource: { type: 'role', role: value as any, tint } as any })
                }}
                withinPortal={false}
              />
              <Group gap="xs">
                <Text size="xs" c="dimmed">Tint (HSV Value)</Text>
                <Slider
                  size="xs"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={tint}
                  onChange={(val) => {
                    setTint(val)
                    applyPropertyUpdates({ colorSource: { type: 'role', role: role as any, tint: val } as any })
                  }}
                  style={{ flex: 1 }}
                />
              </Group>
            </>
          )}
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
