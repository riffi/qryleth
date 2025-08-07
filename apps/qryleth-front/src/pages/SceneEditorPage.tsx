import React from 'react'
import { useParams } from 'react-router-dom'
import { SceneEditorR3F } from '@/features/scene'


const SceneEditorPage: React.FC = () => {
  const { id } = useParams()
  const isNew = !id

    return (
        <SceneEditorR3F
          uuid={id}
          isNew={isNew}
          showObjectManager
        />
    )
}

export default SceneEditorPage
