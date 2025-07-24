import React, { useEffect } from 'react'
import { Box, Group, Badge, Title, ActionIcon, Tooltip, SegmentedControl } from '@mantine/core'
import { ObjectScene3D } from './ObjectScene3D'
import { PrimitiveControlPanel } from './PrimitiveControlPanel'
import { PrimitiveManager } from './PrimitiveManager'
import { useObjectStore, useObjectRenderMode } from '../model/objectStore'
import { IconArrowRightBar, IconRotate, IconResize } from '@tabler/icons-react'
import type { SceneObject } from '@/entities/scene/types.ts'
import { useObjectEditorToolRegistration } from '@/features/object-editor'
import type {Vector3} from "@/shared/types";

interface ObjectEditorR3FProps {
  onClose: () => void
  onSave: (
    objectUuid: string,
    primitiveStates: Record<number, { position: Vector3; rotation: Vector3; scale: Vector3 }>
  ) => void
  objectInfo?: { name: string; objectUuid: string }
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
  objectData
}) => {
  // Регистрируем инструменты редактора объектов при монтировании
  useObjectEditorToolRegistration()
  const renderMode = useObjectRenderMode()
  const transformMode = useObjectStore(s => s.transformMode)
  const setTransformMode = useObjectStore(s => s.setTransformMode)
  const setRenderMode = useObjectStore(s => s.setRenderMode)

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

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Group gap="sm" p="md">
        <Title order={3}>{objectInfo ? `Редактор объекта: ${objectInfo.name}` : 'Новый объект'}</Title>
        {renderMode === 'wireframe' && (
          <Badge color="orange" variant="light">Wireframe</Badge>
        )}
      </Group>
      <Box style={{ flex: 1, display: 'flex' }}>
        <PrimitiveControlPanel onClose={onClose} onSave={handleSave} />
        <Box style={{ flex: 1, position: 'relative' }}>
          <Box
            style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, padding: 6 }}
          >
            <Group gap="xs">
              <Group gap="xs">
                <Tooltip label="Перемещение">
                  <ActionIcon
                    size="md"
                    variant={transformMode === 'translate' ? 'filled' : 'light'}
                    color="blue"
                    onClick={() => setTransformMode('translate')}
                  >
                    <IconArrowRightBar size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Поворот">
                  <ActionIcon
                    size="md"
                    variant={transformMode === 'rotate' ? 'filled' : 'light'}
                    color="green"
                    onClick={() => setTransformMode('rotate')}
                  >
                    <IconRotate size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Масштаб">
                  <ActionIcon
                    size="md"
                    variant={transformMode === 'scale' ? 'filled' : 'light'}
                    color="orange"
                    onClick={() => setTransformMode('scale')}
                  >
                    <IconResize size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>

              <SegmentedControl
                value={renderMode}
                onChange={(v) => setRenderMode(v as 'solid' | 'wireframe')}
                data={[
                  { value: 'solid', label: 'Solid' },
                  { value: 'wireframe', label: 'Wireframe' }
                ]}
                size="xs"
              />
            </Group>
          </Box>
          <ObjectScene3D />
        </Box>
        <PrimitiveManager />
      </Box>
    </Box>
  )
}
