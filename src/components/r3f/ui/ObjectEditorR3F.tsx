import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  Paper,
  Box,
  Stack,
  Group,
  Select,
  SegmentedControl,
  Button,
  Badge,
  Text,
  Title
} from '@mantine/core'
import { IconX, IconCheck, IconArrowRightBar, IconRotate, IconResize } from '@tabler/icons-react'
import { ObjectScene3D } from '../objectEditor/ObjectScene3D'
import { useObjectStore } from '../../../stores/objectStore'
import type { SceneObject, ScenePlacement } from '../../../types/scene'

interface ObjectEditorR3FProps {
  opened: boolean
  onClose: () => void
  onSave: (
    objectIndex: number,
    instanceId: string | undefined,
    primitiveStates: Record<number, { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }>
  ) => void
  objectInfo?: { name: string; objectIndex: number }
  instanceId?: string
  objectData?: SceneObject
}

const sampleObject: SceneObject = {
  name: 'Box',
  primitives: [
    {
      type: 'box',
      width: 1,
      height: 1,
      depth: 1,
      position: [0, 0, 0],
      rotation: [0, 0, 0]
    }
  ]
}

export const ObjectEditorR3F: React.FC<ObjectEditorR3FProps> = ({
  opened,
  onClose,
  onSave,
  objectInfo,
  instanceId,
  objectData
}) => {
  const [selectedPrimitive, setSelectedPrimitive] = useState(0)
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe'>('solid')

  // Initialize object store with primitives as separate objects
  useEffect(() => {
    if (!opened) return
    useObjectStore.getState().clearScene()

    const obj = objectData || sampleObject

    obj.primitives.forEach((prim, index) => {
      // Create primitive as separate object with position reset to [0,0,0]
      const normalizedPrimitive = { ...prim, position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] }
      useObjectStore.getState().addObject({ name: `Primitive ${index + 1}`, primitives: [normalizedPrimitive] })
      useObjectStore.getState().addPlacement({
        objectIndex: index,
        position: prim.position || [0, 0, 0],
        rotation: prim.rotation || [0, 0, 0],
        scale: [1, 1, 1]
      })
    })

    setSelectedPrimitive(0)
    useObjectStore.getState().selectObject(0, '0-0')
  }, [opened, objectData])

  const handleSave = () => {
    if (!objectInfo) return
    const state = useObjectStore.getState()
    const primitiveStates: Record<number, { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }> = {}
    state.placements.forEach((p, idx) => {
      primitiveStates[idx] = {
        position: (p.position || [0, 0, 0]) as [number, number, number],
        rotation: (p.rotation || [0, 0, 0]) as [number, number, number],
        scale: (p.scale || [1, 1, 1]) as [number, number, number]
      }
    })
    onSave(objectInfo.objectIndex, instanceId, primitiveStates)
    onClose()
  }

  const handleSelectPrimitive = (index: number) => {
    setSelectedPrimitive(index)
    useObjectStore.getState().selectObject(index, `${index}-0`)
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      title={
        <Group gap="sm">
          <Title order={3}>{objectInfo ? `Редактор объекта: ${objectInfo.name}` : 'Новый объект'}</Title>
          {renderMode === 'wireframe' && (
            <Badge color="orange" variant="light">
              Wireframe
            </Badge>
          )}
        </Group>
      }
      styles={{ body: { height: 'calc(100vh - 120px)', padding: 0 }, content: { height: '100vh' }, header: { padding: '1rem' } }}
    >
      <Box style={{ height: '100%', display: 'flex' }}>
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
              data={useObjectStore.getState()
                .objects.map((_, i) => ({ value: i.toString(), label: `Примитив ${i + 1}` }))}
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
    </Modal>
  )
}
