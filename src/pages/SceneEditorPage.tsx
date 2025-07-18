import React from 'react'
import { useParams } from 'react-router-dom'
import { SceneEditorR3F } from '../components/r3f/ui/SceneEditorR3F'
import { ObjectManagementWrapper } from '../components/r3f/ui/ObjectManagementWrapper'


const SceneEditorPage: React.FC = () => {
  const { id } = useParams()
  const isNew = !id

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

export default SceneEditorPage
