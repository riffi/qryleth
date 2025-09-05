import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useSceneLighting, useSceneStore } from '@/features/editor/scene/model/sceneStore'

/**
 * Рендер воды (новая архитектура): читает элементы из `waterContent` и
 * отрисовывает водные прямоугольные области. Круги/полигоны пока пропускаются.
 */
export const WaterContentLayers: React.FC = () => {
  const water = useSceneStore(state => state.waterContent) || []
  const all = water.flatMap(c => c.items.map(it => ({ containerLayerId: c.layerId, body: it })))
  const rects = all.filter(x => x.body.surface.kind === 'rect')
  if (rects.length === 0) return null
  return (
    <group>
      {rects.map(({ body }, idx) => (
        <WaterRectMesh key={body.id || idx} body={body} />
      ))}
    </group>
  )
}

interface WaterRectMeshProps { body: import('@/entities/water').GfxWaterBody }

/**
 * Прямоугольная водная поверхность с простым шейдером волн.
 * Параметры освещения берутся из стора освещения сцены.
 */
const WaterRectMesh: React.FC<WaterRectMeshProps> = ({ body }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const lighting = useSceneLighting()

  const { xMin, xMax, zMin, zMax } = body.surface.kind === 'rect' ? body.surface : { xMin: 0, xMax: 0, zMin: 0, zMax: 0 }
  const width = Math.max(0.001, xMax - xMin)
  const depth = Math.max(0.001, zMax - zMin)
  const centerX = (xMin + xMax) / 2
  const centerZ = (zMin + zMax) / 2

  const geometry = useMemo(() => new THREE.PlaneGeometry(width, depth, 64, 64), [width, depth])

  const waterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        color1: { value: new THREE.Color(0x006994) },
        color2: { value: new THREE.Color(0x4fa8c5) },
        waveHeight: { value: 0.02 },
        waveLength1: { value: 60.0 },
        waveLength2: { value: 28.0 },
        waveSpeed: { value: 0.06 },
        ambientColor: { value: new THREE.Color('#87CEEB') },
        ambientIntensity: { value: 0.6 },
        dirLightColor: { value: new THREE.Color('#FFD700') },
        dirLightIntensity: { value: 1.0 },
        dirLightDirection: { value: new THREE.Vector3(0, -1, 0) },
        waterBrightness: { value: 1 },
      },
      vertexShader: `
        uniform float time;
        uniform float waveHeight;
        uniform float waveLength1;
        uniform float waveLength2;
        uniform float waveSpeed;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 worldPos0 = (modelMatrix * vec4(position, 1.0)).xyz;
          vec2 d1 = normalize(vec2(1.0, 0.2));
          vec2 d2 = normalize(vec2(-0.3, 1.0));
          float k1 = 6.28318530718 / max(waveLength1, 0.0001);
          float k2 = 6.28318530718 / max(waveLength2, 0.0001);
          float phase1 = dot(worldPos0.xz, d1) * k1 + time * waveSpeed;
          float phase2 = dot(worldPos0.xz, d2) * k2 + time * (waveSpeed * 0.8);
          float disp = sin(phase1) + 0.6 * sin(phase2);
          vec3 newPosition = position;
          newPosition.y += waveHeight * disp;
          float dHx = waveHeight * (cos(phase1) * k1 * d1.x + 0.6 * cos(phase2) * k2 * d2.x);
          float dHz = waveHeight * (cos(phase1) * k1 * d1.y + 0.6 * cos(phase2) * k2 * d2.y);
          vWorldNormal = normalize(vec3(-dHx, 1.0, -dHz));
          vWorldPos = (modelMatrix * vec4(newPosition, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 ambientColor;
        uniform float ambientIntensity;
        uniform vec3 dirLightColor;
        uniform float dirLightIntensity;
        uniform vec3 dirLightDirection;
        uniform float waterBrightness;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec2 vUv;
        void main() {
          float mixFactor = smoothstep(0.0, 1.0, vUv.y);
          vec3 baseColor = mix(color1, color2, mixFactor);
          float ndotl = max(dot(normalize(vWorldNormal), normalize(-dirLightDirection)), 0.0);
          vec3 diffuse = dirLightColor * dirLightIntensity * ndotl;
          vec3 ambient = ambientColor * ambientIntensity;
          vec3 litColor = (baseColor * (ambient + diffuse)) * waterBrightness;
          gl_FragColor = vec4(litColor, 0.98);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    })
  }, [])

  // Обновляем параметры освещения и тонирование под фон
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
    const dx = (dirTarget[0] - dirPos[0])
    const dy = (dirTarget[1] - dirPos[1])
    const dz = (dirTarget[2] - dirPos[2])
    const len = Math.hypot(dx, dy, dz) || 1
    material.uniforms.dirLightDirection.value.set(dx / len, dy / len, dz / len)
    const brightness = (body.water?.brightness ?? 1.6) * exposure
    material.uniforms.waterBrightness.value = brightness
  }, [lighting, body.water?.brightness])

  // Анимация
  useFrame((state) => {
    const mat = meshRef.current?.material as THREE.ShaderMaterial | undefined
    if (mat) mat.uniforms.time.value = state.clock.elapsedTime
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={waterMaterial}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[centerX, (body.altitudeY ?? 0) - 0.1, centerZ] as any}
      receiveShadow
      userData={{
        generated: true,
        waterBodyId: body.id,
        kind: body.kind
      }}
    />
  )
}

