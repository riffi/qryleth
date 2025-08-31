import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { extend, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Water } from 'three-stdlib'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { GfxLayerType } from '@/entities/layer'
import { useSceneLighting } from '@/features/scene/model/sceneStore.ts'
import type { WaterLayerProps as BaseWaterLayerProps } from './WaterLayer.tsx'

// Регистрируем класс Water как JSX-элемент <water /> для R3F
extend({ Water })

// Объявляем тип для кастомного JSX-тега <water />, чтобы TS не ругался при сборке
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Упрощённая типизация пропсов: достаточно any, т.к. R3F сам проверяет args и базовые props
      water: any
    }
  }
}

export interface AdvancedWaterLayerProps extends BaseWaterLayerProps {
  // Расширений поверх базовых пропсов не требуется — сохраняем совместимость
}

/**
 * Расширенный слой воды на основе three-stdlib Water.
 * Использует отражения/преломления и нормали из текстуры для более реалистичного вида.
 *
 * Компонент совместим по пропсам с существующим WaterLayer и может заменить его в рендеринге.
 */
export const AdvancedWaterLayer: React.FC<AdvancedWaterLayerProps> = ({ layer }) => {
  const ref = useRef<any>(null)
  const lighting = useSceneLighting()
  const gl = useThree((state) => state.gl)
  const fogEnabled = lighting.fog?.enabled ?? false

  /**
   * Создаёт геометрию плоскости под воду на основе размеров слоя.
   *
   * - Ширина (X) берётся из layer.width
   * - Глубина (Z) берётся из layer.depth (или legacy height, если depth отсутствует)
   * - Количество сегментов выставлено умеренным (64x64) для корректной тесселяции отражений
   */
  const geometry = useMemo(() => {
    const w = layer.width || 10
    const d = (layer as any).depth ?? (layer as any).height ?? 10
    return new THREE.PlaneGeometry(w, d, 64, 64)
  }, [layer.width, (layer as any).depth, (layer as any).height])

  /**
   * Загружает текстуру нормалей воды из публичной директории.
   *
   * Текстура тайлится по обеим осям (RepeatWrapping), что обеспечивает бесшовность
   * при больших размерах плоскости воды.
   */
  const waterNormals = useLoader(THREE.TextureLoader, '/waternormals.jpeg')
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping

  /**
   * Формирует конфигурацию Water-материала на базе текущего WebGL-контекста и загруженных нормалей.
   *
   * Важно: формат берём из текущего рендера (`gl.encoding`), чтобы избежать некорректного гамма-корректирования.
   */
  const config = useMemo(
    () => ({
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: new THREE.Vector3(0, -1, 0),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      // Включаем поддержку тумана движка three.js в материале Water
      fog: fogEnabled,
      format: (gl as any).encoding
    }),
    [waterNormals, gl, fogEnabled]
  )

  /**
   * Синхронизирует uniforms Water-материала с глобальными настройками освещения сцены.
   *
   * - Цвет/интенсивность солнца берём из directional light
   * - Направление вычисляем как нормализованный вектор из позиции источника к цели
   * - Цвет воды слегка тонируем под цвет фона/неба сцены
   */
  useEffect(() => {
    const obj = ref.current as any
    if (!obj || !obj.material) return
    const uniforms = obj.material.uniforms

    const sunHex = lighting.directional?.color ?? '#ffffff'
    const sunIntensity = lighting.directional?.intensity ?? 1.0
    const dirPos = lighting.directional?.position ?? [10, 10, 10]
    const dirTarget = lighting.directional?.target ?? [0, 0, 0]

    const dx = dirTarget[0] - dirPos[0]
    const dy = dirTarget[1] - dirPos[1]
    const dz = dirTarget[2] - dirPos[2]
    const len = Math.hypot(dx, dy, dz) || 1
    const dir = new THREE.Vector3(dx / len, dy / len, dz / len)

    // Базовый цвет воды подкрашиваем под фон/небо, чтобы картинка смотрелась цельно
    const skyHex = lighting.backgroundColor || lighting.ambient?.color || '#87CEEB'
    const baseWater = new THREE.Color(0x001e0f)
    const sky = new THREE.Color(skyHex)
    const tonedWater = baseWater.clone().lerp(sky, 0.2)

    uniforms.sunDirection.value.copy(dir)
    uniforms.sunColor.value.set(new THREE.Color(sunHex).multiplyScalar(sunIntensity))
    // Яркость воды из слоя (legacy-параметр), используем как дополнительный множитель цвета
    const layerBrightness = ((layer as any).water?.brightness ?? 1.0) as number
    uniforms.waterColor.value.set(tonedWater.multiplyScalar(Math.max(0.2, layerBrightness)))

    // Яркость воды можно слегка подстроить под экспозицию сцены, влияя на масштаб искажения
    const exposure = lighting.exposure ?? 1.0
    uniforms.distortionScale.value = 3.7 * exposure
  }, [lighting, layer])

  /**
   * Синхронизация флага fog у материала с настройками сцены.
   * Работает как для линейного, так и для экспоненциального тумана,
   * задаваемого в компоненте SceneLighting через scene.fog.
   */
  useEffect(() => {
    const obj = ref.current as any
    if (!obj || !obj.material) return
    if (obj.material.fog !== fogEnabled) {
      obj.material.fog = fogEnabled
      obj.material.needsUpdate = true
    }
  }, [fogEnabled])

  /**
   * Анимирует время в шейдере Water, обеспечивая движение волн и динамику отражений.
   *
   * Инкрементируем uniform `time` на величину дельта-кадра.
   */
  useFrame((_, delta) => {
    const obj = ref.current as any
    if (!obj || !obj.material) return
    obj.material.uniforms.time.value += delta /2
  })

  return (
    // ВАЖНО: Water — это Mesh, поэтому поддерживает стандартные props, включая rotation/position/visible/userData
    <water
      ref={ref}
      args={[geometry, config]}
      rotation-x={-Math.PI / 2}
      position={[0, -0.1, 0]}
      visible={layer.visible}
      receiveShadow
      userData={{
        generated: true,
        layerId: layer.id,
        layerType: GfxLayerType.Water
      }}
    />
  )
}
