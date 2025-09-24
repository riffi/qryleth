import React, { useEffect, useRef } from 'react'
import {OrbitControls, Sky} from '@react-three/drei'
import { EffectComposer, SSAO } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { ObjectSceneLighting } from '@/features/editor/object/ui/renderer/lighting/ObjectSceneLighting.tsx'
import { Environment } from '@/shared/r3f/environment/Environment'
import { ObjectScenePrimitives } from '@/features/editor/object/ui/renderer/objects/ObjectScenePrimitives.tsx'
import { PrimitiveTransformGizmo } from '@/features/editor/object/ui/renderer/controls/PrimitiveTransformGizmo.tsx'
import { useObjectLighting, useObjectGridVisible } from '../../model/objectStore.ts'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {Environment as DreiEnvironment} from "@react-three/drei/core/Environment";

/**
 * Содержимое сцены редактора объектов: освещение, окружение и примитивы.
 * Также подключает контролы трансформации и управление камерой.
 */
export const ObjectSceneContent: React.FC = () => {
  const lighting = useObjectLighting()
  const gridVisible = useObjectGridVisible()
  const orbitControlsRef = useRef<any>()
  const { camera } = useThree()

  /**
   * Устанавливает стартовое положение камеры «со стороны света».
   *
   * Назначение:
   * - Взять направление на источник направленного света (directional.position),
   *   нормализовать и разместить камеру на фиксированном расстоянии вдоль этого
   *   направления.
   * - Нацелить камеру на начало координат (0, 0, 0), чтобы объект по умолчанию
   *   был виден с освещённой стороны.
   */
  const setCameraFromLightSide = () => {
    const [lx, ly, lz] = lighting.directional?.position ?? [5, 5, 8]
    const dir = new THREE.Vector3(lx, ly, lz)
    if (dir.lengthSq() < 1e-6) dir.set(5, 5, 8)

    const distance = 12
    dir.normalize().multiplyScalar(distance)

    camera.position.set(dir.x, dir.y, dir.z)
    camera.lookAt(0, 0, 0)

    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.set(0, 0, 0)
      orbitControlsRef.current.update()
    }
  }

  // Инициализируем камеру при первом монтировании сцены
  useEffect(() => {
    setCameraFromLightSide()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <color attach="background" args={[lighting.backgroundColor || '#ffffff']} />
      <OrbitControls ref={orbitControlsRef} enablePan={true} enableZoom={true} enableRotate={true} />
      <ObjectSceneLighting />
      <Environment gridVisible={gridVisible} />
      <ObjectScenePrimitives />
      <PrimitiveTransformGizmo orbitControlsRef={orbitControlsRef} />
      <DreiEnvironment background={false} frames={1} resolution={256}>
        {/* Этот Sky не обязателен к показу — он только источник env-карты */}
        <Sky
            sunPosition={[10,10,10]}
            turbidity={0.1}
            rayleigh={1.0}
            mieCoefficient={0.005}
            mieDirectionalG={ 0.8}
        />
      </DreiEnvironment>
      {lighting.ambientOcclusion?.enabled && (
        <EffectComposer
            enableNormalPass
        >
          <SSAO
            intensity={lighting.ambientOcclusion.intensity || 1.0}
            radius={lighting.ambientOcclusion.radius || 0.5}
          />
        </EffectComposer>
      )}
    </>
  )
}
