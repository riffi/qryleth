import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { GfxLayerType } from '@/entities/layer'
import { useSceneLighting } from '@/features/editor/scene/model/sceneStore.ts'

/**
 * Отрисовывает слой воды на сцене.
 * Создаёт плоскость с шейдером имитации водной поверхности и анимирует её.
 */
export interface WaterLayerProps {
  layer: SceneLayer
}

export const WaterLayer: React.FC<WaterLayerProps> = ({ layer }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const lighting = useSceneLighting()

  const geometry = useMemo(() => {
    // Используем ширину (X) и глубину (Z). Для совместимости считываем legacy height.
    const w = layer.width || 10
    const d = (layer as any).depth ?? (layer as any).height ?? 10
    return new THREE.PlaneGeometry(w, d, 64, 64)
  }, [layer.width, (layer as any).depth, (layer as any).height])

  // Создаем shader material для имитации воды с учетом глобального освещения
  const waterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        color1: { value: new THREE.Color(0x006994) }, // Темно-синий цвет моря
        color2: { value: new THREE.Color(0x4fa8c5) }, // Светлее синий
        // Параметры волн в мировых координатах (устойчиво к размеру плоскости и повороту камеры)
        waveHeight: { value: 0.02 },     // Низкая амплитуда
        waveLength1: { value: 60.0 },    // Длина волны №1 (мировые единицы)
        waveLength2: { value: 28.0 },    // Длина волны №2 (мировые единицы)
        waveSpeed: { value: 0.06 },      // Медленная анимация
        // Глобальное освещение (ambient + один направленный источник)
        ambientColor: { value: new THREE.Color('#87CEEB') },
        ambientIntensity: { value: 0.6 },
        dirLightColor: { value: new THREE.Color('#FFD700') },
        dirLightIntensity: { value: 1.0 },
        dirLightDirection: { value: new THREE.Vector3(0, -1, 0) },
        // Дополнительный множитель яркости воды (делает её светлее при той же схеме освещения)
        waterBrightness: { value: 1 },
      },
      vertexShader: `
        uniform float time;
        uniform float waveHeight;
        uniform float waveLength1;
        uniform float waveLength2;
        uniform float waveSpeed;
        
        // Мировые координаты и нормаль для расчёта освещения
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          // Базовая мировая позиция вершины без смещения
          vec3 worldPos0 = (modelMatrix * vec4(position, 1.0)).xyz;

          // Две независимые волны в фиксированных мировых направлениях (не зависят от камеры)
          vec2 d1 = normalize(vec2(1.0, 0.2));
          vec2 d2 = normalize(vec2(-0.3, 1.0));
          float k1 = 6.28318530718 / max(waveLength1, 0.0001);
          float k2 = 6.28318530718 / max(waveLength2, 0.0001);
          float phase1 = dot(worldPos0.xz, d1) * k1 + time * waveSpeed;
          float phase2 = dot(worldPos0.xz, d2) * k2 + time * (waveSpeed * 0.8);

          float disp = sin(phase1) + 0.6 * sin(phase2);

          // Смещаем вершину вдоль Y в локальном пространстве
          vec3 newPosition = position;
          newPosition.y += waveHeight * disp;

          // Градиенты высоты по X/Z в мировых координатах -> мировая нормаль
          float dHx = waveHeight * (cos(phase1) * k1 * d1.x + 0.6 * cos(phase2) * k2 * d2.x);
          float dHz = waveHeight * (cos(phase1) * k1 * d1.y + 0.6 * cos(phase2) * k2 * d2.y);
          vWorldNormal = normalize(vec3(-dHx, 1.0, -dHz));

          // Мировая позиция с учетом смещения
          vWorldPos = (modelMatrix * vec4(newPosition, 1.0)).xyz;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        // Параметры глобального освещения
        uniform vec3 ambientColor;
        uniform float ambientIntensity;
        uniform vec3 dirLightColor;
        uniform float dirLightIntensity;
        uniform vec3 dirLightDirection; // нормализованный вектор направления света
        uniform float waterBrightness;
        // Позиция камеры предоставляется движком three.js как встроенный uniform cameraPosition
        
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec2 vUv;
        
        void main() {
          // Почти однородная непрозрачность по всей площади
          float fadeOut = 1.0;
          // Базовый цвет воды без Fresnel, чуть светлее за счёт большего вклада второго оттенка
          vec3 waterColor = mix(color1, color2, 0.45);
          
          // Добавляем немного шума для более реалистичного вида (сниженная частота и амплитуда)
          float noise = sin(vUv.x * 10.0 + time * 0.3) * sin(vUv.y * 10.0 + time * 0.27) * 0.05;
          waterColor += noise * 0.06;
          
          // === Глобальное освещение ===
          // Направленный свет: используем постоянное направление независимо от позиции фрагмента
          vec3 L = normalize(-dirLightDirection);
          float lambert = max(dot(normalize(vWorldNormal), L), 0.0);
          vec3 ambientTerm = ambientColor * ambientIntensity;
          vec3 directionalTerm = dirLightColor * dirLightIntensity * lambert;
          vec3 lighting = ambientTerm + directionalTerm;
          
          // Применяем освещение к цвету воды и ограничиваем диапазон
          // Усиливаем общую яркость воды, чтобы визуально она была светлее
          vec3 litColor = clamp(waterColor * lighting * waterBrightness, 0.0, 1.0);
          
          // Применяем размытие краев к прозрачности
          float alpha = 1.0 * fadeOut; // практически сплошная вода; прозрачны лишь крайние 2%
          
          gl_FragColor = vec4(litColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    })
  }, [])

  /**
   * Обновляет uniform-параметры шейдера воды на основании
   * глобальных настроек освещения из стора сцены.
   *
   * Метод безопасно конвертирует строковые hex-цвета в THREE.Color и
   * устанавливает интенсивности/позицию направленного света.
   */
  useEffect(() => {
    const material = meshRef.current?.material as THREE.ShaderMaterial | undefined
    if (!material) return

    const ambientColor = new THREE.Color(lighting.ambient?.color ?? '#87CEEB')
    const ambientIntensity = lighting.ambient?.intensity ?? 0.6
    const dirColor = new THREE.Color(lighting.directional?.color ?? '#FFD700')
    const dirIntensity = lighting.directional?.intensity ?? 1.0
    const dirPos = lighting.directional?.position ?? [10, 10, 10]
    const dirTarget = lighting.directional?.target ?? [0, 0, 0]
    const exposure = lighting.exposure ?? 1.0

    // Тонирование базового цвета воды под фон/небо сцены
    const skyHex = lighting.backgroundColor || lighting.ambient?.color || '#87CEEB'
    const sky = new THREE.Color(skyHex)
    const base1 = new THREE.Color(0x006994)
    const base2 = new THREE.Color(0x4fa8c5)
    const tinted1 = base1.clone().lerp(sky, 0.35)
    const tinted2 = base2.clone().lerp(sky, 0.55)
    material.uniforms.color1.value.copy(tinted1)
    material.uniforms.color2.value.copy(tinted2)

    material.uniforms.ambientColor.value.copy(ambientColor)
    material.uniforms.ambientIntensity.value = ambientIntensity
    material.uniforms.dirLightColor.value.copy(dirColor)
    material.uniforms.dirLightIntensity.value = dirIntensity
    // Рассчитываем направление лучей от источника к цели (как у DirectionalLight)
    const dx = (dirTarget[0] - dirPos[0])
    const dy = (dirTarget[1] - dirPos[1])
    const dz = (dirTarget[2] - dirPos[2])
    const len = Math.hypot(dx, dy, dz) || 1
    material.uniforms.dirLightDirection.value.set(dx / len, dy / len, dz / len)
    // Яркость воды: читаем из слоя (если задано), далее учитываем экспозицию сцены
    const layerBrightness = (layer as any).water?.brightness as number | undefined
    material.uniforms.waterBrightness.value = (layerBrightness ?? 1.6) * exposure
  }, [lighting, layer])

  // Анимируем воду (передача времени в шейдер для динамики волн)
  useFrame((state) => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.time.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={waterMaterial}
      visible={layer.visible}
      rotation={[-Math.PI / 2, 0, 0]} // Поворачиваем горизонтально
      position={[0, -0.1, 0]} // Размещаем чуть ниже сетки
      receiveShadow
      userData={{
        generated: true,
        layerId: layer.id,
        layerType: GfxLayerType.Water
      }}
    />
  )
}
