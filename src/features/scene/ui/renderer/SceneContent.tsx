import React from 'react'
import { SceneLighting } from '@/features/scene/ui/renderer/lighting/SceneLighting.tsx'
import { CameraControls } from '@/features/scene/ui/renderer/controls/CameraControls.tsx'
import { TransformGizmo } from '@/features/scene/ui/renderer/controls/TransformGizmo.tsx'
import { Environment } from '../../../../shared/r3f/environment/Environment.tsx'
import { SceneObjects } from '@/features/scene/ui/renderer/objects/SceneObjects.tsx'
import { LandscapeLayers } from '@/features/scene/ui/renderer/landscape/LandscapeLayers.tsx'
import { SeaLayers } from '@/features/scene/ui/renderer/landscape/SeaLayers.tsx'
import { useSceneStore } from '../../model/sceneStore.ts'
import { useKeyboardShortcuts } from '../../lib/hooks/useKeyboardShortcuts'
import { Sky } from '@react-three/drei'

export const SceneContent: React.FC = () => {
  const lighting = useSceneStore(state => state.lighting)

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  return (
    <>
      {/* Set scene background */}
      <color attach="background" args={[lighting.backgroundColor || '#87CEEB']} />

      {/* Core scene components */}
      <SceneLighting />
      <CameraControls />
      <Environment />

      {/* Scene objects and landscapes */}
      <SceneObjects />
      <LandscapeLayers />
      <SeaLayers />
      <Sky distance={450000}  sunPosition={[500, 150, -1000]} inclination={0} azimuth={0.25} turbidity={0.1}/>
      {/* Transform controls */}
      <TransformGizmo />


    </>
  )
}
