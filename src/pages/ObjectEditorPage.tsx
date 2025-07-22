import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MainLayout from '@/widgets/layouts/MainLayout'
import { ObjectEditorR3F } from '@/features/object-editor/ui/ObjectEditorR3F'
import { Box, Group, Title } from '@mantine/core'
import { db, type ObjectRecord } from '@/shared/lib/database'

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

  const handleSave = async (
    objectUuid: string,
    primitiveStates: Record<number, { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }>
  ) => {
    if (!objectRecord) return

    try {
      // Update primitives with new positions, rotations, and scales
      const updatedPrimitives = objectRecord.objectData.primitives.map((primitive, index) => {
        if (primitiveStates[index]) {
          return {
            ...primitive,
            position: primitiveStates[index].position,
            rotation: primitiveStates[index].rotation,
            scale: primitiveStates[index].scale
          }
        }
        return primitive
      })

      // Create updated object data
      const updatedObjectData = {
        ...objectRecord.objectData,
        primitives: updatedPrimitives
      }

      // Save to database - use the id from URL params as fallback
      const targetUuid = id || objectUuid;
      await db.updateObject(targetUuid, {
        objectData: updatedObjectData
      })

      navigate('/')
    } catch (error) {
      console.error('Error saving object:', error)
    }
  }

  const objectInfo = objectRecord ? {
    name: objectRecord.name,
    objectUuid: objectRecord.uuid
  } : undefined

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
            objectInfo={objectInfo}
            objectData={objectRecord?.objectData}
          />
        </Box>
      </Box>
    </MainLayout>
  )
}

export default ObjectEditorPage
