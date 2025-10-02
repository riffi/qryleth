import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { GfxPrimitive } from '@/entities/primitive'
import { useObjectStore } from '@/features/editor/object/model/objectStore'
import { woodTextureRegistry, initializeWoodTextures, rockTextureRegistry, initializeRockTextures } from '@/shared/lib/textures'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'


interface Primitive3DProps {
  primitive: GfxPrimitive
}

export const Primitive3D: React.FC<Primitive3DProps> = ({ primitive }) => {
  const { type, size, material } = primitive

  // Create geometry based on primitive type
  const renderGeometry = () => {
    switch (type) {
      case 'box':
        return (
          <boxGeometry
            args={[
              size?.width || 1,
              size?.height || 1,
              size?.depth || 1
            ]}
          />
        )

      case 'sphere':
        return (
          <sphereGeometry
            args={[
              size?.radius || 0.5,
              32, 32
            ]}
          />
        )

      case 'cylinder':
        return (
          <cylinderGeometry
            args={[
              size?.radiusTop || 0.5,
              size?.radiusBottom || 0.5,
              size?.height || 1,
              32
            ]}
          />
        )

      case 'cone':
        return (
          <coneGeometry
            args={[
              size?.radius || 0.5,
              size?.height || 1,
              32
            ]}
          />
        )

      case 'pyramid':
        return (
          <coneGeometry
            args={[
              size?.baseSize || 0.5,
              size?.height || 1,
              4 // 4 sides for pyramid
            ]}
          />
        )

      case 'plane':
        return (
          <planeGeometry
            args={[
              size?.width || 1,
              size?.height || 1
            ]}
          />
        )

      default:
        return <boxGeometry args={[1, 1, 1]} />
    }
  }

  // Create material based on primitive material
  const renderMaterial = () => {
    return (
      <meshLambertMaterial
        color={material?.color || '#ffffff'}
        transparent={material?.opacity !== undefined}
        opacity={material?.opacity || 1}
        wireframe={material?.wireframe || false}
      />
    )
  }

  return (
    <mesh castShadow receiveShadow>
      {renderGeometry()}
      {renderMaterial()}
    </mesh>
  )
}

interface Mesh3DProps {
  /** Примитив типа 'mesh' с произвольной геометрией */
  primitive: Extract<GfxPrimitive, { type: 'mesh' }>
  /** Свойства материала three.js (уже разрешённого с палитрой) */
  materialProps?: any
  /** Свойства меша three.js (позиция/вращение/скейл/теневые флаги) */
  meshProps?: any
}

/**
 * Рендер произвольной BufferGeometry из массивов позиций/нормалей/индексов.
 * Предназначено для единого меша ствола без видимых стыков.
 */
export const Mesh3D: React.FC<Mesh3DProps> = ({ primitive, materialProps, meshProps }) => {
  // Ленивая инициализация реестра текстур коры
  if (woodTextureRegistry.size === 0) {
    try { initializeWoodTextures() } catch { /* no-op */ }
  }
  // Ленивая инициализация реестра текстур камня
  if (rockTextureRegistry.size === 0) {
    try { initializeRockTextures() } catch { /* no-op */ }
  }
  const geom = primitive.geometry as any
  // Выбор набора коры: приоритет SceneEditor → ObjectEditor → дефолт
  // 1) SceneEditor: читаем параметры дерева из sceneStore по UUID объекта в userData
  // Возвращаем примитивы (string/number), чтобы избежать пересоздания объектов и лишних апдейтов.
  const objectUuid: string | undefined = (meshProps?.userData && (meshProps.userData as any).objectUuid) || undefined
  const sceneBarkId: string | undefined = useSceneStore(s => {
    if (!objectUuid) return undefined
    const obj = s.objects.find(o => o.uuid === objectUuid)
    return (obj as any)?.treeData?.params?.barkTextureSetId as string | undefined
  })
  const sceneBarkRu: number | undefined = useSceneStore(s => {
    if (!objectUuid) return undefined
    const obj = s.objects.find(o => o.uuid === objectUuid)
    return (obj as any)?.treeData?.params?.barkUvRepeatU as number | undefined
  })
  const sceneBarkRv: number | undefined = useSceneStore(s => {
    if (!objectUuid) return undefined
    const obj = s.objects.find(o => o.uuid === objectUuid)
    return (obj as any)?.treeData?.params?.barkUvRepeatV as number | undefined
  })
  // 2) ObjectEditor: fallback к objectStore
  const oeBarkSetId: string | undefined = useObjectStore(s => s.treeData?.params?.barkTextureSetId)
  const oeBarkRepeatU: number = useObjectStore(s => (s.treeData?.params?.barkUvRepeatU ?? 1))
  const oeBarkRepeatV: number = useObjectStore(s => (s.treeData?.params?.barkUvRepeatV ?? 1))
  // Итоговые значения (кора)
  const barkSetId: string | undefined = sceneBarkId ?? oeBarkSetId
  const barkRepeatU: number = (sceneBarkRu ?? oeBarkRepeatU ?? 1)
  const barkRepeatV: number = (sceneBarkRv ?? oeBarkRepeatV ?? 1)

  // Параметры каменной текстуры
  const sceneRockId: string | undefined = useSceneStore(s => {
    if (!objectUuid) return undefined
    const obj = s.objects.find(o => o.uuid === objectUuid)
    return (obj as any)?.rockData?.params?.rockTextureSetId as string | undefined
  })
  const sceneRockRu: number | undefined = useSceneStore(s => {
    if (!objectUuid) return undefined
    const obj = s.objects.find(o => o.uuid === objectUuid)
    return (obj as any)?.rockData?.params?.rockUvRepeatU as number | undefined
  })
  const sceneRockRv: number | undefined = useSceneStore(s => {
    if (!objectUuid) return undefined
    const obj = s.objects.find(o => o.uuid === objectUuid)
    return (obj as any)?.rockData?.params?.rockUvRepeatV as number | undefined
  })
  const oeRockSetId: string | undefined = useObjectStore(s => (s as any).rockData?.params?.rockTextureSetId)
  const oeRockRepeatU: number = useObjectStore(s => ((s as any).rockData?.params?.rockUvRepeatU ?? 1))
  const oeRockRepeatV: number = useObjectStore(s => ((s as any).rockData?.params?.rockUvRepeatV ?? 1))
  const rockSetId: string | undefined = sceneRockId ?? oeRockSetId
  const rockRepeatU: number = (sceneRockRu ?? oeRockRepeatU ?? 1)
  const rockRepeatV: number = (sceneRockRv ?? oeRockRepeatV ?? 1)
  const sceneRockTriplanar: boolean | undefined = useSceneStore(s => {
    if (!objectUuid) return undefined
    const obj = s.objects.find(o => o.uuid === objectUuid)
    return (obj as any)?.rockData?.params?.rockTriplanar as boolean | undefined
  })
  const sceneRockTexScale: number | undefined = useSceneStore(s => {
    if (!objectUuid) return undefined
    const obj = s.objects.find(o => o.uuid === objectUuid)
    return (obj as any)?.rockData?.params?.rockTexScale as number | undefined
  })
  const oeRockTriplanar: boolean = useObjectStore(s => ((s as any).rockData?.params?.rockTriplanar ?? false))
  const oeRockTexScale: number = useObjectStore(s => ((s as any).rockData?.params?.rockTexScale ?? 3))
  const rockTriplanar = (sceneRockTriplanar ?? oeRockTriplanar) || false
  const rockTexScale = (sceneRockTexScale ?? oeRockTexScale ?? 3)
  // Карты PBR для коры
  const [colorMap, setColorMap] = useState<THREE.Texture | null>(null)
  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null)
  const [roughnessMap, setRoughnessMap] = useState<THREE.Texture | null>(null)
  const [aoMap, setAoMap] = useState<THREE.Texture | null>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)

  /**
   * Загружает карты камня (приоритет) или коры в зависимости от доступности параметров набора.
   * Fallback’ов на «первую запись» нет, чтобы не красить другие меши.
   */
  useEffect(() => {
    const loader = new THREE.TextureLoader()

    // Высший приоритет — каменные карты, если указан набор
    if (rockSetId) {
      const rset = rockTextureRegistry.get(rockSetId)
      if (!rset) return
      const onTex = (t: THREE.Texture | null) => {
        if (!t) return
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.repeat.set(Math.max(0.05, rockRepeatU || 1), Math.max(0.05, rockRepeatV || 1))
        t.anisotropy = 4
        t.needsUpdate = true
      }
      loader.load(rset.colorMapUrl, (t) => { onTex(t); (t as any).colorSpace = (THREE as any).SRGBColorSpace || (t as any).colorSpace; setColorMap(t) })
      if (rset.normalMapUrl) loader.load(rset.normalMapUrl, (t) => { onTex(t); setNormalMap(t) })
      else setNormalMap(null)
      if (rset.roughnessMapUrl) loader.load(rset.roughnessMapUrl, (t) => { onTex(t); setRoughnessMap(t) })
      else setRoughnessMap(null)
      if (rset.aoMapUrl) loader.load(rset.aoMapUrl, (t) => { onTex(t); setAoMap(t) })
      else setAoMap(null)
      // Трипланарное наложение: переназначаем сэмплинг map/normalMap в onBeforeCompile
      if (materialRef.current && rockTriplanar) {
        const m = materialRef.current
        m.onBeforeCompile = (shader: any) => {
          shader.uniforms.uTexScale = { value: rockTexScale }

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

          const funcs = `\nuniform float uTexScale;\n${varyingDeclF}
vec3 blendWeights(vec3 n){ vec3 an = abs(n); an = pow(an, vec3(4.0)); float s = an.x+an.y+an.z+1e-5; return an/s; }
vec2 uvProj(vec3 p, int axis){ if(axis==0) return p.zy; if(axis==1) return p.xz; return p.xy; }
vec4 triColor(sampler2D tex, vec3 pos, vec3 n){ vec3 w = blendWeights(n); vec4 cx = ${texFn}(tex, uvProj(pos*uTexScale,0)); vec4 cy = ${texFn}(tex, uvProj(pos*uTexScale,1)); vec4 cz = ${texFn}(tex, uvProj(pos*uTexScale,2)); return cx*w.x + cy*w.y + cz*w.z; }
float triScalar(sampler2D tex, vec3 pos, vec3 n){ return triColor(tex, pos, n).r; }
vec3 triNormalWS(sampler2D tex, vec3 pos, vec3 n){ vec3 w = blendWeights(n); vec3 nTx = ${texFn}(tex, uvProj(pos*uTexScale,0)).xyz*2.0-1.0; vec3 Tx=vec3(0.0,0.0,1.0), Bx=vec3(0.0,1.0,0.0), Nx=vec3(1.0,0.0,0.0); vec3 wx = normalize(Tx*nTx.x + Bx*nTx.y + Nx*nTx.z); vec3 nTy = ${texFn}(tex, uvProj(pos*uTexScale,1)).xyz*2.0-1.0; vec3 Ty=vec3(1.0,0.0,0.0), By=vec3(0.0,0.0,1.0), Ny=vec3(0.0,1.0,0.0); vec3 wy = normalize(Ty*nTy.x + By*nTy.y + Ny*nTy.z); vec3 nTz = ${texFn}(tex, uvProj(pos*uTexScale,2)).xyz*2.0-1.0; vec3 Tz=vec3(1.0,0.0,0.0), Bz=vec3(0.0,1.0,0.0), Nz=vec3(0.0,0.0,1.0); vec3 wz = normalize(Tz*nTz.x + Bz*nTz.y + Nz*nTz.z); return normalize(wx*w.x + wy*w.y + wz*w.z); }`

          shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + funcs)
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <map_fragment>',
              `#ifdef USE_MAP\n  vec4 texelColor = triColor(map, vWorldPos, normalize(vWorldNormal));\n  texelColor.rgb = pow( max(texelColor.rgb, vec3(0.0)), vec3(2.2) );\n  diffuseColor *= texelColor;\n#endif`
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
      return
    }

    // Иначе — если явно выбран набор коры для дерева
    if (!barkSetId) return
    const set = woodTextureRegistry.get(barkSetId)
    if (!set) return
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(Math.max(0.05, barkRepeatU || 1), Math.max(0.05, barkRepeatV || 1))
      t.anisotropy = 4
      t.needsUpdate = true
    }
    // diffuse/color
    loader.load(set.colorMapUrl, (t) => { onTex(t); (t as any).colorSpace = (THREE as any).SRGBColorSpace || (t as any).colorSpace; setColorMap(t) })
    // optional maps
    if (set.normalMapUrl) loader.load(set.normalMapUrl, (t) => { onTex(t); setNormalMap(t) })
    else setNormalMap(null)
    if (set.roughnessMapUrl) loader.load(set.roughnessMapUrl, (t) => { onTex(t); setRoughnessMap(t) })
    else setRoughnessMap(null)
    if (set.aoMapUrl) loader.load(set.aoMapUrl, (t) => { onTex(t); setAoMap(t) })
    else setAoMap(null)
  }, [barkSetId, barkRepeatU, barkRepeatV, rockSetId, rockRepeatU, rockRepeatV, rockTriplanar, rockTexScale])

  // Форсируем обновление материала при смене карт
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.needsUpdate = true
    }
  }, [colorMap, normalMap, roughnessMap, aoMap])

  const bufferGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(geom.positions)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    if (geom.normals && geom.normals.length === geom.positions.length) {
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(geom.normals), 3))
    } else {
      g.computeVertexNormals()
    }
    if (geom.uvs) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geom.uvs), 2))
    }
    if (geom.indices) g.setIndex(geom.indices)
    g.computeBoundingSphere()
    g.computeBoundingBox()
    return g
  }, [geom.positions, geom.normals, geom.indices, geom.uvs])

  return (
    <mesh {...(meshProps || {})} castShadow receiveShadow={false}>
      <primitive object={bufferGeometry} attach="geometry" />
      <meshStandardMaterial
        ref={m => { materialRef.current = m }}
        {...(materialProps || {})}
        map={colorMap || undefined}
        normalMap={normalMap || undefined}
        roughnessMap={roughnessMap || undefined}
        aoMap={aoMap || undefined}
      />
    </mesh>
  )
}
