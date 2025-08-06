import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MainLayout from '@/widgets/layouts/MainLayout'
import { ObjectEditorR3F, PanelToggleButtons } from '@/features/object-editor'
import { Title, Group, ActionIcon, Tooltip } from '@mantine/core'
import { IconDeviceFloppy } from '@tabler/icons-react'
import { db, type ObjectRecord } from '@/shared/lib/database'
import type { GfxObject } from '@/entities/object'
import { useGlobalPanelState } from '@/features/object-editor/lib/hooks/useGlobalPanelState'
import { buildUpdatedObject } from '@/features/object-editor/lib/saveUtils'

const ObjectEditorPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [objectRecord, setObjectRecord] = useState<ObjectRecord | null>(null)
  const [isReady, setIsReady] = useState(false)
  const globalPanelState = useGlobalPanelState()

  useEffect(() => {
    if (id) {
      db.getObject(id).then(record => {
        if (record) setObjectRecord(record)
        setIsReady(true)
      })
    } else {
      setIsReady(true)
    }
  }, [id])

  /**
   * Сохраняет изменения текущего объекта в базе данных.
   * Используем UUID записи библиотеки, иначе объект не обновится.
   */
  const handleSave = async (object: GfxObject) => {
    if (!objectRecord) return
    try {
      await db.updateObject(objectRecord.uuid, {
        objectData: object
      })

      navigate('/')
    } catch (error) {
      console.error('Error saving object:', error)
    }
  }


  /**
   * Формирует объект из состояния редактора и сохраняет его.
   */
  const handleSaveClick = () => {
    if (!objectRecord?.objectData) return
    const updated = buildUpdatedObject(objectRecord.objectData)
    handleSave(updated)
  }

  const headerRightSection = (
    <>
      <Title order={4} mr="3rem">
        {objectRecord?.objectData ? `Редактор объекта: ${objectRecord?.objectData.name}` : 'Новый объект'}
      </Title>
      <Group gap="xs">
        <Tooltip label="Сохранить" withArrow>
          <ActionIcon color="green" variant="filled" onClick={handleSaveClick}>
            <IconDeviceFloppy size={16} />
          </ActionIcon>
        </Tooltip>
        <PanelToggleButtons
          activeLeftPanel={globalPanelState.panelState.leftPanel}
          activeRightPanel={globalPanelState.panelState.rightPanel}
          onToggle={globalPanelState.togglePanel}
          size="md"
        />
      </Group>
    </>
  )

  if (!isReady) {
    return (
      <MainLayout rightSection={headerRightSection}>
        <div style={{ padding: '1rem' }}>Загрузка...</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout rightSection={headerRightSection}>
      <ObjectEditorR3F
        objectData={objectRecord?.objectData}
        externalPanelState={globalPanelState}
      />
    </MainLayout>
  )
}

export default ObjectEditorPage
