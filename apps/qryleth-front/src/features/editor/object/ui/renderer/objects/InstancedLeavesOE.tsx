import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useLeafTextures } from '@/shared/r3f/leaves/useLeafTextures'
import { makeLeafPlaneGeometry } from '@/shared/r3f/leaves/makeLeafGeometry'
import { patchLeafMaterial } from '@/shared/r3f/leaves/patchLeafMaterial'
import { useObjectStore } from '../../../model/objectStore'
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxMaterial } from '@/entities/material'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import { paletteRegistry } from '@/shared/lib/palette'
import { usePalettePreviewUuid } from '../../../model/palettePreviewStore'
import { useObjectDebugFlags } from '../../../model/debugFlagsStore'

interface InstancedLeavesOEProps {
  leaves: { primitive: GfxPrimitive; index: number }[]
  objectMaterials?: GfxMaterial[]
  onPrimitiveClick?: (event: any) => void
  onPrimitiveHover?: (event: any) => void
}

/**
 * ObjectEditor‑версия инстансированного рендера листьев (плоские биллборды).
 */
export const InstancedLeavesOE: React.FC<InstancedLeavesOEProps> = ({ leaves, objectMaterials, onPrimitiveClick, onPrimitiveHover }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const paletteUuid = usePalettePreviewUuid()
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  const sample = leaves[0]?.primitive
  // Идентификатор сета берём из параметров процедурного объекта в ObjectEditor
  const texSetId: string | undefined = useObjectStore(s => s.treeData?.params?.leafTextureSetId)
  // Фактор покраски текстуры листьев (0..1)
  const leafPaintFactor: number = useObjectStore(s => s.treeData?.params?.leafTexturePaintFactor ?? 0)
  // Разброс применения фактора по листьям (0..1)
  const leafPaintJitter: number = useObjectStore(s => s.treeData?.params?.leafTexturePaintJitter ?? 0)
  const leafRectDebug = useObjectDebugFlags(s => s.leafRectDebug)
  // Интенсивность ambient‑света ObjectEditor для масштабирования подсветки на просвет
  const ambientIntensity = useObjectStore(s => s.lighting?.ambient?.intensity ?? 1.0)
  // Текущее имя спрайта для материал‑ключа (форсируем ремонт при смене)
  // Имя спрайта: предпочитаем выбор из параметров генератора, иначе — из геометрии примитива
  const spriteNameFromParams = useObjectStore(s => s.treeData?.params?.leafTextureSpriteName) as string | undefined
  const spriteNameKey = (spriteNameFromParams || (sample as any)?.geometry?.texSpriteName || 'default')
  const shape = 'texture'
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const ezCompat = useObjectStore(s => (s.treeData as any)?.params?.ezTreeCompat ?? false) as boolean
  const ezWindStrengthArr = (useObjectStore(s => (s.treeData as any)?.params?.ezWindStrength) as number[] | undefined) || [0.5, 0, 0.5]
  const ezWindFrequency = useObjectStore(s => (s.treeData as any)?.params?.ezWindFrequency ?? 0.5) as number
  const ezWindScale = useObjectStore(s => (s.treeData as any)?.params?.ezWindScale ?? 70) as number
  const leafAlphaTestParam = useObjectStore(s => (s.treeData as any)?.params?.leafAlphaTest ?? 0.5) as number
  // Общий хук: загрузка карт/atlas + crop и anchor/texAspect + uTexCenter
  const { diffuseMap, alphaMap, normalMap, roughnessMap, texAspect, anchorUV } = useLeafTextures(
    texSetId,
    true,
    spriteNameFromParams || (sample as any)?.geometry?.texSpriteName,
    () => (materialRef.current as any)?.userData?.uniforms,
  )
  // Поддерживаем пересборку материала Phong при асинхронной загрузке карт
  useSyncPhongAfterLoad(diffuseMap || undefined, alphaMap || undefined, normalMap || undefined, leafAlphaTestParam)

  // useLeafTextures берёт на себя загрузку карт/atlas и расчёт anchor/texAspect/uTexCenter
  const resolvedMaterial = useMemo(() => resolveMaterial({
    directMaterial: sample?.material,
    objectMaterialUuid: sample?.objectMaterialUuid,
    globalMaterialUuid: sample?.globalMaterialUuid,
    objectMaterials
  }), [sample, objectMaterials])
  const materialProps = useMemo(() => materialToThreePropsWithPalette(resolvedMaterial, activePalette as any), [resolvedMaterial, activePalette])
  console.log('materialProps',materialProps)
  /**
   * Вычисляет целевой цвет листвы в линейном пространстве для HSV‑покраски текстуры.
   *
   * Важно: при выборе роли из палитры (ColorSource.type = 'role') итоговый цвет должен
   * браться из резолвнутых свойств материала с учётом активной палитры (materialProps.color),
   * а не напрямую из material.properties.color. Иначе цвет палитры не применяется к листьям,
   * так как у материала всегда есть базовый hex в properties.color, который «перебивает» палитру.
   */
  const targetLeafColorLinear = useMemo(() => {
    // Сначала используем цвет, уже вычисленный с учётом палитры (materialProps.color),
    // затем — сырой цвет из материала как запасной вариант.
    const hex = (materialProps as any)?.color || (resolvedMaterial?.properties as any)?.color || '#2E8B57'
    const c = new THREE.Color(hex)
    ;(c as any).convertSRGBToLinear?.()
    return c
  }, [resolvedMaterial, materialProps])

  const count = leaves.length

  /**
   * Преобразует произвольную строку в детерминированное число в диапазоне [0..1].
   * Нужен для стабильного рандома на лист: используем FNV‑подобный хеш.
   */
  const hashToUnit = (s: string): number => {
    let h = 2166136261 >>> 0
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
    return (h >>> 0) / 4294967295
  }

  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    for (let k = 0; k < leaves.length; k++) {
      const prim = leaves[k].primitive
      const t = prim.transform || {}
      const [px, py, pz] = t.position || [0,0,0]
      const [prx, pry, prz] = t.rotation || [0,0,0]
      const [psx, psy, psz] = t.scale || [1,1,1]
      // Радиус листа → масштаб.
      const r = prim.type === 'leaf' ? (prim as any).geometry.radius : 0.5
      const uniformScale = r * Math.cbrt(Math.abs(psx * psy * psz))
      // Для режима 'texture' поддерживаем неравномерный масштаб по X с учетом aspect карты
      const ez = ezCompat
      const sx = ez ? uniformScale : (uniformScale * (texAspect || 1))
      const sy = uniformScale
      const sz = uniformScale
      dummy.position.set(px, py, pz)
      dummy.rotation.set(prx, pry, prz)
      // Привязываем геометрию к точке основания спрайта: смещение в локальных координатах плоскости
      {
        const u = anchorUV?.[0] ?? 0.5
        const v = anchorUV?.[1] ?? 1.0
        // Переносим локальные координаты anchor в центр плоскости (точку крепления):
        // локально anchor = ((u-0.5)*sx, (0.5 - v)*sy); смещение = -anchor → ((0.5-u)*sx, (v-0.5)*sy)
        const dx = (0.5 - u) * sx
        const dy = (v - 0.5) * sy
        const off = new THREE.Vector3(dx, dy, 0)
        off.applyEuler(new THREE.Euler(prx, pry, prz, 'XYZ'))
        dummy.position.add(off)
      }
      dummy.scale.set(sx, sy, sz)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(k, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [leaves, texAspect, anchorUV])

  /**
   * Инстансовый атрибут aLeafPaintMul: множитель применения глобального фактора для каждого листа.
   * Формула: mul = 1 - jitter * rnd, где rnd детерминированно зависит от uuid листа.
   */
  useEffect(() => {
    const shape = (sample as any)?.geometry?.shape || 'billboard'
    if (shape !== 'texture') return
    if (!meshRef.current) return
    const g = meshRef.current.geometry as THREE.BufferGeometry
    const arr = new Float32Array(count)
    for (let k = 0; k < count; k++) {
      const prim: any = leaves[k]?.primitive
      const uuid = prim?.uuid || `${prim?.name || 'leaf'}_${k}`
      const rnd = hashToUnit(String(uuid))
      const mul = 1 - Math.max(0, Math.min(1, leafPaintJitter)) * rnd
      arr[k] = mul
    }
    g.setAttribute('aLeafPaintMul', new THREE.InstancedBufferAttribute(arr, 1))
  }, [sample, count, leaves, leafPaintJitter])

  const handleClick = (event: any) => {
    if (!onPrimitiveClick) return
    const instanceId: number = event.instanceId
    const primitiveIndex = leaves[instanceId]?.index
    if (primitiveIndex == null) return
    onPrimitiveClick({ ...event, userData: { generated: true, primitiveIndex } })
  }
  const handleHover = (event: any) => {
    if (!onPrimitiveHover) return
    const instanceId: number = event.instanceId
    const primitiveIndex = leaves[instanceId]?.index
    if (primitiveIndex == null) return
    onPrimitiveHover({ ...event, userData: { generated: true, primitiveIndex } })
  }

  // Геометрия: общий помощник для плоскости/«креста»
  const geometry = useMemo(() => {
    return makeLeafPlaneGeometry()
  }, [])

  // Тот же материал с onBeforeCompile: маска/изгиб/подсветка
  // materialRef объявлен выше
  // Унифицированная настройка материала через общий патчер шейдеров листвы
  const onMaterialRefPatched = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    patchLeafMaterial(mat, {
      shape: 'texture',
      texAspect: texAspect || 1,
      rectDebug: !!leafRectDebug,
      edgeDebug: false,
      leafPaintFactor,
      targetLeafColorLinear: targetLeafColorLinear,
      // Делаем «просвет» мягким и зависящим от ambient‑интенсивности превью‑сцены
      backlightStrength: 0//Math.max(0, Math.min(1, ambientIntensity)) * 0.2,
    })
  }
  // legacy onBeforeCompile удалён

  // Обновляем флаг uRectDebug при переключении тумблера в UI без пересоздания материала
  useEffect(() => {
    const shape = 'texture'
    const uniforms = (materialRef.current as any)?.userData?.uniforms
    if (uniforms && uniforms.uRectDebug) {
      uniforms.uRectDebug.value = leafRectDebug ? 1.0 : 0.0
    }
  }, [leafRectDebug, sample])

  // Обновляем униформы покраски при изменении фактора/цвета
  useEffect(() => {
    const shape = 'texture'
    const uniforms = (materialRef.current as any)?.userData?.uniforms
    if (!uniforms) return
    if (uniforms.uLeafPaintFactor) uniforms.uLeafPaintFactor.value = leafPaintFactor
    if (uniforms.uLeafTargetColor) uniforms.uLeafTargetColor.value.set(targetLeafColorLinear.r, targetLeafColorLinear.g, targetLeafColorLinear.b)
  }, [leafPaintFactor, targetLeafColorLinear, sample])

  // Поддержка обновления времени для совместимого шейдера ez-tree
  const ezUniformsRef = useRef<any>(null)
  useFrame(({ clock }) => {
    const u = ezUniformsRef.current
    if (u && u.uTime) { u.uTime.value = clock.getElapsedTime() }
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry as any, undefined as any, count]}
      castShadow
      receiveShadow={false}
      onClick={handleClick}
      onPointerOver={handleHover}
    >
      {/*
        Материал листьев. Для режима 'texture' подставляем карты из публичной папки:
        - map: цвет
        - alphaMap: маска прозрачности (контур листа)
        - normalMap: микрорельеф
        - roughnessMap: шероховатость поверхности
      */}
      {ezCompat ? (
        <meshPhongMaterial
          key={`leafMat-ez-${spriteNameKey}-${(diffuseMap as any)?.uuid || 'none'}`}
          ref={(m: any) => {
            if (!m) return
            ;(InstancedLeavesOE as any)._phongRef = m
            m.onBeforeCompile = (shader: any) => {
              shader.uniforms.uTime = { value: 0 }
              shader.uniforms.uWindStrength = { value: new THREE.Vector3(ezWindStrengthArr[0], ezWindStrengthArr[1], ezWindStrengthArr[2]) }
              shader.uniforms.uWindFrequency = { value: ezWindFrequency }
              shader.uniforms.uWindScale = { value: ezWindScale }
              // prepend uniforms
              shader.vertexShader = `
                uniform float uTime;
                uniform vec3 uWindStrength;
                uniform float uWindFrequency;
                uniform float uWindScale;
                
              ` + shader.vertexShader
              // add simplex3
              shader.vertexShader = shader.vertexShader.replace(
                `void main() {`,
                `
                vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
                vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
                float simplex3(vec3 v) {
                  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
                  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
                  vec3 i  = floor(v + dot(v, C.yyy) );
                  vec3 x0 = v - i + dot(i, C.xxx);
                  vec3 g = step(x0.yzx, x0.xyz);
                  vec3 l = 1.0 - g;
                  vec3 i1 = min( g.xyz, l.zxy );
                  vec3 i2 = max( g.xyz, l.zxy );
                  vec3 x1 = x0 - i1 + C.xxx;
                  vec3 x2 = x0 - i2 + C.yyy;
                  vec3 x3 = x0 - D.yyy;
                  i = mod289(i);
                  vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
                  float n_ = 0.142857142857; 
                  vec3  ns = n_ * D.wyz - D.xzx;
                  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                  vec4 x_ = floor(j * ns.z);
                  vec4 y_ = floor(j - 7.0 * x_ );
                  vec4 x = x_ *ns.x + ns.yyyy;
                  vec4 y = y_ *ns.x + ns.yyyy;
                  vec4 h = 1.0 - abs(x) - abs(y);
                  vec4 b0 = vec4( x.xy, y.xy );
                  vec4 b1 = vec4( x.zw, y.zw );
                  vec4 s0 = floor(b0)*2.0 + 1.0;
                  vec4 s1 = floor(b1)*2.0 + 1.0;
                  vec4 sh = -step(h, vec4(0.0));
                  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
                  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
                  vec3 g0 = vec3(a0.xy,h.x);
                  vec3 g1 = vec3(a0.zw,h.y);
                  vec3 g2 = vec3(a1.xy,h.z);
                  vec3 g3 = vec3(a1.zw,h.w);
                  vec4 norm = taylorInvSqrt(vec4(dot(g0,g0), dot(g1,g1), dot(g2,g2), dot(g3,g3)));
                  g0 *= norm.x; g1 *= norm.y; g2 *= norm.z; g3 *= norm.w;
                  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                  m = m * m;
                  return 42.0 * dot( m*m, vec4( dot(g0,x0), dot(g1,x1), dot(g2,x2), dot(g3,x3) ) );
                }
                void main() {`
              )
              // Replace project vertex exactly as in ez-tree (but preserve instancing path)
              shader.vertexShader = shader.vertexShader.replace(
                `#include <project_vertex>`,
                `
                vec4 mvPosition = vec4( transformed, 1.0 );
                #ifdef USE_INSTANCING
                  mvPosition = instanceMatrix * mvPosition;
                #endif
                float windOffset = 6.2831853 * simplex3(mvPosition.xyz / uWindScale);
                vec3 windSway = uv.y * uWindStrength * (
                  0.5 * sin(uTime * uWindFrequency + windOffset) +
                  0.3 * sin(2.0 * uTime * uWindFrequency + 1.3 * windOffset) +
                  0.2 * sin(5.0 * uTime * uWindFrequency + 1.5 * windOffset)
                );
                mvPosition.xyz += windSway;
                mvPosition = modelViewMatrix * mvPosition;
                gl_Position = projectionMatrix * mvPosition;
                `
              )
              ;(m as any).userData.ezUniforms = shader.uniforms
              ezUniformsRef.current = shader.uniforms
            }
          }}
          color={'#FFFFFF'}
          map={diffuseMap || undefined}
          alphaMap={alphaMap || undefined}
          normalMap={normalMap || undefined}
          alphaTest={leafAlphaTestParam}
          transparent={false}
          side={THREE.DoubleSide}
          dithering
        />
      ) : (
        <meshStandardMaterial
          key={`leafMat-${spriteNameKey}-${(diffuseMap as any)?.uuid || 'none'}`}
          ref={onMaterialRefPatched}
          {...materialProps}
          envMapIntensity={1}
          color={'#FFFFFF'}
          map={diffuseMap || undefined}
          alphaMap={alphaMap || undefined}
          normalMap={normalMap || undefined}
          roughnessMap={roughnessMap || undefined}
          // Как в ez-tree: только alphaTest, без прозрачности
          transparent={false}
          alphaTest={leafAlphaTestParam}
          // alpha-to-coverage не используем — это может давать «ореолы» на некоторых MSAA
        />
      )}
    </instancedMesh>
  )
}

// Эффект синхронизации для ez-tree (Phong): после загрузки карт обновляем материал и пересобираем шейдер
// чтобы определить USE_MAP/USE_NORMALMAP и убрать «белые квадраты» при ленивой загрузке
function useSyncPhongAfterLoad(diffuse?: THREE.Texture | null, alpha?: THREE.Texture | null, normal?: THREE.Texture | null, alphaTest?: number) {
  useEffect(() => {
    const m: THREE.MeshPhongMaterial | undefined = (InstancedLeavesOE as any)._phongRef
    if (!m) return
    let dirty = false
    if (diffuse && m.map !== diffuse) { m.map = diffuse; dirty = true }
    if (alpha !== undefined && m.alphaMap !== alpha) { m.alphaMap = alpha || undefined; dirty = true }
    if (normal !== undefined && m.normalMap !== normal) { m.normalMap = normal || undefined; dirty = true }
    if (typeof alphaTest === 'number' && m.alphaTest !== alphaTest) { m.alphaTest = alphaTest; dirty = true }
    if (dirty) m.needsUpdate = true
  }, [diffuse, alpha, normal, alphaTest])
}

export default InstancedLeavesOE
