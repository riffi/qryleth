import React from 'react'
import { useParams } from 'react-router-dom'
import SceneEditor from '../components/SceneEditor'

const SceneEditorPage: React.FC = () => {
  const { id } = useParams()
  const isNew = !id
  return <SceneEditor uuid={id} isNew={isNew} />
}

export default SceneEditorPage
