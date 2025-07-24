import React from 'react'
import { useObjectLighting } from '../../model/objectStore'

/**
 * Настройки освещения сцены в редакторе объектов.
 * Значения берутся из состояния objectStore.
 */
export const ObjectSceneLighting: React.FC = () => {
  const lighting = useObjectLighting()
  return (
    <>
      <ambientLight color={lighting.ambientColor || '#89c8cf'} intensity={lighting.ambientIntensity || 0.6} />
      <directionalLight
        position={[10, 10, 10]}
        color={lighting.directionalColor || '#ffffff'}
        intensity={lighting.directionalIntensity || 1}
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
      <directionalLight
          position={[-10, 10, -10]}
          color={lighting.directionalColor || '#ffffff'}
          intensity={lighting.directionalIntensity || 1}
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
