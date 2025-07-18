import React, { useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { ObjectSceneLighting } from './lighting/ObjectSceneLighting'
import { Environment } from '../environment/Environment'
import { ObjectSceneObjects } from './objects/ObjectSceneObjects'
import { ObjectTransformGizmo } from './controls/ObjectTransformGizmo'
import { useObjectLighting } from '../../../stores/objectStore'

export const ObjectSceneContent: React.FC = () => {
  const lighting = useObjectLighting()
  const orbitControlsRef = useRef<any>()
  
  return (
    <>
      <color attach="background" args={[lighting.backgroundColor || '#222222']} />
      <OrbitControls ref={orbitControlsRef} enablePan={true} enableZoom={true} enableRotate={true} />
      <ObjectSceneLighting />
      <Environment />
      <ObjectSceneObjects />
      <ObjectTransformGizmo orbitControlsRef={orbitControlsRef} />
    </>
  )
}
