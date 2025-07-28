import React, { useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { ObjectSceneLighting } from '@/features/object-editor/ui/renderer/lighting/ObjectSceneLighting.tsx'
import { Environment } from '../../../../shared/r3f/environment/Environment.tsx'
import { ObjectScenePrimitives } from '@/features/object-editor/ui/renderer/objects/ObjectScenePrimitives.tsx'
import { PrimitiveTransformGizmo } from '@/features/object-editor/ui/renderer/controls/PrimitiveTransformGizmo.tsx'
import { useObjectLighting, useObjectGridVisible } from '../../model/objectStore.ts'

/**
 * Содержимое сцены редактора объектов: освещение, окружение и примитивы.
 * Также подключает контролы трансформации и управление камерой.
 */
export const ObjectSceneContent: React.FC = () => {
  const lighting = useObjectLighting()
  const gridVisible = useObjectGridVisible()
  const orbitControlsRef = useRef<any>()

  return (
    <>
      <color attach="background" args={[lighting.backgroundColor || '#222222']} />
      <OrbitControls ref={orbitControlsRef} enablePan={true} enableZoom={true} enableRotate={true} />
      <ObjectSceneLighting />
      <Environment gridVisible={gridVisible} />
      <ObjectScenePrimitives />
      <PrimitiveTransformGizmo orbitControlsRef={orbitControlsRef} />
    </>
  )
}
