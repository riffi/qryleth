import React, { useEffect, useState } from 'react'
import {
  Paper,
  Box,
  Stack,
  Group,
  MultiSelect,
  SegmentedControl,
  Button,
  Badge,
  Title,
  NumberInput,
  Text,
  ActionIcon
} from '@mantine/core'
import { IconX, IconCheck, IconArrowRightBar, IconRotate, IconResize, IconRefresh } from '@tabler/icons-react'
import { ObjectScene3D } from './ObjectScene3D'
import {
  useObjectStore,
  useObjectPrimitives,
  useObjectSelectedPrimitiveIds
} from '../model/objectStore'
import { getPrimitiveDisplayName } from '@/entities/primitive'
import type { SceneObject } from '@/entities/scene/types.ts'

interface ObjectEditorR3FProps {
  onClose: () => void
  onSave: (
    objectUuid: string,
    primitiveStates: Record<number, { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }>
  ) => void
  objectInfo?: { name: string; objectUuid: string }
  instanceId?: string
  objectData?: SceneObject
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
 * Редактор объекта на базе React Three Fiber.
 * Используется как самостоятельный компонент без модального окна.
 * Управление открытием/закрытием осуществляется родительским компонентом.
 */
export const ObjectEditorR3F: React.FC<ObjectEditorR3FProps> = ({
  onClose,
  onSave,
  objectInfo,
  instanceId,
  objectData
}) => {
  const primitives = useObjectPrimitives()
  const selectedPrimitiveIds = useObjectSelectedPrimitiveIds()
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe'>('solid')

  // Инициализация хранилища примитивов при получении данных объекта
  useEffect(() => {
    if (!objectData) return

    useObjectStore.getState().clearScene()
    useObjectStore.getState().setPrimitives(
      objectData.primitives.map(p => ({ ...p }))
    )

    useObjectStore.getState().selectPrimitive(0)
  }, [objectData])

  /**
   * Сохраняет изменения и передаёт их во внешний обработчик.
   */
  const handleSave = () => {
    if (!objectInfo?.objectUuid) return
    const state = useObjectStore.getState()
    const primitiveStates: Record<number, { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }> = {}

    state.primitives.forEach((p, idx) => {
      primitiveStates[idx] = {
        position: (p.position || [0, 0, 0]) as [number, number, number],
        rotation: (p.rotation || [0, 0, 0]) as [number, number, number],
        scale: (p.scale || [1, 1, 1]) as [number, number, number]
      }
    })

    onSave(objectInfo.objectUuid, primitiveStates)
    onClose()
  }

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
  const updatePrimitiveTransform = (property: 'position' | 'rotation' | 'scale', axis: 0 | 1 | 2, value: number) => {
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
          <Box key={index} style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" mb={2}>{labels[index]}</Text>
            <NumberInput
              size="xs"
              value={property === 'rotation' ? radToDeg(value) : value}
              onChange={(val) =>
                updatePrimitiveTransform(
                  property,
                  index as 0 | 1 | 2,
                  property === 'rotation' ? degToRad(Number(val) || 0) : Number(val) || 0
                )
              }
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
        ))}
      </Group>
    </Box>
  )

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Group gap="sm" p="md">
        <Title order={3}>{objectInfo ? `Редактор объекта: ${objectInfo.name}` : 'Новый объект'}</Title>
        {renderMode === 'wireframe' && (
          <Badge color="orange" variant="light">Wireframe</Badge>
        )}
      </Group>
      <Box style={{ flex: 1, display: 'flex' }}>
        <Paper
          shadow="sm"
          p="md"
          style={{ width: 260, height: '100%', borderRadius: 0, borderRight: '1px solid var(--mantine-color-gray-3)' }}
        >
          <Stack gap="sm">
            <Title order={4}>Примитивы</Title>
            <MultiSelect
              value={selectedPrimitiveIds.map(i => i.toString())}
              onChange={(values) => handleSelectPrimitives(values.map(v => parseInt(v)))}
              data={primitives.map((p, i) => ({
                value: i.toString(),
                label: getPrimitiveDisplayName(p, i)
              }))}
              size="sm"
            />
            <SegmentedControl
              value={transformMode}
              onChange={(v) => {
                setTransformMode(v as any)
                useObjectStore.getState().setTransformMode(v as any)
              }}
              data={[
                { value: 'translate', label: <IconArrowRightBar size={16} /> },
                { value: 'rotate', label: <IconRotate size={16} /> },
                { value: 'scale', label: <IconResize size={16} /> }
              ]}
              size="xs"
            />
            <SegmentedControl
              value={renderMode}
              onChange={(v) => {
                setRenderMode(v as any)
                useObjectStore.getState().setRenderMode(v as any)
              }}
              data={[
                { value: 'solid', label: 'Solid' },
                { value: 'wireframe', label: 'Wireframe' }
              ]}
              size="xs"
            />

            {/* Блоки управления трансформациями */}
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
              <Button onClick={handleSave} leftSection={<IconCheck size={16} />} style={{ flex: 1 }}>
                Сохранить
              </Button>
            </Group>
          </Stack>
        </Paper>
        <Box style={{ flex: 1, position: 'relative' }}>
          <ObjectScene3D />
        </Box>
      </Box>
    </Box>
  )
}
