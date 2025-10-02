import React, { useMemo, useRef, useCallback } from 'react'
import { Instances, Instance } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneObject, SceneObjectInstance, SceneLayer } from '@/entities/scene/types'
import { GfxLayerType } from '@/entities/layer'
import { useInstancedTransformOverrides } from '@/shared/r3f/optimization/InstancedTransformContext'
import { InstancedBranches } from '@/shared/r3f/optimization/InstancedBranches'
import { InstancedLeaves } from '@/shared/r3f/optimization/InstancedLeaves'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { paletteRegistry } from '@/shared/lib/palette'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import { woodTextureRegistry, initializeWoodTextures, rockTextureRegistry, initializeRockTextures } from '@/shared/lib/textures'
import { usePartitionInstancesByLod, defaultTreeLodConfig } from '@/shared/r3f/optimization/treeLod'
import { SCENE_CHUNKED_LEAVES_ENABLED, SCENE_CHUNKED_TRUNKS_ENABLED, SCENE_CHUNKED_GRASS_ENABLED } from '@/shared/r3f/optimization/flags'

// Флаг-рубильник: отключаем рендер цилиндров ствола/ветвей (InstancedBranches)
// Единый меш коры уже используется по умолчанию; оставляем возможность включить в будущем.
const ENABLE_CYLINDER_BRANCH_LOD = false;


// Component for rendering primitives in Instances
const PrimitiveGeometry: React.FC<{ primitive: any }> = ({ primitive }) => {
  const { type, geometry } = primitive

  switch (type) {
    case 'mesh': {
      const g = useMemo(() => {
        const bg = new THREE.BufferGeometry()
        if (geometry?.positions) bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(geometry.positions), 3))
        if (geometry?.normals && geometry.normals.length === geometry.positions?.length) {
          bg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(geometry.normals), 3))
        } else {
          bg.computeVertexNormals()
        }
        if (geometry?.uvs) bg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.uvs), 2))
        if (geometry?.indices) bg.setIndex(geometry.indices)
        bg.computeBoundingBox()
        bg.computeBoundingSphere()
        return bg
      }, [geometry])
      return <primitive attach="geometry" object={g} />
    }
    case 'box':
      return (
        <boxGeometry
          args={[
            geometry.width || 1,
            geometry.height || 1,
            geometry.depth || 1
          ]}
        />
      )

    case 'sphere':
      return (
        <sphereGeometry
          args={[
            geometry.radius || 0.5,
            32, 32
          ]}
        />
      )

    case 'cylinder':
      return (
        <cylinderGeometry
          args={[
            geometry.radiusTop || 0.5,
            geometry.radiusBottom || 0.5,
            geometry.height || 1,
            32
          ]}
        />
      )

    case 'cone':
      return (
        <coneGeometry
          args={[
            geometry.radius || 0.5,
            geometry.height || 1,
            32
          ]}
        />
      )

    case 'pyramid':
      return (
        <coneGeometry
          args={[
            geometry.baseSize || 0.5,
            geometry.height || 1,
            4 // 4 sides for pyramid
          ]}
        />
      )

    case 'plane':
      return (
        <planeGeometry
          args={[
            geometry.width || 1,
            geometry.height || 1
          ]}
        />
      )

    default:
      return <boxGeometry args={[1, 1, 1]} />
  }
}

// Component for rendering materials in Instances
interface PrimitiveMaterialProps {
  primitive: any
  materials?: any[]
  sceneObject?: SceneObject
}
/**
 * Материал для примитива внутри InstancedMesh.
 *
 * Для объектов типа 'rock' (камни) в SceneEditor трипланарное наложение
 * каменных текстур включается по умолчанию, если флаг не задан в sceneObject.rockData.
 * Явное значение rockTriplanar=false уважается и отключает трипланар.
 */
const PrimitiveMaterial: React.FC<PrimitiveMaterialProps> = ({ primitive, materials, sceneObject }) => {
  // Читаем активную палитру сцены → реактивно перерисовываем материал при её смене
  const paletteUuid = useSceneStore(s => s.environmentContent?.paletteUuid || 'default')
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  // Унифицированный резолв материала как в PrimitiveRenderer
  const resolved = resolveMaterial({
    directMaterial: primitive.material,
    objectMaterialUuid: primitive.objectMaterialUuid,
    globalMaterialUuid: primitive.globalMaterialUuid,
    objectMaterials: materials,
  })
  const threeProps = materialToThreePropsWithPalette(resolved, activePalette as any)

  // Поддержка набора текстур камня и трипланара в инстанс‑рендере
  const [colorMap, setColorMap] = React.useState<THREE.Texture | null>(null)
  const [normalMap, setNormalMap] = React.useState<THREE.Texture | null>(null)
  const [roughnessMap, setRoughnessMap] = React.useState<THREE.Texture | null>(null)
  const [aoMap, setAoMap] = React.useState<THREE.Texture | null>(null)
  const matRef = React.useRef<THREE.MeshStandardMaterial | null>(null)
  // Инициализация реестра камня
  if (rockTextureRegistry.size === 0) { try { initializeRockTextures() } catch {} }

  React.useEffect(() => {
    if (!sceneObject) return
    const rock = (sceneObject as any)?.rockData?.params
    const rockSetId: string | undefined = rock?.rockTextureSetId
    const ru: number = rock?.rockUvRepeatU ?? 1
    const rv: number = rock?.rockUvRepeatV ?? 1
    // Трипланар: по умолчанию true для объектов типа 'rock',
    // если значение не задано явно в параметрах объекта сцены
    const triplanar: boolean = (rock?.rockTriplanar === undefined)
      ? (sceneObject?.objectType === 'rock')
      : !!rock?.rockTriplanar
    const texScale: number = rock?.rockTexScale ?? 3

    if (!rockSetId) { setColorMap(null); setNormalMap(null); setRoughnessMap(null); setAoMap(null); return }
    const set = rockTextureRegistry.get(rockSetId)
    if (!set) return
    const loader = new THREE.TextureLoader()
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(Math.max(0.05, ru || 1), Math.max(0.05, rv || 1))
      t.anisotropy = 4
      t.needsUpdate = true
    }
    loader.load(set.colorMapUrl, (t) => { onTex(t); (t as any).colorSpace = (THREE as any).SRGBColorSpace || (t as any).colorSpace; setColorMap(t) })
    if (set.normalMapUrl) loader.load(set.normalMapUrl, (t) => { onTex(t); setNormalMap(t) })
    else setNormalMap(null)
    if (set.roughnessMapUrl) loader.load(set.roughnessMapUrl, (t) => { onTex(t); setRoughnessMap(t) })
    else setRoughnessMap(null)
    if (set.aoMapUrl) loader.load(set.aoMapUrl, (t) => { onTex(t); setAoMap(t) })
    else setAoMap(null)

    // Трипланарный патч
    if (triplanar && matRef.current) {
      const m = matRef.current
      m.onBeforeCompile = (shader: any) => {
        shader.uniforms.uTexScale = { value: texScale }
        // Устанавливаем uniform'ы окраски камня из палитры
        const __pf = Math.max(0, Math.min(1, (rock as any)?.rockPaletteFactor ?? 0))
        const __tc = new THREE.Color((threeProps as any)?.color || '#ffffff')
        if ((__tc as any).convertSRGBToLinear) (__tc as any).convertSRGBToLinear()
        shader.uniforms.uRockPaintFactor = { value: __pf }
        shader.uniforms.uRockTargetColor = { value: __tc }
        const isGLSL3 = shader.fragmentShader.includes('#version 300 es')
        const varyingDeclV = isGLSL3
          ? 'out vec3 vWorldPos;\nout vec3 vWorldNormal;\n'
          : 'varying vec3 vWorldPos;\nvarying vec3 vWorldNormal;\n'
        const varyingDeclF = isGLSL3
          ? 'in vec3 vWorldPos;\nin vec3 vWorldNormal;\n'
          : 'varying vec3 vWorldPos;\nvarying vec3 vWorldNormal;\n'
        const texFn = isGLSL3 ? 'texture' : 'texture2D'
        if (isGLSL3) shader.vertexShader = shader.vertexShader.replace('void main() {', `${varyingDeclV}\nvoid main() {`)
        else shader.vertexShader = `${varyingDeclV}` + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\n vWorldPos = worldPosition.xyz;\n vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);'
        )
        const funcs = `\nuniform float uTexScale;\nuniform float uRockPaintFactor;\nuniform vec3 uRockTargetColor;\n${varyingDeclF}
vec3 blendWeights(vec3 n){ vec3 an = abs(n); an = pow(an, vec3(4.0)); float s = an.x+an.y+an.z+1e-5; return an/s; }
vec2 uvProj(vec3 p, int axis){ if(axis==0) return p.zy; if(axis==1) return p.xz; return p.xy; }
vec4 triColor(sampler2D tex, vec3 pos, vec3 n){ vec3 w = blendWeights(n); vec4 cx = ${texFn}(tex, uvProj(pos*uTexScale,0)); vec4 cy = ${texFn}(tex, uvProj(pos*uTexScale,1)); vec4 cz = ${texFn}(tex, uvProj(pos*uTexScale,2)); return cx*w.x + cy*w.y + cz*w.z; }
float triScalar(sampler2D tex, vec3 pos, vec3 n){ return triColor(tex, pos, n).r; }
vec3 triNormalWS(sampler2D tex, vec3 pos, vec3 n){ vec3 w = blendWeights(n); vec3 nTx = ${texFn}(tex, uvProj(pos*uTexScale,0)).xyz*2.0-1.0; vec3 Tx=vec3(0.0,0.0,1.0), Bx=vec3(0.0,1.0,0.0), Nx=vec3(1.0,0.0,0.0); vec3 wx = normalize(Tx*nTx.x + Bx*nTx.y + Nx*nTx.z); vec3 nTy = ${texFn}(tex, uvProj(pos*uTexScale,1)).xyz*2.0-1.0; vec3 Ty=vec3(1.0,0.0,0.0), By=vec3(0.0,0.0,1.0), Ny=vec3(0.0,1.0,0.0); vec3 wy = normalize(Ty*nTy.x + By*nTy.y + Ny*nTy.z); vec3 nTz = ${texFn}(tex, uvProj(pos*uTexScale,2)).xyz*2.0-1.0; vec3 Tz=vec3(1.0,0.0,0.0), Bz=vec3(0.0,1.0,0.0), Nz=vec3(0.0,0.0,1.0); vec3 wz = normalize(Tz*nTz.x + Bz*nTz.y + Nz*nTz.z); return normalize(wx*w.x + wy*w.y + wz*w.z); }`
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + funcs)
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <map_fragment>',
            `#ifdef USE_MAP\n  vec4 texelColor = triColor(map, vWorldPos, normalize(vWorldNormal));\n  texelColor.rgb = pow( max(texelColor.rgb, vec3(0.0)), vec3(2.2) );\n  vec3 mixed = mix( texelColor.rgb, uRockTargetColor, clamp(uRockPaintFactor, 0.0, 1.0) );\n  diffuseColor.rgb *= mixed;\n  diffuseColor.a *= texelColor.a;\n#endif`
          )
          .replace(
            '#include <normal_fragment_maps>',
            `#ifdef USE_NORMALMAP\n  vec3 Nw = triNormalWS(normalMap, vWorldPos, normalize(vWorldNormal));\n  normal = normalize( ( viewMatrix * vec4( Nw, 0.0 ) ).xyz );\n#endif`
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\n float tr = triScalar( roughnessMap, vWorldPos, normalize(vWorldNormal) );\n roughnessFactor *= tr;\n#endif`
          )
          .replace(
            '#include <aomap_fragment>',
            `#ifdef USE_AOMAP\n float ao = triScalar( aoMap, vWorldPos, normalize(vWorldNormal) );\n float ambientOcclusion = 1.0 - (1.0 - ao) * aoMapIntensity;\n reflectedLight.indirectDiffuse *= ambientOcclusion;\n #ifdef USE_CLEARCOAT\n  reflectedLight.indirectDiffuse += irradiance * (clearCoat * envBRDF.x) * ambientOcclusion;\n #endif\n#endif`
          )
      }
      m.needsUpdate = true
    }
  }, [sceneObject])

  return (
    <meshStandardMaterial
      ref={matRef as any}
      {...threeProps}
      map={colorMap || undefined}
      normalMap={normalMap || undefined}
      roughnessMap={roughnessMap || undefined}
      aoMap={aoMap || undefined}
    />
  )
}

/**
 * Комбинирует трансформации инстанса и примитива корректно для иерархии
 * (primitive как дочерний узел instance), чтобы при повороте инстанса
 * примитивы вращались вокруг центра инстанса.
 *
 * Правильная формула для позиции дочернего узла в three.js:
 * worldPos = instance.pos + R(instance) * ( S(instance) * primitive.pos )
 *
 * - Поворот: кватернионы комбинируются умножением: Qfinal = Qinst * Qprim
 * - Масштаб: покомпонентно: Sfinal = Sinst ⊙ Sprim
 */
const combineTransforms = (
  instanceTransform: { position?: number[], rotation?: number[], scale?: number[] },
  primitiveTransform: { position?: number[], rotation?: number[], scale?: number[] }
): { position: [number, number, number], rotation: [number, number, number], scale: [number, number, number] } => {
  // Инстанс
  const [ix, iy, iz] = instanceTransform.position || [0, 0, 0]
  const [irx, iry, irz] = instanceTransform.rotation || [0, 0, 0]
  const [isx, isy, isz] = instanceTransform.scale || [1, 1, 1]

  // Примитив
  const [px, py, pz] = primitiveTransform.position || [0, 0, 0]
  const [prx, pry, prz] = primitiveTransform.rotation || [0, 0, 0]
  const [psx, psy, psz] = primitiveTransform.scale || [1, 1, 1]

  // Кватернионы поворота
  const qInst = new THREE.Quaternion().setFromEuler(new THREE.Euler(irx, iry, irz, 'XYZ'))
  const qPrim = new THREE.Quaternion().setFromEuler(new THREE.Euler(prx, pry, prz, 'XYZ'))
  const qFinal = new THREE.Quaternion().copy(qInst).multiply(qPrim)

  // Позиция: сначала масштабируем локальный сдвиг примитива масштабом инстанса,
  // затем поворачиваем этим же поворотом инстанса, и только после — переносим
  // в позицию инстанса. Это даёт вращение примитивов вокруг центра инстанса.
  const vLocal = new THREE.Vector3(px, py, pz)
  vLocal.multiply(new THREE.Vector3(isx, isy, isz))
  vLocal.applyQuaternion(qInst)
  vLocal.add(new THREE.Vector3(ix, iy, iz))

  const finalPosition: [number, number, number] = [vLocal.x, vLocal.y, vLocal.z]

  // Итоговый поворот — композиция поворотов
  const eFinal = new THREE.Euler().setFromQuaternion(qFinal, 'XYZ')
  const finalRotation: [number, number, number] = [eFinal.x, eFinal.y, eFinal.z]

  // Итоговый масштаб — помножение компонент
  const finalScale: [number, number, number] = [
    isx * psx,
    isy * psy,
    isz * psz
  ]

  return { position: finalPosition, rotation: finalRotation, scale: finalScale }
}

interface InstancedObjectsProps {
  /** Список объектов сцены */
  objects: SceneObject[]
  /** Экземпляры объектов */
  instances: SceneObjectInstance[]
  /** Слои сцены */
  layers: SceneLayer[]
  /** Минимальное количество экземпляров для оптимизации */
  minimumInstancesForOptimization?: number
  /** Обработчик клика */
  onClick?: (event: any) => void
  /** Обработчик ховера */
  onHover?: (event: any) => void
}

export const InstancedObjects: React.FC<InstancedObjectsProps> = ({
  objects,
  instances,
  layers,
  minimumInstancesForOptimization = 3,
  onClick,
  onHover
}) => {
  // Набор скрытых биомов: инстансы, привязанные к ним (biomeUuid), не отображаются
  const biomes = useSceneStore(s => s.biomes)
  const hiddenBiomeUuids = useMemo(() => new Set((biomes || []).filter(b => b.visible === false).map(b => b.uuid)), [biomes])
  const instanceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    instances.forEach((inst) => {
      counts[inst.objectUuid] = (counts[inst.objectUuid] || 0) + 1
    })
    return counts
  }, [instances])

  // Helper function to check if instance is visible
  const isInstanceVisible = (instance: SceneObjectInstance, objectUuid: string) => {
    const sceneObject = objects.find(obj => obj.uuid === objectUuid)
    if (!sceneObject) return false

    // Check layer visibility
    const layerId = sceneObject.layerId || 'objects'
    const layer = layers.find(l => l.id === layerId)
    const isLayerVisible = layer ? layer.visible : true

    // Check object visibility
    const isObjectVisible = sceneObject.visible !== false

    // Check instance visibility
    const isInstanceVisibleFlag = instance.visible !== false

    // Biome visibility: скрытый биом скрывает все его инстансы
    const biomeVisible = !instance.biomeUuid || !hiddenBiomeUuids.has(instance.biomeUuid)
    return isLayerVisible && isObjectVisible && isInstanceVisibleFlag && biomeVisible
  }

  // Group object instances by object type for instancing
  const instanceGroups = useMemo(() => {
    const groups: { [objectUuid: string]: SceneObjectInstance[] } = {}

    instances.forEach(instance => {
      if (!groups[instance.objectUuid]) {
        groups[instance.objectUuid] = []
      }
      groups[instance.objectUuid].push(instance)
    })

    // Only include objects with enough instances for optimization
    const optimizedGroups: { [objectUuid: string]: SceneObjectInstance[] } = {}
    Object.entries(groups).forEach(([objectUuid, objInstances]) => {
      if (objInstances.length >= minimumInstancesForOptimization) {
        optimizedGroups[objectUuid] = objInstances
      }
    })

    return optimizedGroups
  }, [instances, minimumInstancesForOptimization])

  const renderInstancedGroup = (objectUuid: string, instancesGroup: SceneObjectInstance[]) => {
    const sceneObject = objects.find(obj => obj.uuid === objectUuid)
    if (!sceneObject || sceneObject.primitives.length === 0) return null

    // Filter visible instances
    const visibleInstances = instancesGroup.filter(instance => isInstanceVisible(instance, objectUuid))
    if (visibleInstances.length === 0) return null

    return (
      <CompositeInstancedGroup
        key={`instanced-${objectUuid}`}
        objectUuid={objectUuid}
        sceneObject={sceneObject}
        instances={visibleInstances}
        onClick={onClick}
        onHover={onHover}
      />
    )
  }

  if (Object.keys(instanceGroups).length === 0) return null

  return (
    <>
      {Object.entries(instanceGroups).map(([objectUuid, instancesGroup]) =>
        renderInstancedGroup(objectUuid, instancesGroup)
      )}
    </>
  )
}

// Component for handling composite instanced group with multiple primitives
interface CompositeInstancedGroupProps {
  objectUuid: string
  sceneObject: SceneObject
  instances: SceneObjectInstance[]
  onClick?: (event: any) => void
  onHover?: (event: any) => void
}

const CompositeInstancedGroup: React.FC<CompositeInstancedGroupProps> = ({
  objectUuid,
  sceneObject,
  instances,
  onClick,
  onHover
}) => {
  // Единая логика LOD и константы: общий хук
  const { nearInstances, farInstances, leafSampleRatioFar, leafScaleMulFar, trunkRadialSegmentsNear, trunkRadialSegmentsFar } = usePartitionInstancesByLod(instances, defaultTreeLodConfig);
  if (!ENABLE_CYLINDER_BRANCH_LOD) { void trunkRadialSegmentsNear; void trunkRadialSegmentsFar; }
  // Попытка объединить все цилиндры (ветви/ствол) в один InstancedMesh с шейдером сужения
  const cylinders: { primitive: any; index: number }[] = []
  const spheres: { primitive: any; index: number }[] = []
  const rest: { primitive: any; index: number }[] = []
  sceneObject.primitives.forEach((p, idx) => {
    if (p.type === 'trunk' || p.type === 'branch') cylinders.push({ primitive: p, index: idx })
    else if (p.type === 'leaf') spheres.push({ primitive: p, index: idx })
    else rest.push({ primitive: p, index: idx })
  })

  return (
    <group>
      {/* Ближние инстансы (полная модель) */}
      {ENABLE_CYLINDER_BRANCH_LOD && cylinders.length > 0 && nearInstances.length > 0 && (
        <InstancedBranches
          sceneObject={sceneObject}
          cylinders={cylinders}
          instances={nearInstances}
          materials={sceneObject.materials}
          radialSegments={trunkRadialSegmentsNear}
          onClick={onClick}
          onHover={onHover}
        />
      )}
      {/* Всегда рендерим стволы для LOD0, даже если ветвевой LOD выключен */}
      {!ENABLE_CYLINDER_BRANCH_LOD && nearInstances.length > 0 && cylinders.some(c => c.primitive.type === 'trunk') && (
        <InstancedBranches
          sceneObject={sceneObject}
          cylinders={cylinders.filter(c => c.primitive.type === 'trunk')}
          instances={nearInstances}
          materials={sceneObject.materials}
          radialSegments={trunkRadialSegmentsNear}
          onClick={onClick}
          onHover={onHover}
        />
      )}

      {spheres.length > 0 && nearInstances.length > 0 && !SCENE_CHUNKED_LEAVES_ENABLED && (
        <InstancedLeaves
          sceneObject={sceneObject}
          spheres={spheres}
          instances={nearInstances}
          materials={sceneObject.materials}
          onClick={onClick}
          onHover={onHover}
        />
      )}

      {/* Дальние инстансы (упрощенная модель) */}
      {ENABLE_CYLINDER_BRANCH_LOD && cylinders.length > 0 && farInstances.length > 0 && (
        <InstancedBranches
          sceneObject={sceneObject}
          cylinders={cylinders.filter(c => c.primitive.type === 'trunk')}
          instances={farInstances}
          materials={sceneObject.materials}
          radialSegments={trunkRadialSegmentsFar}
          onClick={onClick}
          onHover={onHover}
        />
      )}

      {spheres.length > 0 && farInstances.length > 0 && !SCENE_CHUNKED_LEAVES_ENABLED && (
        <InstancedLeaves
          sceneObject={sceneObject}
          spheres={spheres}
          instances={farInstances}
          materials={sceneObject.materials}
          sampleRatio={leafSampleRatioFar}
          scaleMul={leafScaleMulFar}
          onClick={onClick}
          onHover={onHover}
        />
      )}

      {/* Прочие примитивы (включая единый меш ствола):
          - для LOD0 — nearInstances;
          - для LOD2 — farInstances;
          - для LOD3 (билборд) — не рендерим. */}
      {nearInstances.length > 0 && rest.map(({ primitive, index }) => (
        <PrimitiveInstancedGroup
          key={`${objectUuid}-primitive-near-${index}`}
          objectUuid={objectUuid}
          sceneObject={sceneObject}
          primitive={primitive}
          primitiveIndex={index}
          instances={nearInstances}
          onClick={onClick}
          onHover={onHover}
          materials={sceneObject.materials}
        />
      ))}
      {farInstances.length > 0 && rest.map(({ primitive, index }) => (
        <PrimitiveInstancedGroup
          key={`${objectUuid}-primitive-far-${index}`}
          objectUuid={objectUuid}
          sceneObject={sceneObject}
          primitive={primitive}
          primitiveIndex={index}
          instances={farInstances}
          onClick={onClick}
          onHover={onHover}
          materials={sceneObject.materials}
        />
      ))}
    </group>
  )
}

// Component for handling a single primitive with instancing
interface PrimitiveInstancedGroupProps {
  objectUuid: string
  sceneObject: SceneObject
  primitive: any
  primitiveIndex: number
  instances: SceneObjectInstance[]
  onClick?: (event: any) => void
  onHover?: (event: any) => void
  materials?: any[]
}

const PrimitiveInstancedGroup: React.FC<PrimitiveInstancedGroupProps> = ({
  objectUuid,
  sceneObject,
  primitive,
  primitiveIndex,
  instances,
  onClick,
  onHover,
  materials
}) => {
  const ref = useRef<THREE.InstancedMesh>(null)
  // Локальные (контекстные) переопределения трансформаций для realtime-отклика gizmo
  const { overrides } = useInstancedTransformOverrides()

  const handleInstanceClick = useCallback((event: any) => {
    if (!onClick || !ref.current) return

    // Get the instanceId from the event
    const instanceId = event.instanceId
    if (instanceId !== undefined && instanceId < instances.length) {
      const instance = instances[instanceId]
      const syntheticEvent = {
        ...event,
        object: event.object,
        userData: {
          generated: true,
          objectUuid: objectUuid,
          objectInstanceUuid: instance.uuid,
          isInstanced: true,
          instanceId: instanceId,
          layerId: sceneObject.layerId || 'objects'
        }
      }
      onClick(syntheticEvent)
    }
  }, [onClick, objectUuid, instances, sceneObject])

  const handleInstanceHover = useCallback((event: any) => {
    if (!onHover || !ref.current) return

    const instanceId = event.instanceId
    if (instanceId !== undefined && instanceId < instances.length) {
      const instance = instances[instanceId]
      const syntheticEvent = {
        ...event,
        object: event.object,
        userData: {
          generated: true,
          objectUuid: objectUuid,
          objectInstanceUuid: instance.uuid,
          isInstanced: true,
          instanceId: instanceId,
          layerId: sceneObject.layerId || 'objects'
        }
      }
      onHover(syntheticEvent)
    }
  }, [onHover, objectUuid, instances, sceneObject])

  // Специальный материал для единого меша ствола у процедурных деревьев.
  // Условие расширено: считаем это стволом, если примитив типа 'mesh' И у объекта есть treeData.params
  // (даже если objectType !== 'tree', например, после развёртки дерева в примитивы с сохранением treeData).
  const isTreeUnifiedTrunk = primitive.type === 'mesh' && !!(sceneObject as any)?.treeData?.params
  // Специальный случай: меш травы у процедурной травы. Если включена сценовая сегментация — пропускаем.
  const isGrassUnifiedMesh = primitive.type === 'mesh' && ((sceneObject as any)?.objectType === 'grass')
  // Если включена сценовая сегментация стволов — не рендерим их здесь, за это отвечает ChunkedInstancedTrunks
  if ((SCENE_CHUNKED_TRUNKS_ENABLED && isTreeUnifiedTrunk) || (SCENE_CHUNKED_GRASS_ENABLED && isGrassUnifiedMesh)) {
    return null
  }
  // Ленивая инициализация реестра текстур коры
  if (isTreeUnifiedTrunk && woodTextureRegistry.size === 0) {
    try { initializeWoodTextures() } catch { /* no-op */ }
  }
  const [barkColorMap, setBarkColorMap] = React.useState<THREE.Texture | null>(null)
  const [barkNormalMap, setBarkNormalMap] = React.useState<THREE.Texture | null>(null)
  const [barkRoughnessMap, setBarkRoughnessMap] = React.useState<THREE.Texture | null>(null)
  const [barkAoMap, setBarkAoMap] = React.useState<THREE.Texture | null>(null)
  // Ссылка на материал для явного обновления при смене карт
  const trunkMatRef = React.useRef<THREE.MeshStandardMaterial | null>(null)
  React.useEffect(() => {
    if (!isTreeUnifiedTrunk) return
    const params = (sceneObject as any)?.treeData?.params || {}
    const barkId: string | undefined = params.barkTextureSetId
    const ru: number = (params.barkUvRepeatU ?? 1)
    const rv: number = (params.barkUvRepeatV ?? 1)
    const set = (barkId && woodTextureRegistry.get(barkId)) || woodTextureRegistry.list()[0]
    if (!set) return
    const loader = new THREE.TextureLoader()
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(Math.max(0.05, ru || 1), Math.max(0.05, rv || 1))
      t.anisotropy = 4
      t.needsUpdate = true
    }
    loader.load(set.colorMapUrl, (t) => { onTex(t); (t as any).colorSpace = (THREE as any).SRGBColorSpace || (t as any).colorSpace; setBarkColorMap(t) })
    if (set.normalMapUrl) loader.load(set.normalMapUrl, (t) => { onTex(t); setBarkNormalMap(t) })
    else setBarkNormalMap(null)
    if (set.roughnessMapUrl) loader.load(set.roughnessMapUrl, (t) => { onTex(t); setBarkRoughnessMap(t) })
    else setBarkRoughnessMap(null)
    if (set.aoMapUrl) loader.load(set.aoMapUrl, (t) => { onTex(t); setBarkAoMap(t) })
    else setBarkAoMap(null)
  }, [isTreeUnifiedTrunk, sceneObject])
  // Явно помечаем материал на обновление при смене карт
  React.useEffect(() => {
    if (!isTreeUnifiedTrunk) return
    if (trunkMatRef.current) {
      trunkMatRef.current.needsUpdate = true
    }
  }, [isTreeUnifiedTrunk, barkColorMap, barkNormalMap, barkRoughnessMap, barkAoMap])

  return (
    <Instances
      limit={2000} // Maximum instances
      range={instances.length}
      ref={ref}
      // ВАЖНО: по умолчанию Three.js отключает тени для мешей (castShadow=false).
      // Для InstancedMesh это также справедливо, поэтому явно включаем отбрасывание теней,
      // чтобы инстансы объектов корректно отбрасывали тени на ландшафтные слои (receiveShadow у террейна уже включён).
      castShadow
      receiveShadow
      onClick={handleInstanceClick}
      onPointerOver={handleInstanceHover}
    >
      <PrimitiveGeometry primitive={primitive} />
      {isTreeUnifiedTrunk ? (
        <meshStandardMaterial
          key={`tree-unified-trunk-${primitive.uuid}-${barkColorMap ? 'tex' : 'notex'}`}
          ref={trunkMatRef as any}
          // ВАЖНО: сначала базовые свойства, затем назначение карт, чтобы карты не были перезатёрты
          {...materialToThreePropsWithPalette(
            resolveMaterial({
              directMaterial: primitive.material,
              objectMaterialUuid: primitive.objectMaterialUuid,
              globalMaterialUuid: primitive.globalMaterialUuid,
              objectMaterials: materials || sceneObject.materials,
            }),
            paletteRegistry.get((useSceneStore.getState().environmentContent?.paletteUuid || 'default')) as any
          )}
          map={barkColorMap || undefined}
          normalMap={barkNormalMap || undefined}
          roughnessMap={barkRoughnessMap || undefined}
          aoMap={barkAoMap || undefined}
        />
      ) : (
        <PrimitiveMaterial primitive={primitive} materials={materials || sceneObject.materials} sceneObject={sceneObject} />
      )}

      {instances.map((instance, index) => {
        // Combine instance and primitive transforms
        const sourceTransform = overrides[instance.uuid] || (instance.transform || {})
        const finalTransform = combineTransforms(
          sourceTransform,
          primitive.transform || {}
        )

        return (
          <Instance
            key={`instance-${objectUuid}-${primitiveIndex}-${index}`}
            position={finalTransform.position}
            rotation={finalTransform.rotation}
            scale={finalTransform.scale}
            visible={true}
            userData={{
              generated: true,
              objectUuid: objectUuid,
              objectInstanceUuid: instance.uuid,
              isInstanced: true,
              instanceId: index,
              layerId: sceneObject.layerId || 'objects'
            }}
          />
        )
      })}
    </Instances>
  )
}

// Hook to check if an object should use instancing
export const useInstanceOptimization = (
  objectUuid: string,
  instanceCounts: Record<string, number>,
  minimumInstances = 3
): boolean => {
  return (instanceCounts[objectUuid] || 0) >= minimumInstances
}

// Component for conditionally rendering instances vs individual objects
interface ConditionalInstancedObjectProps {
  objectUuid: string
  instance: SceneObjectInstance
  instanceIndex: number
  minimumInstancesForOptimization?: number
  objects: SceneObject[]
  layers: SceneLayer[]
  instanceCounts: Record<string, number>
  children: React.ReactNode
}

export const ConditionalInstancedObject: React.FC<ConditionalInstancedObjectProps> = ({
  objectUuid,
  instance,
  instanceIndex,
  minimumInstancesForOptimization = 3,
  children,
  objects,
  layers,
  instanceCounts
}) => {
  const shouldUseInstancing = useInstanceOptimization(
    objectUuid,
    instanceCounts,
    minimumInstancesForOptimization
  )

  // If this object should use instancing, don't render individual instance
  // It will be handled by InstancedObjects component
  if (shouldUseInstancing) {
    return null
  }

  // Check complete visibility (layer, object, instance)
  const sceneObject = objects.find(obj => obj.uuid === objectUuid)
  if (!sceneObject) return null

  const layerId = sceneObject.layerId || 'objects'
  const layer = layers.find(l => l.id === layerId)
  const isLayerVisible = layer ? layer.visible : true
  const isObjectVisible = sceneObject.visible !== false
  const isInstanceVisibleFlag = instance.visible !== false

  const isCompletelyVisible = isLayerVisible && isObjectVisible && isInstanceVisibleFlag

  if (!isCompletelyVisible) {
    return null
  }

  // Otherwise render as individual object
  return <>{children}</>
}

// TestInstancedMesh удалён

