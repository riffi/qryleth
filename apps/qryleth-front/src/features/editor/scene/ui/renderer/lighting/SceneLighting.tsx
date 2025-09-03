import React from 'react'
import { Fog, FogExp2 } from 'three'
import { useThree } from '@react-three/fiber'
import { useSceneLighting } from '../../../model/sceneStore.ts'

/**
 * Компонент, рендерящий источники света и атмосферные эффекты в сцене редактора
 * по новой структуре LightingSettings.
 */
export const SceneLighting: React.FC = () => {
  const lighting = useSceneLighting()
  const { scene } = useThree()

  // Параметры окружающего света
  const ambientColor = lighting.ambient?.color ?? '#87CEEB'
  const ambientIntensity = lighting.ambient?.intensity ?? 0.6

  // Параметры единственного направленного источника света
  const directional = lighting.directional
  const directionalColor = directional?.color ?? '#FFD700'
  const directionalIntensity = directional?.intensity ?? 1
  const directionalPosition = directional?.position ?? [500, 150, -1000]
  const castShadow = directional?.castShadow ?? true
  const shadowMapSize = directional?.shadowProps?.mapSize ?? [2048, 2048]
  const shadowCameraFar = directional?.shadowProps?.cameraFar ?? 100

  // Параметры тумана
  const fog = lighting.fog
  const fogEnabled = fog?.enabled ?? false
  const fogType = fog?.type ?? 'linear'
  const fogColor = fog?.color ?? '#87CEEB'
  const fogNear = fog?.near ?? 10
  const fogFar = fog?.far ?? 100
  const fogDensity = fog?.density ?? 0.01

  // Применяем туман к сцене
  React.useEffect(() => {
    if (fogEnabled) {
      if (fogType === 'exponential') {
        scene.fog = new FogExp2(fogColor, fogDensity)
      } else {
        scene.fog = new Fog(fogColor, fogNear, fogFar)
      }
    } else {
      scene.fog = null
    }

    // Очистка при размонтировании
    return () => {
      scene.fog = null
    }
  }, [scene, fogEnabled, fogType, fogColor, fogNear, fogFar, fogDensity])

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
        // Расширяем ортографическую камеру теней, чтобы покрыть ландшафт.
        // По умолчанию у DirectionalLightShadow очень маленькие границы (-5..5),
        // из-за чего тени могут не попадать на террейн при крупных сценах.
        shadow-camera-left={-512}
        shadow-camera-right={512}
        shadow-camera-top={512}
        shadow-camera-bottom={-512}
        shadow-camera-near={0.5}
        shadow-camera-far={shadowCameraFar ?? 1000}
        // Слегка смещаем расчёт глубины, чтобы избежать артефактов (shadow acne)
        shadow-bias={-0.0005}
        shadow-normalBias={0.3}
        // Направляем цель света в центр сцены (или в указанную точку),
        // чтобы камера теней ориентировалась на область интереса.
        target-position={directional?.target ?? [0, 0, 0]}
      />
    </>
  )
}
