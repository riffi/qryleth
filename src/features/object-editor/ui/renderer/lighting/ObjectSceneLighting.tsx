import React from 'react'
import { useObjectLighting } from '../../../model/objectStore.ts'

/**
 * Компонент, рендерящий источники света в сцене редактора объектов.
 * Поддерживает новую структуру LightingSettings с fallback на устаревшие поля,
 * чтобы обеспечить совместимость с текущим состоянием хранилища.
 */
export const ObjectSceneLighting: React.FC = () => {
  const lighting = useObjectLighting()

  // Параметры окружающего света с поддержкой новой и старой схемы настроек
  const ambientColor = lighting.ambient?.color ?? lighting.ambientColor ?? '#89c8cf'
  const ambientIntensity = lighting.ambient?.intensity ?? lighting.ambientIntensity ?? 0.6

  // Параметры единственного направленного источника света
  const directional = lighting.directional
  const directionalColor = directional?.color ?? lighting.directionalColor ?? '#ffffff'
  const directionalIntensity = directional?.intensity ?? lighting.directionalIntensity ?? 1
  const directionalPosition = directional?.position ?? [10, 10, 10]
  const castShadow = directional?.castShadow ?? true
  const shadowMapSize = directional?.shadowProps?.mapSize ?? [2048, 2048]
  const shadowCameraFar = directional?.shadowProps?.cameraFar ?? 100

  return (
    <>
      <ambientLight color={ambientColor} intensity={ambientIntensity} />
      <directionalLight
        position={directionalPosition}
        color={directionalColor}
        intensity={directionalIntensity}
        castShadow={castShadow}
        shadow-mapSize-width={shadowMapSize[0]}
        shadow-mapSize-height={shadowMapSize[1]}
        shadow-camera-far={shadowCameraFar}
      />
    </>
  )
}
