import React, { useEffect, useState, useMemo } from 'react'
import {
  Paper,
  Box,
  Stack,
  Group,
  Button,
  Text,
  ActionIcon,
  NumberInput,
  Select
} from '@mantine/core'
import { IconX, IconCheck, IconRefresh } from '@tabler/icons-react'
import type { NumberFormatValues, SourceInfo } from 'react-number-format'
import {
  useObjectStore,
  useObjectPrimitives,
  useObjectSelectedPrimitiveIds,
  useObjectMaterials
} from '../../model/objectStore.ts'
import type { GfxPrimitive } from '@/entities/primitive'
import { materialRegistry } from '@/shared/lib/materials/MaterialRegistry'

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
  const objectMaterials = useObjectMaterials()

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
    return selectedPrimitiveIds.length === 1
      ? primitives[selectedPrimitiveIds[0]] || null
      : null
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

    const currentValue =
      primitive.transform?.[property] ||
      (property === 'scale' ? [1, 1, 1] : [0, 0, 0])
    const newValue = [...currentValue] as [number, number, number]
    newValue[axis] = value

    if (selectedPrimitiveIds.length === 1) {
      useObjectStore.getState().updatePrimitive(selectedPrimitiveIds[0], {
        transform: {
          ...primitive.transform,
          [property]: newValue
        }
      })
    }
  }

  /**
   * Сброс трансформаций
   */
  const resetTransform = (property: 'position' | 'rotation' | 'scale') => {
    if (selectedPrimitiveIds.length === 1) {
      const defaultValue = property === 'scale' ? [1, 1, 1] : [0, 0, 0]
      const primitive = getSelectedPrimitive()
      if (!primitive) return
      useObjectStore.getState().updatePrimitive(selectedPrimitiveIds[0], {
        transform: {
          ...primitive.transform,
          [property]: defaultValue
        }
      })
    }
  }

  const selectedPrimitiveData = getSelectedPrimitive()

  /**
   * Получает список доступных материалов для выбора
   * Мемоизирован для оптимизации производительности
   */
  const availableMaterials = useMemo(() => {
    const globals  = materialRegistry.getGlobalMaterials() ?? [];
    const locals   = objectMaterials           ?? [];

    return [
      {
        group: 'Глобальные материалы',
        items: globals.map((m) => ({
          value: m.uuid,
          label: m.name,
        })),
      },
      {
        group: 'Материалы объекта',
        items: locals.map((m) => ({
          value: m.uuid,
          label: m.name,
        })),
      },
    ] satisfies (string | { value: string; label: string } | { group: string; items: any })[];
  }, [objectMaterials]);

  /**
   * Получает текущий выбранный материал примитива
   */
  const getCurrentMaterialUuid = () => {
    const primitive = getSelectedPrimitive()
    if (!primitive) return null

    return primitive.globalMaterialUuid || primitive.objectMaterialUuid || null
  }

  /**
   * Обновляет геометрию выделенного примитива.
   * Изменяет указанный параметр в объекте geometry.
   *
   * @param field имя изменяемого параметра
   * @param value новое значение
   */
  const updatePrimitiveGeometry = (field: string, value: number) => {
    if (selectedPrimitiveIds.length === 1) {
      const primitive = getSelectedPrimitive()
      if (!primitive) return
      useObjectStore.getState().updatePrimitive(selectedPrimitiveIds[0], {
        geometry: {
          ...(primitive.geometry as any),
          [field]: value
        }
      })
    }
  }

  /**
   * Обновляет материал выделенного примитива.
   * @param materialUuid UUID материала или null для сброса
   */
  const handleMaterialChange = (materialUuid: string | null) => {
    if (selectedPrimitiveIds.length === 1) {
      const primitive = getSelectedPrimitive()
      if (!primitive) return

      // Определяем тип материала (глобальный или объекта)
      const globalMaterials = materialRegistry.getGlobalMaterials()
      const isGlobalMaterial = globalMaterials.some(m => m.uuid === materialUuid)

      const updates: Partial<GfxPrimitive> = {}

      if (materialUuid) {
        if (isGlobalMaterial) {
          updates.globalMaterialUuid = materialUuid
          updates.objectMaterialUuid = undefined
        } else {
          updates.objectMaterialUuid = materialUuid
          updates.globalMaterialUuid = undefined
        }
      } else {
        // Сброс материала
        updates.globalMaterialUuid = undefined
        updates.objectMaterialUuid = undefined
      }

      // Очищаем устаревший материал, чтобы не перекрывать выбранный
      updates.material = undefined

      useObjectStore.getState().updatePrimitive(selectedPrimitiveIds[0], updates)
    }
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
   * Поле ввода параметров геометрии примитива.
   * Значение записывается в хранилище сразу при изменении.
   */
  const GeometryInput: React.FC<{
    label: string
    field: string
    value: number
    step?: number
    min?: number
  }> = ({ label, field, value, step = 0.1, min }) => (
    <NumberInput
      size="xs"
      label={label}
      value={value}
      step={step}
      min={min}
      onChange={(val) => updatePrimitiveGeometry(field, val || 0)}
    />
  )

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

  /**
   * Генерирует набор полей ввода для редактирования геометрии примитива.
   */
  const GeometryBlock: React.FC<{ primitive: GfxPrimitive }> = ({ primitive }) => {
    switch (primitive.type) {
      case 'box':
        return (
          <Stack gap="xs">
            <GeometryInput label="Ширина" field="width" value={primitive.geometry.width} min={0.1} />
            <GeometryInput label="Высота" field="height" value={primitive.geometry.height} min={0.1} />
            <GeometryInput label="Глубина" field="depth" value={primitive.geometry.depth} min={0.1} />
          </Stack>
        )
      case 'sphere':
        return (
          <GeometryInput label="Радиус" field="radius" value={primitive.geometry.radius} min={0.1} />
        )
      case 'cylinder':
        return (
          <Stack gap="xs">
            <GeometryInput label="Радиус верха" field="radiusTop" value={primitive.geometry.radiusTop} min={0.1} />
            <GeometryInput label="Радиус низа" field="radiusBottom" value={primitive.geometry.radiusBottom} min={0.1} />
            <GeometryInput label="Высота" field="height" value={primitive.geometry.height} min={0.1} />
            <GeometryInput label="Сегменты" field="radialSegments" value={primitive.geometry.radialSegments ?? 16} step={1} min={3} />
          </Stack>
        )
      case 'cone':
        return (
          <Stack gap="xs">
            <GeometryInput label="Радиус" field="radius" value={primitive.geometry.radius} min={0.1} />
            <GeometryInput label="Высота" field="height" value={primitive.geometry.height} min={0.1} />
            <GeometryInput label="Сегменты" field="radialSegments" value={primitive.geometry.radialSegments ?? 16} step={1} min={3} />
          </Stack>
        )
      case 'pyramid':
        return (
          <Stack gap="xs">
            <GeometryInput label="Основание" field="baseSize" value={primitive.geometry.baseSize} min={0.1} />
            <GeometryInput label="Высота" field="height" value={primitive.geometry.height} min={0.1} />
          </Stack>
        )
      case 'plane':
        return (
          <Stack gap="xs">
            <GeometryInput label="Ширина" field="width" value={primitive.geometry.width} min={0.1} />
            <GeometryInput label="Высота" field="height" value={primitive.geometry.height} min={0.1} />
          </Stack>
        )
      case 'torus':
        return (
          <Stack gap="xs">
            <GeometryInput label="Большой радиус" field="majorRadius" value={primitive.geometry.majorRadius} min={0.1} />
            <GeometryInput label="Малый радиус" field="minorRadius" value={primitive.geometry.minorRadius} min={0.1} />
            <GeometryInput label="Рад. сегменты" field="radialSegments" value={primitive.geometry.radialSegments ?? 16} step={1} min={3} />
            <GeometryInput label="Труб. сегменты" field="tubularSegments" value={primitive.geometry.tubularSegments ?? 32} step={1} min={3} />
          </Stack>
        )
      default:
        return null
    }
  }

  return (
    <Paper
      shadow="sm"
      p="md"
      style={{ width: "100%", height: '100%', borderRadius: 0, borderRight: '1px solid var(--mantine-color-gray-8)' }}
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
              values={selectedPrimitiveData.transform?.position || [0, 0, 0]}
            />
            <TransformBlock
              label="Rotation"
              property="rotation"
              values={selectedPrimitiveData.transform?.rotation || [0, 0, 0]}
            />
            <TransformBlock
              label="Scale"
              property="scale"
              values={selectedPrimitiveData.transform?.scale || [1, 1, 1]}
            />
            <Box>
              <Text size="sm" fw={500} mb="xs">Материал</Text>
              <Select
                size="xs"
                placeholder={availableMaterials.length === 0 ? "Материалы не найдены" : "Выберите материал"}
                value={getCurrentMaterialUuid()}
                onChange={handleMaterialChange}
                data={availableMaterials}
                clearable
                searchable
                disabled={availableMaterials.length === 0}
                comboboxProps={{ zIndex: 1000 }}
              />
              {selectedPrimitiveData.material?.color && (
                <Text size="xs" c="dimmed" mt="xs">
                  Fallback цвет: {selectedPrimitiveData.material.color}
                </Text>
              )}
            </Box>
            <Box>
              <Text size="sm" fw={500} mb="xs">Геометрия</Text>
              <GeometryBlock primitive={selectedPrimitiveData} />
            </Box>
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
