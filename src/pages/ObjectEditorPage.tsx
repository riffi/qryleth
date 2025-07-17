import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import { ObjectEditor } from '../components/ObjectEditor'
import { db, type ObjectRecord } from '../utils/database'

const ObjectEditorPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [objectRecord, setObjectRecord] = useState<ObjectRecord | null>(null)

  useEffect(() => {
    if (id) {
      db.getObject(id).then(record => {
        if (record) setObjectRecord(record)
      })
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

  return (
    <MainLayout>
      <ObjectEditor
        opened
        onClose={handleClose}
        onSave={handleSave}
        objectInfo={objectInfo}
        objectData={objectRecord?.objectData}
      />
    </MainLayout>
  )
}

export default ObjectEditorPage
