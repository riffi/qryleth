import React from 'react'
import { SceneLighting } from './lighting/SceneLighting'
import { CameraControls } from './controls/CameraControls'
import { Environment } from './environment/Environment'
import { SceneObjects } from './objects/SceneObjects'
import { LandscapeLayers } from './landscape/LandscapeLayers'
import { useSceneStore } from '../../stores/sceneStore'

export const SceneContent: React.FC = () => {
  const lighting = useSceneStore(state => state.lighting)

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
      
      {/* Post-processing and effects will be added later */}
    </>
  )
}