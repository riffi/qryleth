import React, { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { leafTextureRegistry } from '@/shared/lib/textures'
import { useObjectStore } from '@/features/editor/object/model/objectStore'

interface LeafBillboard3DProps {
  primitive: any
  materialProps: any
  meshProps: any
}

/**
 * Отдельный рендер одного листа в режиме 'texture' для Scene Editor (без инстансинга).
 * Загружает карты из публичной папки, применяет кроп из atlas.json и смещает плоскость
 * так, чтобы anchor‑точка попала в pivot (точку крепления к ветке).
 */
export const LeafBillboard3D: React.FC<LeafBillboard3DProps> = ({ primitive, materialProps, meshProps }) => {
  const shape = (primitive?.geometry as any)?.shape || 'billboard'
  const spriteName: string | undefined = (primitive?.geometry as any)?.texSpriteName
  // Идентификатор набора текстур берём из параметров дерева текущего объекта (ObjectEditor)
  const texSetId: string | undefined = useObjectStore(s => s.treeData?.params?.leafTextureSetId)
  // Фактор покраски текстурированных листьев (0..1)
  const leafPaintFactor: number = useObjectStore(s => s.treeData?.params?.leafTexturePaintFactor ?? 0)

  // Текстуры и параметры
  const [diffuseMap, setDiffuseMap] = useState<THREE.Texture | null>(null)
  const [alphaMap, setAlphaMap] = useState<THREE.Texture | null>(null)
  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null)
  const [roughnessMap, setRoughnessMap] = useState<THREE.Texture | null>(null)
  const [texAspect, setTexAspect] = useState<number>(1)
  const [atlas, setAtlas] = useState<{ name: string; x: number; y: number; width: number; height: number; anchorX?: number; anchorY?: number; anchor?: { x: number; y: number } }[] | null>(null)
  const [anchorUV, setAnchorUV] = useState<[number, number] | null>(null)

  // Загрузка текстур
  // Метод подбирает активный набор из реестра (первый доступный), либо использует старый путь как резерв.
  useEffect(() => {
    if (shape !== 'texture') return
    const loader = new THREE.TextureLoader()
    const set = (texSetId && leafTextureRegistry.get(texSetId)) || leafTextureRegistry.list()[0]
    const colorUrl = set?.colorMapUrl
    const opacityUrl = set?.opacityMapUrl
    const normalUrl = set?.normalMapUrl
    const roughnessUrl = set?.roughnessMapUrl
    /**
     * Устанавливает параметры загруженной текстуры для корректной работы кропа и фильтрации.
     * Применяется ко всем картам набора.
     */
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      t.anisotropy = 4
      t.needsUpdate = true
    }
    if (colorUrl) {
      loader.load(colorUrl, (t2) => {
        onTex(t2)
        t2.center.set(0.0, 0.0)
        t2.rotation = 0
        setDiffuseMap(t2)
        const img2: any = t2.image
        if (img2 && img2.width && img2.height) setTexAspect(img2.width / img2.height)
      })
    } else {
      setDiffuseMap(null)
    }
    if (opacityUrl) loader.load(opacityUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setAlphaMap(t) })
    else setAlphaMap(null)
    if (normalUrl) loader.load(normalUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setNormalMap(t) })
    else setNormalMap(null)
    if (roughnessUrl) loader.load(roughnessUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setRoughnessMap(t) })
    else setRoughnessMap(null)
  }, [shape, texSetId])

  // Загрузка атласа
  // Использует atlasUrl из активного набора реестра; при отсутствии — резервный путь.
  useEffect(() => {
    if (shape !== 'texture') return
    const set = (texSetId && leafTextureRegistry.get(texSetId)) || leafTextureRegistry.list()[0]
    const atlasUrl = set?.atlasUrl
    if (atlasUrl) {
      fetch(atlasUrl)
        .then(r => r.json())
        .then(setAtlas)
        .catch(() => setAtlas(null))
    } else {
      setAtlas(null)
    }
  }, [shape, texSetId])

  // Применяем вырезку и anchor
  useEffect(() => {
    if (shape !== 'texture') return
    if (!diffuseMap) return
    const img: any = diffuseMap.image
    if (!img || !img.width || !img.height) return
    const W = img.width, H = img.height
    const items = atlas || []
    const rect: any = (items.find(i => i.name === spriteName) || items[0])
    if (!rect) return
    const repX = rect.width / W
    const repY = rect.height / H
    const offX = rect.x / W
    const offYFlipTrue = 1 - (rect.y + rect.height) / H
    const offYFlipFalse = rect.y / H
    const applyRect = (t: THREE.Texture | null) => {
      if (!t) return
      t.repeat.set(repX, repY)
      t.offset.set(offX, t.flipY ? offYFlipTrue : offYFlipFalse)
      t.center.set(0.0, 0.0)
      t.rotation = 0
      t.needsUpdate = true
    }
    applyRect(diffuseMap); applyRect(alphaMap); applyRect(normalMap); applyRect(roughnessMap)
    setTexAspect(rect.width / rect.height)
    // Anchor
    const ax = typeof rect.anchorX === 'number' ? rect.anchorX : (rect.anchor?.x)
    const ay = typeof rect.anchorY === 'number' ? rect.anchorY : (rect.anchor?.y)
    if (typeof ax === 'number' && typeof ay === 'number' && rect.width > 0 && rect.height > 0) {
      const uN = Math.min(1, Math.max(0, ax / rect.width))
      const vN = Math.min(1, Math.max(0, ay / rect.height))
      setAnchorUV([uN, vN])
    } else {
      setAnchorUV([0.5, 1.0])
    }
  }, [shape, atlas, diffuseMap, alphaMap, normalMap, roughnessMap, spriteName])

  const [groupPos, groupRot] = [meshProps.position || [0,0,0], meshProps.rotation || [0,0,0]]
  // Не позволяем scale из meshProps влиять на смещение anchor: вычищаем его из пропсов группы
  const { position: _p, rotation: _r, scale: _s, ...restMeshProps } = meshProps || {}
  const radius: number = (primitive?.geometry as any)?.radius || 0.5
  const [psx, psy, psz] = primitive?.transform?.scale || [1,1,1]
  // Масштаб листа: радиус с учётом локального scale примитива (как в OE: корень третьей степени объёма)
  const uniformScale = radius * Math.cbrt(Math.abs(psx * psy * psz))
  const sx = shape === 'texture' ? uniformScale * (texAspect || 1) : uniformScale
  const sy = uniformScale
  const sz = uniformScale

  // Смещение по anchor: перенос anchor_local в центр плоскости
  const offVec = useMemo(() => {
    if (shape !== 'texture') return new THREE.Vector3(0,0,0)
    const u = anchorUV?.[0] ?? 0.5
    const v = anchorUV?.[1] ?? 1.0
    const dx = (0.5 - u) * sx
    const dy = (v - 0.5) * sy
    // В локальных координатах плоскости; поворот применяется на родительской группе
    return new THREE.Vector3(dx, dy, 0)
  }, [shape, anchorUV, sx, sy])

  // Материал и HSV‑покраска (настраиваем через onBeforeCompile)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  /**
   * Настраивает материал листа перед компиляцией шейдера.
   * Добавляет униформы для HSV‑покраски (фактор и целевой цвет) и вставляет
   * в фрагментный шейдер функции RGB↔HSV и смешение оттенка/насыщенности
   * к цвету материала «Листья». Значение яркости (V) сохраняется, чтобы
   * не потерять объём и детали исходной текстуры.
   */
  const onMaterialRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    mat.onBeforeCompile = (shader) => {
      // Униформы: фактор и целевой цвет листвы из пропсов (переводим в линейное пространство)
      const c = new THREE.Color((materialProps as any)?.color || '#2E8B57')
      ;(c as any).convertSRGBToLinear?.()
      shader.uniforms.uLeafPaintFactor = { value: leafPaintFactor }
      shader.uniforms.uLeafTargetColor = { value: new THREE.Color(c.r, c.g, c.b) }
      // Вставляем функции HSV и смешение после выборки map
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uLeafPaintFactor;\nuniform vec3 uLeafTargetColor;\nvec3 rgb2hsv(vec3 c){ vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x); }\nvec3 hsv2rgb(vec3 c){ vec3 rgb = clamp( abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0 ); return c.z * mix(vec3(1.0), rgb, c.y); }\nfloat mixHue(float a, float b, float t){ float d = b - a; d = mod(d + 0.5, 1.0) - 0.5; return fract(a + d * t + 1.0); }`)
        .replace('#include <map_fragment>', `#include <map_fragment>\n  if (uLeafPaintFactor > 0.0001) {\n    vec3 hsv = rgb2hsv(diffuseColor.rgb);\n    vec3 tgt = rgb2hsv(uLeafTargetColor);\n    hsv.x = mixHue(hsv.x, tgt.x, uLeafPaintFactor);\n    hsv.y = mix(hsv.y, tgt.y, uLeafPaintFactor);\n    diffuseColor.rgb = hsv2rgb(hsv);\n  }\n`)
      ;(mat as any).userData.uniforms = shader.uniforms
    }
    mat.needsUpdate = true
  }

  // Обновление униформов при изменении фактора
  useEffect(() => {
    const uniforms = (materialRef.current as any)?.userData?.uniforms
    if (!uniforms) return
    if (uniforms.uLeafPaintFactor) uniforms.uLeafPaintFactor.value = leafPaintFactor
  }, [leafPaintFactor])

  return (
    <group position={groupPos} rotation={groupRot} scale={[1,1,1]} {...restMeshProps}>
      <mesh position={[offVec.x, offVec.y, offVec.z]} scale={[sx, sy, sz]}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <meshStandardMaterial
          {...materialProps}
          ref={onMaterialRef}
          side={THREE.DoubleSide}
          map={shape === 'texture' ? diffuseMap || undefined : undefined}
          alphaMap={shape === 'texture' ? alphaMap || undefined : undefined}
          normalMap={shape === 'texture' ? normalMap || undefined : undefined}
          roughnessMap={shape === 'texture' ? roughnessMap || undefined : undefined}
          transparent={shape === 'texture' ? (!!diffuseMap ? true : false) : materialProps.transparent}
          alphaTest={shape === 'texture' ? (!!diffuseMap ? 0.5 : 0.0) : materialProps.alphaTest}
        />
      </mesh>
    </group>
  )
}

export default LeafBillboard3D
