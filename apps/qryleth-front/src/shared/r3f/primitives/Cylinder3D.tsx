import React, { useEffect, useRef, useState } from 'react'
import type {GfxPrimitive} from '@/entities/primitive';
import * as THREE from 'three'
import { useObjectStore } from '@/features/editor/object/model/objectStore'
import { woodTextureRegistry, initializeWoodTextures } from '@/shared/lib/textures'


/** Свойства компонента Cylinder3D */
interface Cylinder3DProps {
  /** Описание примитива цилиндра */
  primitive: GfxPrimitive
  /** Параметры материала */
  materialProps: any
  /** Дополнительные свойства меша */
  meshProps: any
}

/**
 * Компонент отрисовки цилиндра.
 * Использует параметры из `primitive.geometry` согласно новой структуре типов.
 */
export const Cylinder3D: React.FC<Cylinder3DProps> = ({ primitive, materialProps, meshProps }) => {
  // Ленивая инициализация реестра текстур коры
  if (woodTextureRegistry.size === 0) {
    try { initializeWoodTextures() } catch { /* no-op */ }
  }
  if (primitive.type !== 'cylinder' && primitive.type !== 'trunk' && primitive.type !== 'branch') {
    throw new Error('Cylinder3D expects cylinder/trunk/branch primitive')
  }

  const { radiusTop, radiusBottom, height, radialSegments } = (primitive as any).geometry

  // Для процедурного дерева — подключаем карты коры из выбранного набора woodTextureRegistry
  const barkSetId: string | undefined = useObjectStore(s => s.treeData?.params?.barkTextureSetId)
  const barkRepeatU: number = useObjectStore(s => (s.treeData?.params?.barkUvRepeatU ?? 1))
  const barkRepeatV: number = useObjectStore(s => (s.treeData?.params?.barkUvRepeatV ?? 1))
  const [colorMap, setColorMap] = useState<THREE.Texture | null>(null)
  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null)
  const [roughnessMap, setRoughnessMap] = useState<THREE.Texture | null>(null)
  const [aoMap, setAoMap] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    const set = (barkSetId && woodTextureRegistry.get(barkSetId)) || woodTextureRegistry.list()[0]
    if (!set) return
    const loader = new THREE.TextureLoader()
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(Math.max(0.05, barkRepeatU || 1), Math.max(0.05, barkRepeatV || 1))
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
  }, [barkSetId, barkRepeatU, barkRepeatV])

  // Для веток/сегментов с заданным воротником добавляем плавное увеличение радиуса у базы
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const onMatRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    // Включаем если есть параметры воротника в геометрии, иначе — только для ветвей с дефолтами
    const g: any = (primitive as any).geometry
    const enableByGeom = g.collarFrac != null && g.collarFrac > 0
    const collarFrac = enableByGeom ? g.collarFrac : (primitive.type === 'branch' ? 0.15 : 0.0)
    const collarScale = enableByGeom ? g.collarScale ?? 1.2 : (primitive.type === 'branch' ? 1.2 : 1.0)
    if (!enableByGeom && primitive.type !== 'branch') return
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uHeight = { value: height }
      shader.uniforms.uEnableCollar = { value: 1.0 }
      shader.uniforms.uCollarFrac = { value: collarFrac } // доля высоты для воротника
      shader.uniforms.uCollarScale = { value: collarScale } // увеличение радиуса у базы
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>\nuniform float uHeight;\nuniform float uEnableCollar;\nuniform float uCollarFrac;\nuniform float uCollarScale;`
        )
        .replace(
          '#include <begin_vertex>',
          `\n// Модификация цилиндра: «воротник» у основания ветви\nvec3 pos = position;\n#ifdef USE_INSTANCING\n// у инстансов шейдер другой — этот путь не используется\n#endif\n// t из [0..1] вдоль оси Y исходной геометрии\nfloat t = clamp((pos.y + 0.5 * uHeight) / max(1e-4, uHeight), 0.0, 1.0);\nfloat s = 1.0;\nif (uEnableCollar > 0.5 && uCollarFrac > 0.0) {\n  if (t < uCollarFrac) {\n    float k = clamp(t / max(1e-4, uCollarFrac), 0.0, 1.0);\n    s = mix(uCollarScale, 1.0, k);\n  }\n}\npos.xz *= s;\nvec3 transformed = pos;`
        )
    }
    mat.needsUpdate = true
  }

  return (
    <mesh {...meshProps}>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, radialSegments ?? 16]} />
      <meshStandardMaterial
        ref={onMatRef}
        {...materialProps}
        map={colorMap || undefined}
        normalMap={normalMap || undefined}
        roughnessMap={roughnessMap || undefined}
        aoMap={aoMap || undefined}
      />
    </mesh>
  )
}
