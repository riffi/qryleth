import React from 'react'
import { useSceneLighting } from '../../../model/sceneStore.ts'

/**
 * Компонент, рендерящий источники света в сцене редактора.
 * Поддерживает новую структуру LightingSettings с fallback на устаревшие поля,
 * чтобы сохранить совместимость с текущим хранилищем.
 */
export const SceneLighting: React.FC = () => {
  const lighting = useSceneLighting()

  // Параметры окружающего света с поддержкой новой и старой схемы настроек
  const ambientColor = lighting.ambient?.color ?? lighting.ambientColor ?? '#87CEEB'
  const ambientIntensity =
    lighting.ambient?.intensity ?? lighting.ambientIntensity ?? 0.6

  // Параметры единственного направленного источника света
  const directional = lighting.directional
  const directionalColor = directional?.color ?? lighting.directionalColor ?? '#FFD700'
  const directionalIntensity =
    directional?.intensity ?? lighting.directionalIntensity ?? 1
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
