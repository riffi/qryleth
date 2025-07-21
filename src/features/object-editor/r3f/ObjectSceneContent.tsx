import React, { useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { ObjectSceneLighting } from './lighting/ObjectSceneLighting'
import { Environment } from '../../../shared/r3f/environment/Environment'
import { ObjectScenePrimitives } from './objects/ObjectScenePrimitives.tsx'
import { PrimitiveTransformGizmo } from './controls/PrimitiveTransformGizmo.tsx'
import { useObjectLighting } from '../store/objectStore'

export const ObjectSceneContent: React.FC = () => {
  const lighting = useObjectLighting()
  const orbitControlsRef = useRef<any>()

  return (
    <>
      <color attach="background" args={[lighting.backgroundColor || '#222222']} />
      <OrbitControls ref={orbitControlsRef} enablePan={true} enableZoom={true} enableRotate={true} />
      <ObjectSceneLighting />
      <Environment />
      <ObjectScenePrimitives />
      <PrimitiveTransformGizmo orbitControlsRef={orbitControlsRef} />
    </>
  )
}
