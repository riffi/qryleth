import React from 'react'
import { ObjectSceneLighting } from './lighting/ObjectSceneLighting'
import { Environment } from '../environment/Environment'
import { ObjectSceneObjects } from './objects/ObjectSceneObjects'
import { ObjectTransformGizmo } from './controls/ObjectTransformGizmo'
import { useObjectLighting } from '../../../stores/objectStore'

export const ObjectSceneContent: React.FC = () => {
  const lighting = useObjectLighting()
  return (
    <>
      <color attach="background" args={[lighting.backgroundColor || '#222222']} />
      <ObjectSceneLighting />
      <Environment />
      <ObjectSceneObjects />
      <ObjectTransformGizmo />
    </>
  )
}
