import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { GfxLayerType } from '@/entities/layer'

/**
 * Отрисовывает слой воды на сцене.
 * Создаёт плоскость с шейдером имитации водной поверхности и анимирует её.
 */
export interface WaterLayerProps {
  layer: SceneLayer
}

export const WaterLayer: React.FC<WaterLayerProps> = ({ layer }) => {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    // Используем ширину (X) и глубину (Z). Для совместимости считываем legacy height.
    const w = layer.width || 10
    const d = (layer as any).depth ?? (layer as any).height ?? 10
    return new THREE.PlaneGeometry(w, d, 64, 64)
  }, [layer.width, (layer as any).depth, (layer as any).height])

  // Создаем shader material для имитации воды
  const waterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        color1: { value: new THREE.Color(0x006994) }, // Темно-синий цвет моря
        color2: { value: new THREE.Color(0x4fa8c5) }, // Светлее синий
        waveHeight: { value: 0.1 },
        waveFrequency: { value: 4.0 }
      },
      vertexShader: `
        uniform float time;
        uniform float waveHeight;
        uniform float waveFrequency;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          // Создаем волны на поверхности
          float wave1 = sin(position.x * waveFrequency + time) * waveHeight;
          float wave2 = sin(position.z * waveFrequency * 0.8 + time * 1.2) * waveHeight * 0.8;
          
          vec3 newPosition = position;
          newPosition.y += wave1 + wave2;
          
          // Вычисляем нормаль для корректного освещения
          float dx = cos(position.x * waveFrequency + time) * waveFrequency * waveHeight;
          float dz = cos(position.z * waveFrequency * 0.8 + time * 1.2) * waveFrequency * 0.8 * waveHeight * 0.8;
          
          vNormal = normalize(vec3(-dx, 1.0, -dz));
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          // Создаем переливы воды
          float fresnel = dot(vNormal, vec3(0.0, 0.0, 1.0));
          fresnel = pow(1.0 - fresnel, 2.0);
          
          // Смешиваем цвета основываясь на fresnel эффекте
          vec3 waterColor = mix(color1, color2, fresnel);
          
          // Добавляем немного шума для более реалистичного вида
          float noise = sin(vUv.x * 50.0 + time) * sin(vUv.y * 50.0 + time * 1.3) * 0.1;
          waterColor += noise * 0.1;
          
          // Делаем воду немного прозрачной
          gl_FragColor = vec4(waterColor, 0.8);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    })
  }, [])

  // Анимируем воду
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
