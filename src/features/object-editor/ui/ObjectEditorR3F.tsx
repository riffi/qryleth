import React, { useEffect, useState } from 'react'
import {
  Paper,
  Box,
  Stack,
  Group,
  Select,
  SegmentedControl,
  Button,
  Badge,
  Title
} from '@mantine/core'
import { IconX, IconCheck, IconArrowRightBar, IconRotate, IconResize } from '@tabler/icons-react'
import { ObjectScene3D } from '../r3f/ObjectScene3D'
import { useObjectStore, useObjectPrimitives } from '../store/objectStore'
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
  const [selectedPrimitive, setSelectedPrimitive] = useState(0)
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe'>('solid')

  // Инициализация хранилища примитивов при получении данных объекта
  useEffect(() => {
    if (!objectData) return

    useObjectStore.getState().clearScene()
    useObjectStore.getState().setPrimitives(
      objectData.primitives.map(p => ({ ...p }))
    )

    setSelectedPrimitive(0)
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
  const handleSelectPrimitive = (index: number) => {
    setSelectedPrimitive(index)
    useObjectStore.getState().selectPrimitive(index)
  }

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
            <Select
              value={selectedPrimitive.toString()}
              onChange={(v) => v && handleSelectPrimitive(parseInt(v))}
              data={primitives.map((_, i) => ({ value: i.toString(), label: `Примитив ${i + 1}` }))}
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
