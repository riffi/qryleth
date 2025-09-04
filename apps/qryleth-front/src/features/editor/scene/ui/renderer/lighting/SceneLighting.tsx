import React, {useMemo, useRef} from 'react'
import { Fog, FogExp2 } from 'three'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneLighting, useSceneStore } from '../../../model/sceneStore.ts'

/**
 * Компонент, рендерящий источники света и атмосферные эффекты в сцене редактора
 * по новой структуре LightingSettings.
 */
export const SceneLighting: React.FC = () => {
  const lighting = useSceneLighting()
  const { scene } = useThree()
  // Реф на направленный источник света
  const lightRef = useRef<THREE.DirectionalLight>(null)
  // Флаг видимости хелпера камеры теней из глобального стора сцены
  const helperVisible = useSceneStore(state => state.shadowCameraHelperVisible)

  // Параметры окружающего света
  const ambientColor = lighting.ambient?.color ?? '#87CEEB'
  const ambientIntensity = lighting.ambient?.intensity ?? 0.6

  const shadowCameraRectSize = 100

  // Параметры единственного направленного источника света
  const directional = lighting.directional
  const directionalColor = directional?.color ?? '#FFD700'
  const directionalIntensity = directional?.intensity ?? 1
  const directionalPosition = directional?.position ?? [500, 150, -1000]
  const castShadow = directional?.castShadow ?? true
  const shadowMapSize = directional?.shadowProps?.mapSize ?? [1048, 1048]
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

  // Мемоизированный хелпер камеры теней, создаётся при наличии DirectionalLight
  const shadowCameraHelper = useMemo(() => {
    // Если реф ещё не привязан или флаг выключен — хелпер не создаём
    if (!lightRef.current || !helperVisible) return null
    const cam = lightRef.current.shadow?.camera
    if (!cam) return null
    const helper = new THREE.CameraHelper(cam)
    helper.visible = true
    return helper
  // Пересоздаём хелпер при смене камеры теней или переключении флага видимости
  }, [helperVisible, lightRef.current?.shadow?.camera])

  // Следим за изменением флага видимости и обновляем свойство helper.visible
  // Нет отдельного эффекта — видимость контролируется в мемо и через условный рендер

  return (
    <>
      <ambientLight color={ambientColor} intensity={ambientIntensity} />
      <directionalLight
        ref={lightRef}
        position={directionalPosition}
        color={directionalColor}
        intensity={directionalIntensity}
        castShadow={castShadow}
        shadow-mapSize-width={shadowMapSize[0]}
        shadow-mapSize-height={shadowMapSize[1]}
        // Расширяем ортографическую камеру теней, чтобы покрыть ландшафт.
        // По умолчанию у DirectionalLightShadow очень маленькие границы (-5..5),
        // из-за чего тени могут не попадать на террейн при крупных сценах.
        shadow-camera-left={-shadowCameraRectSize}
        shadow-camera-right={shadowCameraRectSize}
        shadow-camera-top={shadowCameraRectSize}
        shadow-camera-bottom={-shadowCameraRectSize}
        shadow-camera-near={0.3}
        shadow-camera-far={300}
        // Слегка смещаем расчёт глубины, чтобы избежать артефактов (shadow acne)
        shadow-bias={-0.0001}
        shadow-normalBias={-0.001}
        // Направляем цель света в центр сцены (или в указанную точку),
        // чтобы камера теней ориентировалась на область интереса.
        target-position={[0, 0, 0]}
      />

      {/* Хелпер камеры теней. Показывается по флагу из UI. */}
      {shadowCameraHelper && <primitive object={shadowCameraHelper} />}
    </>
  )
}
