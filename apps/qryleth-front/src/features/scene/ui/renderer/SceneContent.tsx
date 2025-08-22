import React from 'react'
import { SceneLighting } from '@/features/scene/ui/renderer/lighting/SceneLighting.tsx'
import { CameraControls } from '@/features/scene/ui/renderer/controls/CameraControls.tsx'
import { ObjectTransformGizmo } from '@/features/scene/ui/renderer/controls/ObjectTransformGizmo.tsx'
import { Environment } from '../../../../shared/r3f/environment/Environment.tsx'
import { SceneObjects } from '@/features/scene/ui/renderer/objects/SceneObjects.tsx'
import { InstancedTransformProvider } from '@/shared/r3f/optimization/InstancedTransformContext'
import { LandscapeLayers } from '@/features/scene/ui/renderer/landscape/LandscapeLayers.tsx'
import { WaterLayers } from '@/features/scene/ui/renderer/landscape/WaterLayers.tsx'
import { useSceneStore, useGridVisible } from '../../model/sceneStore.ts'
import { UiMode, RenderProfile } from '@/shared/types/ui'
import { useKeyboardShortcuts } from '../../lib/hooks/useKeyboardShortcuts'
import { Sky } from '@react-three/drei'
import {EffectComposer, FXAA, SMAA} from "@react-three/postprocessing";

/**
 * Свойства компонента SceneContent.
 * renderProfile - профиль рендера для управления настройками отображения сцены.
 * В текущей реализации служит подготовкой для будущих отличий в настройках между режимами Edit и View.
 */
interface SceneContentProps {
  renderProfile: RenderProfile
}

/**
 * Основной компонент содержимого 3D сцены.
 * Отвечает за рендер всех элементов сцены: освещение, объекты, контролы, эффекты.
 * Получает renderProfile для возможного различного поведения в режимах Edit/View.
 */
export const SceneContent: React.FC<SceneContentProps> = ({ renderProfile }) => {
  const lighting = useSceneStore(state => state.lighting)
  const gridVisible = useGridVisible()
  const uiMode = useSceneStore(state => state.uiMode)

  // renderProfile может использоваться для различения настроек рендера между режимами Edit/View.
  // На текущем этапе реализации служит флагом подготовки к будущим настройкам.
  // Возможные применения: различные настройки post-processing, качество теней, LOD и др.

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
      <InstancedTransformProvider>
        <SceneObjects />
        {/* Transform controls: показываем только в режиме редактирования (Edit).
            В режиме Play гизмо скрываются, чтобы они не мешали просмотру/управлению. */}
        {uiMode === UiMode.Edit && <ObjectTransformGizmo />}
      </InstancedTransformProvider>
      <LandscapeLayers />
      <WaterLayers />
      <Sky distance={450000}  sunPosition={[500, 150, -1000]} inclination={0} azimuth={0.25} turbidity={0.1}/>
      
      <EffectComposer>
        <SMAA />
      </EffectComposer>


    </>
  )
}
