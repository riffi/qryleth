import React, { useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, SSAO } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { ObjectSceneLighting } from '@/features/editor/object/ui/renderer/lighting/ObjectSceneLighting.tsx'
import { Environment } from '@/shared/r3f/environment/Environment'
import { ObjectScenePrimitives } from '@/features/editor/object/ui/renderer/objects/ObjectScenePrimitives.tsx'
import { PrimitiveTransformGizmo } from '@/features/editor/object/ui/renderer/controls/PrimitiveTransformGizmo.tsx'
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
      <color attach="background" args={[lighting.backgroundColor || '#ffffff']} />
      <OrbitControls ref={orbitControlsRef} enablePan={true} enableZoom={true} enableRotate={true} />
      <ObjectSceneLighting />
      <Environment gridVisible={gridVisible} />
      <ObjectScenePrimitives />
      <PrimitiveTransformGizmo orbitControlsRef={orbitControlsRef} />

      {lighting.ambientOcclusion?.enabled && (
        <EffectComposer
            enableNormalPass
        >
          <SSAO
            intensity={lighting.ambientOcclusion.intensity || 1.0}
            radius={lighting.ambientOcclusion.radius || 0.5}
          />
        </EffectComposer>
      )}
    </>
  )
}
