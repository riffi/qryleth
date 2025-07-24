import React, { useEffect, useState } from 'react'
import {
  Paper,
  Box,
  Stack,
  Group,
  Button,
  Text,
  ActionIcon,
  NumberInput
} from '@mantine/core'
import { IconX, IconCheck, IconRefresh } from '@tabler/icons-react'
import {
  useObjectStore,
  useObjectPrimitives,
  useObjectSelectedPrimitiveIds
} from '../model/objectStore'
import { getPrimitiveDisplayName } from '@/entities/primitive'

export interface PrimitiveControlPanelProps {
  onClose: () => void
  onSave: () => void
}

/**
 * Перевод радиан в градусы для отображения значения пользователю.
 * @param rad значение в радианах
 * @returns значение в градусах
 */
const radToDeg = (rad: number): number => (rad * 180) / Math.PI

/**
 * Перевод градусов в радианы перед сохранением в состояние.
 * @param deg значение в градусах
 * @returns значение в радианах
 */
const degToRad = (deg: number): number => (deg * Math.PI) / 180

/**
 * Боковая панель управления выбранными примитивами объекта.
 * Содержит список примитивов, выбор режима трансформации и редакторы координат.
 */
export const PrimitiveControlPanel: React.FC<PrimitiveControlPanelProps> = ({ onClose, onSave }) => {
  const primitives = useObjectPrimitives()
  const selectedPrimitiveIds = useObjectSelectedPrimitiveIds()

  /**
   * Выбор активного примитива для редактирования.
   */
  const handleSelectPrimitives = (indices: number[]) => {
    useObjectStore.getState().setSelectedPrimitives(indices)
  }

  /**
   * Получение текущих трансформаций выбранного примитива
   */
  const getSelectedPrimitive = () => {
    return selectedPrimitiveIds.length === 1 ? primitives[selectedPrimitiveIds[0]] || null : null
  }

  /**
   * Обновление трансформаций примитива
   */
  const updatePrimitiveTransform = (
    property: 'position' | 'rotation' | 'scale',
    axis: 0 | 1 | 2,
    value: number
  ) => {
    const primitive = getSelectedPrimitive()
    if (!primitive) return

    const currentValue = primitive[property] || (property === 'scale' ? [1, 1, 1] : [0, 0, 0])
    const newValue = [...currentValue] as [number, number, number]
    newValue[axis] = value

    if (selectedPrimitiveIds.length === 1) {
      useObjectStore.getState().updatePrimitive(selectedPrimitiveIds[0], {
        [property]: newValue
      })
    }
  }

  /**
   * Сброс трансформаций
   */
  const resetTransform = (property: 'position' | 'rotation' | 'scale') => {
    if (selectedPrimitiveIds.length === 1) {
      const defaultValue = property === 'scale' ? [1, 1, 1] : [0, 0, 0]
      useObjectStore.getState().updatePrimitive(selectedPrimitiveIds[0], {
        [property]: defaultValue
      })
    }
  }

  const selectedPrimitiveData = getSelectedPrimitive()

  /**
   * Поле ввода трансформаций. Применяет значение по завершению ввода.
   */
  const TransformInput: React.FC<{
    label: string
    property: 'position' | 'rotation' | 'scale'
    index: 0 | 1 | 2
    value: number
    onCommit: (
      property: 'position' | 'rotation' | 'scale',
      axis: 0 | 1 | 2,
      value: number
    ) => void
  }> = ({ label, property, index, value, onCommit }) => {
    const [inputValue, setInputValue] = useState<number>(value)

    // Синхронизация локального состояния при изменении значения из хранилища
    useEffect(() => {
      setInputValue(value)
    }, [value])

    // Передача нового значения в хранилище
    const commitValue = () => {
      onCommit(property, index, inputValue)
    }

    return (
      <Box style={{ flex: 1 }}>
        <Text size="xs" c="dimmed" mb={2}>{label}</Text>
        <NumberInput
          size="xs"
          value={property === 'rotation' ? radToDeg(inputValue) : inputValue}
          onChange={(val) => {
            const num =
              property === 'rotation'
                ? degToRad(Number(val) || 0)
                : Number(val) || 0
            setInputValue(num)
          }}
          onBlur={commitValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitValue()
          }}
          step={property === 'scale' ? 0.1 : property === 'rotation' ? 1 : 0.01}
          precision={property === 'rotation' ? 1 : 2}
          styles={{
            input: {
              textAlign: 'center',
              fontSize: '11px',
              height: '24px',
              minHeight: '24px'
            }
          }}
        />
      </Box>
    )
  }

  /**
   * Компонент блока управления трансформациями в Unity-стиле
   */
  const TransformBlock = ({
    label,
    property,
    values,
    labels = ['X', 'Y', 'Z']
  }: {
    label: string
    property: 'position' | 'rotation' | 'scale'
    values: [number, number, number]
    labels?: string[]
  }) => (
    <Box>
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500}>{label}</Text>
        <ActionIcon
          size="xs"
          variant="subtle"
          color="gray"
          onClick={() => resetTransform(property)}
        >
          <IconRefresh size={12} />
        </ActionIcon>
      </Group>
      <Group gap="xs">
        {values.map((value, index) => (
          <TransformInput
            key={index}
            index={index as 0 | 1 | 2}
            label={labels[index]}
            property={property}
            value={value}
            onCommit={updatePrimitiveTransform}
          />
        ))}
      </Group>
    </Box>
  )

  return (
    <Paper
      shadow="sm"
      p="md"
      style={{ width: 260, height: '100%', borderRadius: 0, borderRight: '1px solid var(--mantine-color-gray-8)' }}
    >
      <Stack gap="sm" style={{ height: '100%' }}>
        <Group>
          <Text size="lg" fw={500}>Трансформации</Text>
        </Group>

        {selectedPrimitiveData && (
          <Stack gap="md" mt="md">
            <TransformBlock
              label="Position"
              property="position"
              values={selectedPrimitiveData.position || [0, 0, 0]}
            />
            <TransformBlock
              label="Rotation"
              property="rotation"
              values={selectedPrimitiveData.rotation || [0, 0, 0]}
            />
            <TransformBlock
              label="Scale"
              property="scale"
              values={selectedPrimitiveData.scale || [1, 1, 1]}
            />
          </Stack>
        )}
        {selectedPrimitiveIds.length > 1 && (
          <Text size="sm" c="dimmed" mt="md">
            Выбрано {selectedPrimitiveIds.length} примитивов
          </Text>
        )}
        <Group gap="xs" mt="auto">
          <Button variant="light" color="gray" onClick={onClose} leftSection={<IconX size={16} />} style={{ flex: 1 }}>
            Отмена
          </Button>
          <Button onClick={onSave} leftSection={<IconCheck size={16} />} style={{ flex: 1 }}>
            Сохранить
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}
