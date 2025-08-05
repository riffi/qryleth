import React, { useEffect } from 'react'
import { Box, Group, Badge, Title, Container, Paper } from '@mantine/core'
import { ObjectScene3D } from '../renderer/ObjectScene3D'
import { PrimitiveControlPanel } from '../PrimitiveControlPanel/PrimitiveControlPanel'
import { GroupControlPanel } from '../GroupControlPanel/GroupControlPanel'
import { MaterialControlPanel } from '../MaterialControlPanel/MaterialControlPanel'
import { ObjectManagementPanel } from '../ObjectManagementPanel/ObjectManagementPanel'
import { usePanelState } from '../PanelToggleButtons/hooks/usePanelState'
import {
  useObjectStore,
  useObjectRenderMode,
  useSelectedMaterialUuid,
  useSelectedGroupUuids,
  useSelectedItemType
} from '../../model/objectStore'
import type { GfxObject } from '@/entities/object'

interface ObjectEditorLayoutProps {
  onClose: () => void
  onSave: (object: GfxObject) => void
  objectData?: GfxObject
  children?: React.ReactNode
  /** Дополнительные элементы управления в header */
  headerControls?: React.ReactNode
  /** Компонент чата для левой панели */
  chatComponent?: React.ReactNode
  /** Внешнее управление состоянием панелей (для интеграции с page/modal header) */
  externalPanelState?: {
    panelState: any
    togglePanel: (panel: any) => void
    showPanel: (panel: any) => void
  }
  /** Скрыть внутренний заголовок (для модального режима) */
  hideHeader?: boolean
}

/**
 * Layout для редактора объектов с поддержкой переключаемых панелей.
 * Реализует логику взаимоисключающих левых панелей (чат vs свойства).
 */
export const ObjectEditorLayout: React.FC<ObjectEditorLayoutProps> = ({
  onClose,
  onSave,
  objectData,
  children,
  headerControls,
  chatComponent,
  externalPanelState,
  hideHeader = false
}) => {
  const renderMode = useObjectRenderMode()
  const selectedMaterialUuid = useSelectedMaterialUuid()
  const selectedGroupUuids = useSelectedGroupUuids()
  const selectedItemType = useSelectedItemType()
  const internalPanelState = usePanelState()

  // Используем внешнее состояние панелей если передано, иначе внутреннее
  const { panelState, togglePanel, showPanel } = externalPanelState || internalPanelState

  // Автоматическое переключение на свойства при выборе примитива/материала/группы
  useEffect(() => {
    if ((selectedMaterialUuid || selectedGroupUuids.length > 0) && panelState.leftPanel === 'chat') {
      showPanel('properties')
    }
  }, [selectedMaterialUuid, selectedGroupUuids.length, panelState.leftPanel, showPanel])

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
      primitiveGroups: state.primitiveGroups,
      primitiveGroupAssignments: state.primitiveGroupAssignments,
    }

    onSave(updatedObject)
    onClose()
  }

  const renderLeftPanel = () => {
    if (!panelState.leftPanel) return null

    if (panelState.leftPanel === 'chat' && chatComponent) {
      return (
        <Paper
          shadow="sm"
          radius="md"
          style={{ width: 400, height: '100%', flexShrink: 0 }}
        >
          {chatComponent}
        </Paper>
      )
    }

    if (panelState.leftPanel === 'properties') {
      return (
        <Paper
          shadow="sm"
          radius="md"
          style={{ width: 400, height: '100%', flexShrink: 0 }}
        >
          {selectedMaterialUuid ? (
            <MaterialControlPanel onClose={onClose} onSave={handleSave} />
          ) : selectedItemType === 'group' && selectedGroupUuids.length === 1 ? (
            <GroupControlPanel onClose={onClose} onSave={handleSave} />
          ) : (
            <PrimitiveControlPanel onClose={onClose} onSave={handleSave} />
          )}
        </Paper>
      )
    }

    return null
  }

  const renderRightPanel = () => {
    if (!panelState.rightPanel || panelState.rightPanel !== 'manager') {
      return null
    }

    return (
      <Paper
        shadow="sm"
        radius="md"
        style={{ width: 350, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <ObjectManagementPanel />
      </Paper>
    )
  }

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      <Container
        size="xl"
        fluid
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          gap: 'var(--mantine-spacing-sm)',
          height: '100%',
          overflow: 'hidden',
          flex: 1
        }}
      >
        {renderLeftPanel()}

        <Paper
          shadow="sm"
          radius="md"
          style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 400 }}
        >
          {children || <ObjectScene3D />}
        </Paper>

        {renderRightPanel()}
      </Container>
    </Box>
  )
}
