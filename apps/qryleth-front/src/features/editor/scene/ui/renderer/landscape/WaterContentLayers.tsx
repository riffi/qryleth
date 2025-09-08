import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { extend, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Water } from 'three-stdlib'
import { useSceneLighting, useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { paletteRegistry } from '@/shared/lib/palette'
import { GfxLayerType } from '@/entities/layer'

/**
 * Рендер воды (новая архитектура): читает элементы из `waterContent` и
 * отрисовывает водные прямоугольные области. Круги/полигоны пока пропускаются.
 */
export const WaterContentLayers: React.FC = () => {
  const water = useSceneStore(state => state.waterContent) || []
  const layers = useSceneStore(state => state.layers)
  const visibleLayerIds = new Set((layers || []).filter(l => l.type === GfxLayerType.Water).filter(l => l.visible !== false).map(l => l.id))
  const all = water.flatMap(c => c.items.map(it => ({ containerLayerId: c.layerId, body: it })))
  // Учитываем видимость слоя воды и видимость водоёма: скрытые не рендерим
  const rects = all.filter(x => x.body.surface.kind === 'rect' && visibleLayerIds.has(x.containerLayerId) && (x.body.visible !== false))
  if (rects.length === 0) return null
  return (
    <group>
      {rects.map(({ body }, idx) => (
        <WaterBodyRenderer key={`${body.id || idx}-${body.water?.type || 'simple'}`} body={body} />
      ))}
    </group>
  )
}

interface WaterRectMeshProps { body: import('@/entities/water').GfxWaterBody }

/**
 * Прямоугольная водная поверхность с простым шейдером волн.
 * Параметры освещения берутся из стора освещения сцены.
 */
// enable <water /> tag once
extend({ Water })
declare global { namespace JSX { interface IntrinsicElements { water: any } } }

const WaterBodyRenderer: React.FC<WaterRectMeshProps> = ({ body }) => {
  const lighting = useSceneLighting()
  const gl = useThree(state => state.gl)
  const environmentContent = useSceneStore(state => state.environmentContent)
  const paletteUuid = environmentContent?.paletteUuid || 'default'
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  // Прямоугольник в новой модели: Rect2D (x, z, width, depth)
  const { x: rectX, z: rectZ, width: rectW, depth: rectD } = body.surface.kind === 'rect'
    ? (body.surface as any)
    : { x: 0, z: 0, width: 0, depth: 0 }
  const width = Math.max(0.001, Number(rectW) || 0)
  const depth = Math.max(0.001, Number(rectD) || 0)
  const centerX = (Number(rectX) || 0) + width / 2
  const centerZ = (Number(rectZ) || 0) + depth / 2

  // Общая геометрия для обоих путей
  const geometry = useMemo(() => new THREE.PlaneGeometry(width, depth, 64, 64), [width, depth])

  // Данные для realistic (вызываются всегда для стабильности хуков)
  const waterNormals = useLoader(THREE.TextureLoader, '/waternormals.jpeg')
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping
  const realisticConfig = useMemo(() => ({
    textureWidth: 512,
    textureHeight: 512,
    waterNormals,
    sunDirection: new THREE.Vector3(0, -1, 0),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    fog: lighting.fog?.enabled ?? false,
    format: (gl as any).encoding
  }), [waterNormals, gl, lighting.fog?.enabled])

  // Материал для simple (создаётся всегда)
  // Colors for simple water from palette
  const baseWaterHex = (activePalette as any)?.colors?.water || '#4aa3c7'
  const color2Hex = baseWaterHex
  const color1Hex = (() => {
    // lighten +0.2 Value in HSV
    const h = baseWaterHex.replace('#','')
    const value = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h, 16)
    const r=(value>>16)&255, g=(value>>8)&255, b=value&255
    const max=Math.max(r,g,b)/255, min=Math.min(r,g,b)/255
    const d=max-min
    const s=max===0?0:d/max
    let hh=0
    if(d!==0){
      const rr=r/255, gg=g/255, bb=b/255
      switch(max){
        case rr: hh=( (gg-bb)/d + (gg<bb?6:0) )/6; break
        case gg: hh=( (bb-rr)/d + 2 )/6; break
        case bb: hh=( (rr-gg)/d + 4 )/6; break
      }
    }
    const nv=Math.max(0, Math.min(1, max + 0.2))
    const i=Math.floor(hh*6)
    const f=hh*6 - i
    const p=nv*(1-s)
    const q=nv*(1-f*s)
    const t=nv*(1-(1-f)*s)
    let rr2=0, gg2=0, bb2=0
    switch(i%6){
      case 0: rr2=nv; gg2=t; bb2=p; break
      case 1: rr2=q; gg2=nv; bb2=p; break
      case 2: rr2=p; gg2=nv; bb2=t; break
      case 3: rr2=p; gg2=q; bb2=nv; break
      case 4: rr2=t; gg2=p; bb2=nv; break
      case 5: rr2=nv; gg2=p; bb2=q; break
    }
    const toHex=(n:number)=>Math.round(n*255).toString(16).padStart(2,'0')
    return `#${toHex(rr2)}${toHex(gg2)}${toHex(bb2)}`
  })()

  const simpleMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      color1: { value: new THREE.Color(color1Hex) },
      color2: { value: new THREE.Color(color2Hex) },
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
      uniform float time; uniform float waveHeight; uniform float waveLength1; uniform float waveLength2; uniform float waveSpeed;
      varying vec3 vWorldPos; varying vec3 vWorldNormal; varying vec2 vUv;
      void main(){ vUv=uv; vec3 wp=(modelMatrix*vec4(position,1.0)).xyz; vec2 d1=normalize(vec2(1.0,0.2)); vec2 d2=normalize(vec2(-0.3,1.0));
      float k1=6.28318530718/max(waveLength1,0.0001); float k2=6.28318530718/max(waveLength2,0.0001);
      float p1=dot(wp.xz,d1)*k1+time*waveSpeed; float p2=dot(wp.xz,d2)*k2+time*(waveSpeed*0.8);
      float disp=sin(p1)+0.6*sin(p2); vec3 np=position; np.y+=waveHeight*disp;
      float dHx=waveHeight*(cos(p1)*k1*d1.x+0.6*cos(p2)*k2*d2.x); float dHz=waveHeight*(cos(p1)*k1*d1.y+0.6*cos(p2)*k2*d2.y);
      vWorldNormal=normalize(vec3(-dHx,1.0,-dHz)); vWorldPos=(modelMatrix*vec4(np,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(np,1.0); }
    `,
    fragmentShader: `
      uniform vec3 color1; uniform vec3 color2; uniform vec3 ambientColor; uniform float ambientIntensity; uniform vec3 dirLightColor; uniform float dirLightIntensity; uniform vec3 dirLightDirection; uniform float waterBrightness; varying vec3 vWorldNormal; varying vec2 vUv;
      void main(){ float mixF=smoothstep(0.0,1.0,vUv.y); vec3 base=mix(color1,color2,mixF); float nd=max(dot(normalize(vWorldNormal),normalize(-dirLightDirection)),0.0);
      vec3 diff=dirLightColor*dirLightIntensity*nd; vec3 amb=ambientColor*ambientIntensity; vec3 lit=(base*(amb+diff))*waterBrightness; gl_FragColor=vec4(lit,0.98); }
    `,
    transparent: true, side: THREE.DoubleSide
  }), [])

  const simpleRef = useRef<THREE.Mesh>(null)
  const realisticRef = useRef<any>(null)

  // Синхронизация параметров освещения для simple
  useEffect(() => {
    const material = simpleRef.current?.material as THREE.ShaderMaterial | undefined
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

  // Синхронизация параметров для realistic
  useEffect(() => {
    const obj = realisticRef.current as any
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
    const skyHex = lighting.backgroundColor || lighting.ambient?.color || '#87CEEB'
    const baseWater = new THREE.Color(0x001e0f)
    const sky = new THREE.Color(skyHex)
    const tonedWater = baseWater.clone().lerp(sky, 0.2)
    uniforms.sunDirection.value.copy(dir)
    uniforms.sunColor.value.set(new THREE.Color(sunHex).multiplyScalar(sunIntensity))
    const brightness = (body.water?.brightness ?? 1.0) as number
    uniforms.waterColor.value.set(tonedWater.multiplyScalar(Math.max(0.2, brightness)))
    const exposure = lighting.exposure ?? 1.0
    uniforms.distortionScale.value = 3.7 * exposure
  }, [lighting, body.water?.brightness])

  // Общая анимация
  useFrame((state, delta) => {
    const mat = (simpleRef.current?.material as THREE.ShaderMaterial | undefined)
    if (mat) mat.uniforms.time.value = state.clock.elapsedTime
    const obj = realisticRef.current as any
    if (obj && obj.material && obj.material.uniforms?.time) obj.material.uniforms.time.value += delta / 2
  })
  // Update colors for simple water when palette changes
  useEffect(() => {
    const mat = simpleRef.current?.material as THREE.ShaderMaterial | undefined
    if (!mat) return
    mat.uniforms.color1.value.set(new THREE.Color(color1Hex))
    mat.uniforms.color2.value.set(new THREE.Color(color2Hex))
  }, [color1Hex, color2Hex])

  const isRealistic = body.water?.type === 'realistic'
  if (isRealistic) {
    return (
      <water
        ref={realisticRef}
        args={[geometry, realisticConfig]}
        rotation-x={-Math.PI / 2}
        position={[centerX, (body.altitudeY ?? 0) - 0.1, centerZ]}
        receiveShadow
        userData={{ waterBodyId: body.id, kind: body.kind }}
        /* Проброс видимости для реалистичной воды на уровне объекта */
        visible={body.visible !== false}
      />
    )
  }
  return (
    <mesh
      ref={simpleRef}
      geometry={geometry}
      material={simpleMaterial}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[centerX, (body.altitudeY ?? 0) - 0.1, centerZ] as any}
      receiveShadow
      userData={{ generated: true, waterBodyId: body.id, kind: body.kind }}
      /* Проброс видимости для простого шейдера воды */
      visible={body.visible !== false}
    />
  )
}
