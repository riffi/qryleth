import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MainLayout from '../widgets/layouts/MainLayout'
import { ObjectEditorR3F } from '../features/object-editor/ui/ObjectEditorR3F'
import { db, type ObjectRecord } from '../shared/lib/database'

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

  const handleClose = () => navigate('/')
  const handleSave = () => navigate('/')

  const objectInfo = {
    name: objectRecord?.name || 'Новый объект',
    count: 1,
    visible: true,
    objectIndex: 0
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
      <ObjectEditorR3F
        opened={isReady}
        onClose={handleClose}
        onSave={handleSave}
        objectInfo={objectInfo}
        objectData={objectRecord?.objectData}
      />
    </MainLayout>
  )
}

export default ObjectEditorPage
