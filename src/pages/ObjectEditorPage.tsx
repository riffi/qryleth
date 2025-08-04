import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MainLayout from '@/widgets/layouts/MainLayout'
import { ObjectEditorR3F, PanelToggleButtons } from '@/features/object-editor'
import { Box } from '@mantine/core'
import { db, type ObjectRecord } from '@/shared/lib/database'
import type { GfxObject } from '@/entities/object'
import { useGlobalPanelState } from '@/features/object-editor/lib/hooks/useGlobalPanelState'

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
   * Закрывает страницу редактора и возвращает пользователя в библиотеку.
   */
  const handleClose = () => navigate('/')

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


  const headerRightSection = (
    <PanelToggleButtons
      activeLeftPanel={globalPanelState.panelState.leftPanel}
      activeRightPanel={globalPanelState.panelState.rightPanel}
      onToggle={globalPanelState.togglePanel}
      size="sm"
    />
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
      <Box h="calc(100vh)" style={{ display: 'flex', flexDirection: 'column' }}>
        <Box style={{ flex: 1 }}>
          <ObjectEditorR3F
            onClose={handleClose}
            onSave={handleSave}
            objectData={objectRecord?.objectData}
            externalPanelState={globalPanelState}
          />
        </Box>
      </Box>
    </MainLayout>
  )
}

export default ObjectEditorPage
