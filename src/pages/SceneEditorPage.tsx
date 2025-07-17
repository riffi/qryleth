import React from 'react'
import { useParams } from 'react-router-dom'
import SceneEditor from '../components/SceneEditor'
import { SceneEditorR3F } from '../components/r3f/ui/SceneEditorR3F'
import { ObjectManagementWrapper } from '../components/r3f/ui/ObjectManagementWrapper'
import { shouldUseR3F } from '../config/r3fConfig'

// Use centralized R3F configuration
const USE_R3F_SYSTEM = shouldUseR3F()

const SceneEditorPage: React.FC = () => {
  const { id } = useParams()
  const isNew = !id

  if (USE_R3F_SYSTEM) {
    // New R3F system with full object management
    return (
      <ObjectManagementWrapper>
        <SceneEditorR3F 
          uuid={id}
          isNew={isNew}
          width={1200} 
          height={800} 
          showObjectManager={true} 
        />
      </ObjectManagementWrapper>
    )
  }

  // Legacy system (for fallback)
  return <SceneEditor uuid={id} isNew={isNew} />
}

export default SceneEditorPage
