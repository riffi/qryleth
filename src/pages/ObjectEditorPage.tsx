import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MainLayout from '@/widgets/layouts/MainLayout'
import { ObjectEditorR3F } from '@/features/object-editor'
import { Box } from '@mantine/core'
import { db, type ObjectRecord } from '@/shared/lib/database'
import type { GfxObject } from '@/entities/object'

const ObjectEditorPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [objectRecord, setObjectRecord] = useState<ObjectRecord | null>(null)
  const [isReady, setIsReady] = useState(false)

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


  if (!isReady) {
    return (
      <MainLayout>
        <div style={{ padding: '1rem' }}>Загрузка...</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Box h="calc(100vh)" style={{ display: 'flex', flexDirection: 'column' }}>
        <Box style={{ flex: 1 }}>
          <ObjectEditorR3F
            onClose={handleClose}
            onSave={handleSave}
            objectData={objectRecord?.objectData}
          />
        </Box>
      </Box>
    </MainLayout>
  )
}

export default ObjectEditorPage
