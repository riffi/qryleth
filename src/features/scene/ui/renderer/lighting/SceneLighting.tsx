import React from 'react'
import { useSceneLighting } from '../../../model/sceneStore.ts'

export const SceneLighting: React.FC = () => {
  const lighting = useSceneLighting()

  return (
    <>
      {/* Ambient Light */}
      <ambientLight
        color={lighting.ambientColor || '#404040'}
        intensity={lighting.ambientIntensity || 0.6}
      />

      {/* Directional Light with shadows */}
      <directionalLight
        position={[10, 10, 10]}
        color={lighting.directionalColor || '#ffffff'}
        intensity={lighting.directionalIntensity || 1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.001}
        shadow-normalBias={0.01}
      />
    </>
  )
}
