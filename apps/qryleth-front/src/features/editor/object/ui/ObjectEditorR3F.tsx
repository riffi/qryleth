import React, { useEffect } from 'react'
import { Box, Group } from '@mantine/core'
import { ObjectScene3D } from './renderer/ObjectScene3D.tsx'
import {
  useObjectStore,
  useObjectRenderMode,
  useObjectGridVisible,
} from '../model/objectStore'
import { useOEKeyboardShortcuts } from '../lib/hooks/useOEKeyboardShortcuts'
import { TransformModeButtons, GridToggleButton, RenderModeSegment } from '@/shared/ui'
import type { GfxObject } from '@/entities/object'

interface ObjectEditorR3FProps {
  /** Данные редактируемого объекта */
  objectData?: GfxObject
}

/**
 * Редактор объекта на базе React Three Fiber.
 * Используется как самостоятельный компонент без модального окна.
 * Управление открытием/закрытием осуществляется родительским компонентом.
 */
export const ObjectEditorR3F: React.FC<ObjectEditorR3FProps> = ({ objectData }) => {
  // Подключаем обработку горячих клавиш (Ctrl+A для выбора всех примитивов)
  useOEKeyboardShortcuts()
  const renderMode = useObjectRenderMode()
  const transformMode = useObjectStore(s => s.transformMode)
  const setTransformMode = useObjectStore(s => s.setTransformMode)
  const setRenderMode = useObjectStore(s => s.setRenderMode)
  const gridVisible = useObjectGridVisible()
  const toggleGridVisibility = useObjectStore(s => s.toggleGridVisibility)

  // Инициализация хранилища примитивов при получении данных объекта или их отсутствии
  useEffect(() => {
    const store = useObjectStore.getState()
    store.clearScene()
    
    if (objectData) {
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
      
      if (objectData.primitives.length > 0) {
        store.selectPrimitive(0)
      }
    }
  }, [objectData])

  // Создаём компонент 3D‑сцены с дополнительными контролами рендера/трансформаций
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
          <GridToggleButton visible={gridVisible} onToggle={toggleGridVisibility} />
          <TransformModeButtons mode={transformMode} onChange={setTransformMode} />
          <RenderModeSegment value={renderMode} onChange={setRenderMode} />
        </Group>
      </Box>

      <Box style={{ width: '100%', height: '100%' }}>
        <ObjectScene3D />
      </Box>
    </Box>
  )
  return sceneContent
}
