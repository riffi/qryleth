import React, { useEffect, useState, useMemo } from 'react'
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
import type { NumberFormatValues, SourceInfo } from 'react-number-format'
import {
  useObjectStore,
  useSelectedGroupUuids,
  useObjectPrimitives,
  useObjectPrimitiveGroups,
  usePrimitiveGroupAssignments
} from '../../model/objectStore.ts'
import { getGroupCenter } from '@/entities/primitiveGroup/lib/coordinateUtils'
import type { Vector3 } from '@/shared/types'

export interface GroupControlPanelProps {
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
 * Боковая панель управления выбранными группами примитивов.
 * Содержит редакторы координат для трансформации групп.
 */
export const GroupControlPanel: React.FC<GroupControlPanelProps> = ({ onClose, onSave }) => {
  const selectedGroupUuids = useSelectedGroupUuids()
  const primitives = useObjectPrimitives()
  const primitiveGroups = useObjectPrimitiveGroups()
  const primitiveGroupAssignments = usePrimitiveGroupAssignments()

  /**
   * Получение выбранной группы для редактирования (только одна группа)
   */
  const getSelectedGroup = () => {
    return selectedGroupUuids.length === 1
      ? primitiveGroups[selectedGroupUuids[0]] || null
      : null
  }

  const selectedGroup = getSelectedGroup()

  /**
   * Вычисление средних значений трансформации всех примитивов группы
   */
  const getGroupTransform = useMemo(() => {
    if (!selectedGroup) return null

    // Если у группы есть своя трансформация, используем её
    if (selectedGroup.transform) {
      return {
        position: selectedGroup.transform.position || [0, 0, 0],
        rotation: selectedGroup.transform.rotation || [0, 0, 0],
        scale: selectedGroup.transform.scale || [1, 1, 1]
      }
    }

    console.log('selectedGroup.transform', selectedGroup.transform)

    const groupUuid = selectedGroup.uuid
    const groupPrimitives = primitives.filter(p =>
      primitiveGroupAssignments[p.uuid] === groupUuid
    )

    if (groupPrimitives.length === 0) {
      return {
        position: [0, 0, 0] as Vector3,
        rotation: [0, 0, 0] as Vector3,
        scale: [1, 1, 1] as Vector3
      }
    }



    // Иначе вычисляем геометрический центр
    const center = getGroupCenter(groupUuid, primitives, primitiveGroups, primitiveGroupAssignments)


    return {
      position: center,
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    }
  }, [selectedGroup, primitives, primitiveGroups, primitiveGroupAssignments])

  /**
   * Обновление трансформации группы
   */
  const updateGroupTransform = (
    property: 'position' | 'rotation' | 'scale',
    axis: 0 | 1 | 2,
    value: number
  ) => {
    if (!selectedGroup) return

    // Получаем текущую трансформацию группы
    const currentTransform = selectedGroup.transform || {}
    const currentProperty: Vector3 = currentTransform[property] || (property === 'scale' ? [1, 1, 1] : [0, 0, 0])

    const newProperty: Vector3 = [...currentProperty]
    newProperty[axis] = value

    // Обновляем группу в store
    const updatedGroup = {
      ...selectedGroup,
      transform: {
        ...currentTransform,
        [property]: newProperty
      }
    }

    useObjectStore.getState().primitiveGroups[selectedGroup.uuid] = updatedGroup
    useObjectStore.setState({
      primitiveGroups: {
        ...useObjectStore.getState().primitiveGroups,
        [selectedGroup.uuid]: updatedGroup
      }
    })
  }

  /**
   * Сброс трансформации группы
   */
  const resetTransform = (property: 'position' | 'rotation' | 'scale') => {
    if (!selectedGroup) return

    const defaultValue: Vector3 = property === 'scale'
      ? [1, 1, 1]
      : [0, 0, 0]

    const currentTransform = selectedGroup.transform || {}
    const updatedGroup = {
      ...selectedGroup,
      transform: {
        ...currentTransform,
        [property]: defaultValue
      }
    }

    useObjectStore.setState({
      primitiveGroups: {
        ...useObjectStore.getState().primitiveGroups,
        [selectedGroup.uuid]: updatedGroup
      }
    })
  }

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
          onValueChange={(vals: NumberFormatValues, info: SourceInfo) => {
            const num =
              property === 'rotation'
                ? degToRad(Number(vals.value) || 0)
                : Number(vals.value) || 0
            setInputValue(num)
            // Если изменение произошло через стрелки или кнопки шага,
            // обновляем состояние немедленно
            if (info.source !== 'event') {
              onCommit(property, index, num)
            }
          }}
          onBlur={commitValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitValue()
          }}
          step={property === 'scale' ? 0.1 : property === 'rotation' ? 1 : 0.01}
          decimalScale={property === 'rotation' ? 1 : 2}
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
    values: Vector3
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
      {Array.isArray(values) && <Group gap="xs">
        {values?.map((value, index) => (
          <TransformInput
            key={index}
            index={index as 0 | 1 | 2}
            label={labels[index]}
            property={property}
            value={value}
            onCommit={updateGroupTransform}
          />
        ))}
      </Group>}
      {JSON.stringify(values)}
    </Box>
  )

  if (!selectedGroup || !getGroupTransform) return null

  return (
    <Paper
      shadow="sm"
      p="md"
      style={{ width: "100%", height: '100%', borderRadius: 0, borderRight: '1px solid var(--mantine-color-gray-8)' }}
    >
      <Stack gap="sm" style={{ height: '100%' }}>
        <Group>
          <Text size="lg" fw={500}>Трансформации группы</Text>
        </Group>

        <Box>
          <Text size="sm" c="dimmed" mb="md">
            Группа: {selectedGroup.name}
          </Text>
        </Box>

        <Stack gap="md" mt="md">
          <TransformBlock
            label="Position"
            property="position"
            values={getGroupTransform.position}
          />
          <TransformBlock
            label="Rotation"
            property="rotation"
            values={getGroupTransform.rotation}
          />
          <TransformBlock
            label="Scale"
            property="scale"
            values={getGroupTransform.scale}
          />
        </Stack>

        {selectedGroupUuids.length > 1 && (
          <Text size="sm" c="dimmed" mt="md">
            Выбрано групп: {selectedGroupUuids.length}
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
