import React from 'react'
import { SceneLighting } from '../lighting/SceneLighting'
import { CameraControls } from '../controls/CameraControls'
import { TransformGizmo } from '../controls/TransformGizmo'
import { Environment } from '../../../shared/r3f/environment/Environment'
import { SceneObjects } from '../objects/SceneObjects'
import { LandscapeLayers } from '../landscape/LandscapeLayers'
import { PostProcessing } from '../effects/PostProcessing'
import { useSceneStore } from '../store/sceneStore'
import { useKeyboardShortcuts } from '../../../hooks/r3f/useKeyboardShortcuts'

export const SceneContent: React.FC = () => {
  const lighting = useSceneStore(state => state.lighting)

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  return (
    <>
      {/* Set scene background */}
      <color attach="background" args={[lighting.backgroundColor || '#222222']} />

      {/* Core scene components */}
      <SceneLighting />
      <CameraControls />
      <Environment />

      {/* Scene objects and landscapes */}
      <SceneObjects />
      <LandscapeLayers />

      {/* Transform controls */}
      <TransformGizmo />

      {/* Post-processing effects */}
      <PostProcessing />
    </>
  )
}
