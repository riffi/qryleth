import React, { useEffect } from 'react'
import { Box, Group, ActionIcon, Tooltip, SegmentedControl } from '@mantine/core'
import { ObjectScene3D } from './renderer/ObjectScene3D.tsx'
import { ObjectEditorLayout } from './ObjectEditorLayout'
import {
  useObjectStore,
  useObjectRenderMode,
  useObjectGridVisible,
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
  /** Внешнее управление состоянием панелей (из page header) */
  externalPanelState?: any
  /** Режим модального окна - скрывает внутренний заголовок */
  modalMode?: boolean
}

/**
 * Редактор объекта на базе React Three Fiber.
 * Используется как самостоятельный компонент без модального окна.
 * Управление открытием/закрытием осуществляется родительским компонентом.
 */
export const ObjectEditorR3F: React.FC<ObjectEditorR3FProps> = ({
  onClose,
  onSave,
  objectData,
  externalPanelState,
  modalMode = false
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

  // Создаем компонент header controls для передачи в layout
  const headerControls = (
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
  )

  // Создаем компонент 3D сцены с дополнительными контролами
  const sceneContent = (
    <Box style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Box style={{ width: '100%', height: '100%' }}>
        <ObjectScene3D />
      </Box>
    </Box>
  )

  return (
    <ObjectEditorLayout
      onClose={onClose}
      onSave={onSave}
      objectData={objectData}
      headerControls={headerControls}
      externalPanelState={externalPanelState}
      hideHeader={modalMode}
    >
      {sceneContent}
    </ObjectEditorLayout>
  )
}
