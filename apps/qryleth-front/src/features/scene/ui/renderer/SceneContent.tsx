import React from 'react'
import { SceneLighting } from '@/features/scene/ui/renderer/lighting/SceneLighting.tsx'
import { CameraControls } from '@/features/scene/ui/renderer/controls/CameraControls.tsx'
import { ObjectTransformGizmo } from '@/features/scene/ui/renderer/controls/ObjectTransformGizmo.tsx'
import { Environment } from '../../../../shared/r3f/environment/Environment.tsx'
import { SceneObjects } from '@/features/scene/ui/renderer/objects/SceneObjects.tsx'
import { LandscapeLayers } from '@/features/scene/ui/renderer/landscape/LandscapeLayers.tsx'
import { WaterLayers } from '@/features/scene/ui/renderer/landscape/WaterLayers.tsx'
import { useSceneStore, useGridVisible } from '../../model/sceneStore.ts'
import { UiMode } from '@/shared/types/ui'
import { useKeyboardShortcuts } from '../../lib/hooks/useKeyboardShortcuts'
import { Sky } from '@react-three/drei'
import {EffectComposer, FXAA, SMAA} from "@react-three/postprocessing";

export const SceneContent: React.FC = () => {
  const lighting = useSceneStore(state => state.lighting)
  const gridVisible = useGridVisible()
  const uiMode = useSceneStore(state => state.uiMode)

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  return (
    <>
      {/* Set scene background */}
      <color attach="background" args={[lighting.backgroundColor || '#87CEEB']} />

      {/* Core scene components */}
      <SceneLighting />
      <CameraControls />
      <Environment gridVisible={gridVisible} />

      {/* Scene objects and landscapes */}
      <SceneObjects />
      <LandscapeLayers />
      <WaterLayers />
      <Sky distance={450000}  sunPosition={[500, 150, -1000]} inclination={0} azimuth={0.25} turbidity={0.1}/>
      {/* Transform controls: показываем только в режиме редактирования (Edit).
          В режиме Play гизмо скрываются, чтобы они не мешали просмотру/управлению. */}
      {uiMode === UiMode.Edit && <ObjectTransformGizmo />}
      <EffectComposer>
        <FXAA />
        <SMAA />
      </EffectComposer>


    </>
  )
}
