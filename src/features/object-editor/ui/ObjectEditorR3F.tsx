import React, { useEffect } from 'react'
import { Box, Group, Badge, Title, ActionIcon, Tooltip, SegmentedControl } from '@mantine/core'
import { ObjectScene3D } from './renderer/ObjectScene3D.tsx'
import { PrimitiveControlPanel } from './PrimiviteControlPanel/PrimitiveControlPanel.tsx'
import { MaterialControlPanel } from './MaterialControlPanel/MaterialControlPanel.tsx'
import { ObjectManagementPanel } from './ObjectManagementPanel/ObjectManagementPanel.tsx'
import {
  useObjectStore,
  useObjectRenderMode,
  useObjectGridVisible,
  useSelectedMaterialUuid
} from '../model/objectStore'
import { useOEKeyboardShortcuts } from '../lib/hooks/useOEKeyboardShortcuts'
import { IconArrowRightBar, IconRotate, IconResize, IconGridDots } from '@tabler/icons-react'
import type { GfxObject } from '@/entities/object'
import { useObjectEditorToolRegistration } from '@/features/object-editor'

interface ObjectEditorR3FProps {
  onClose: () => void
  /**
   * Колбэк сохранения редактируемого объекта
   * @param object итоговый объект с обновлёнными примитивами
   */
  onSave: (object: GfxObject) => void
  /** Данные редактируемого объекта */
  objectData?: GfxObject
}

/**
 * Редактор объекта на базе React Three Fiber.
 * Используется как самостоятельный компонент без модального окна.
 * Управление открытием/закрытием осуществляется родительским компонентом.
 */
export const ObjectEditorR3F: React.FC<ObjectEditorR3FProps> = ({
  onClose,
  onSave,
  objectData
}) => {
  // Регистрируем инструменты редактора объектов при монтировании
  useObjectEditorToolRegistration()
  // Подключаем обработку горячих клавиш (Ctrl+A для выбора всех примитивов)
  useOEKeyboardShortcuts()
  const renderMode = useObjectRenderMode()
  const transformMode = useObjectStore(s => s.transformMode)
  const setTransformMode = useObjectStore(s => s.setTransformMode)
  const setRenderMode = useObjectStore(s => s.setRenderMode)
  const gridVisible = useObjectGridVisible()
  const toggleGridVisibility = useObjectStore(s => s.toggleGridVisibility)
  const selectedMaterialUuid = useSelectedMaterialUuid()

  // Инициализация хранилища примитивов при получении данных объекта
  useEffect(() => {
    if (!objectData) return

    useObjectStore.getState().clearScene()
    useObjectStore.getState().setPrimitives(
      objectData.primitives.map(p => ({ ...p }))
    )
    useObjectStore.getState().setMaterials(objectData.materials ?? [])

    useObjectStore.getState().selectPrimitive(0)
  }, [objectData])

  /**
   * Сохраняет изменения и передаёт их во внешний обработчик.
   */
  const handleSave = () => {
    if (!objectData) return
    const state = useObjectStore.getState()
    const updatedObject: GfxObject = {
      ...objectData,
      primitives: state.primitives.map(p => ({ ...p })),
      boundingBox: state.boundingBox,
      materials: state.materials,
    }

    onSave(updatedObject)
    onClose()
  }

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Group gap="sm" p="md">
        <Title order={3}>{objectData ? `Редактор объекта: ${objectData.name}` : 'Новый объект'}</Title>
        {renderMode === 'wireframe' && (
          <Badge color="orange" variant="light">Wireframe</Badge>
        )}
      </Group>
      <Box style={{ flex: 1, display: 'flex' }}>
        {selectedMaterialUuid ? (
          <MaterialControlPanel onClose={onClose} onSave={handleSave} />
        ) : (
          <PrimitiveControlPanel onClose={onClose} onSave={handleSave} />
        )}
        <Box style={{ flex: 1, position: 'relative' }}>
          <Box
            style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, padding: 6 }}
          >
            <Group gap="xs">
              <Tooltip label={gridVisible ? 'Скрыть сетку' : 'Показать сетку'}>
                <ActionIcon
                  variant={gridVisible ? 'filled' : 'light'}
                  c={gridVisible ? 'white' : 'gray'}
                  onClick={toggleGridVisibility}
                  size="md"
                >
                  <IconGridDots size={18} />
                </ActionIcon>
              </Tooltip>

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
        <ObjectManagementPanel />
      </Box>
    </Box>
  )
}
