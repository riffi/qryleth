import React, { useEffect } from 'react'
import { Box, Group, ActionIcon, Tooltip, SegmentedControl } from '@mantine/core'
import { ObjectScene3D } from './renderer/ObjectScene3D.tsx'
import { ObjectEditorLayout } from './ObjectEditorLayout'
import { ObjectChatInterface } from './ChatInterface'
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

    const store = useObjectStore.getState()
    store.clearScene()
    store.setPrimitives(
      objectData.primitives.map(p => ({ ...p }))
    )
    store.setMaterials(objectData.materials ?? [])
    
    // Устанавливаем группы примитивов и их назначения
    if (objectData.primitiveGroups) {
      store.setPrimitiveGroups(objectData.primitiveGroups)
    }
    
    if (objectData.primitiveGroupAssignments) {
      store.setPrimitiveGroupAssignments(objectData.primitiveGroupAssignments)
    }
    
    store.selectPrimitive(0)
  }, [objectData])

  // Создаем компонент 3D сцены с дополнительными контролами
  const sceneContent = (
    <Box style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Box
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 10,
          padding: 6
        }}
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

      <Box style={{ width: '100%', height: '100%' }}>
        <ObjectScene3D />
      </Box>
    </Box>
  )

  // Создаем компонент чата для ObjectEditor
  const chatComponent = (
    <ObjectChatInterface
      isVisible={true} // Управляется через panelState
      mode={modalMode ? 'modal' : 'page'}
      onPrimitiveAdded={(primitive) => {
        console.log('Primitive added via AI:', primitive)
      }}
      onMaterialCreated={(material) => {
        console.log('Material created via AI:', material)
      }}
      onObjectModified={(modifications) => {
        console.log('Object modified via AI:', modifications)
      }}
    />
  )

  return (
    <ObjectEditorLayout
      onClose={onClose}
      onSave={onSave}
      objectData={objectData}
      externalPanelState={externalPanelState}
      hideHeader={modalMode}
      chatComponent={chatComponent}
    >
      {sceneContent}
    </ObjectEditorLayout>
  )
}
