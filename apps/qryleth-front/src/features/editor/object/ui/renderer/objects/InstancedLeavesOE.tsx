import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxMaterial } from '@/entities/material'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import { paletteRegistry } from '@/shared/lib/palette'
import { usePalettePreviewUuid } from '../../../model/palettePreviewStore'

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
  /**
   * Карты текстур для режима shape = 'texture'. Загружаются лениво при первом появлении такого режима.
   * - diffuseMap: цветовая карта
   * - alphaMap: карта прозрачности (маска формы листа)
   * - normalMap: нормали (для микрорельефа)
   * - roughnessMap: шероховатость
   * - texAspect: отношение сторон текстуры (width/height) для корректного масштаба по X
   */
  const [diffuseMap, setDiffuseMap] = useState<THREE.Texture | null>(null)
  const [alphaMap, setAlphaMap] = useState<THREE.Texture | null>(null)
  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null)
  const [roughnessMap, setRoughnessMap] = useState<THREE.Texture | null>(null)
  const [texAspect, setTexAspect] = useState<number>(1)
  const [atlas, setAtlas] = useState<{ name: string; x: number; y: number; width: number; height: number }[] | null>(null)
  const texRotateRad = useMemo(() => {
    const deg = (sample as any)?.geometry?.texRotationDeg ?? 0
    return THREE.MathUtils.degToRad(deg)
  }, [sample])
  // Текущее имя спрайта для материал‑ключа (форсируем ремонт при смене)
  const spriteNameKey = (sample as any)?.geometry?.texSpriteName || 'default'

  /**
   * Загружает текстуры листьев из публичной папки проекта, если выбран режим 'texture'.
   * Используется набор LeafSet019_1K-JPG: Color (цвет), Opacity (прозрачность), NormalGL (нормали), Roughness (шероховатость).
   * ВАЖНО: используем JPG Color + JPG Opacity, чтобы координаты из atlas.json совпадали с раскладкой атласа.
   */
  useEffect(() => {
    const shape = (sample as any)?.geometry?.shape || 'billboard'
    if (shape !== 'texture') return
    const loader = new THREE.TextureLoader()
    const base = '/texture/leaf/LeafSet019_1K-JPG/'
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      // Оставляем flipY по умолчанию (true), чтобы формулы offset/UV совпадали с atlas.json
      t.anisotropy = 4
      t.needsUpdate = true
    }
    // Загружаем JPG‑карты: Color + Opacity, чтобы соответствовать atlas.json
    loader.load(base + 'LeafSet019_1K-JPG_Color.jpg', (t2) => {
      onTex(t2)
      t2.center.set(0.0, 0.0)
      t2.rotation = 0
      setDiffuseMap(t2)
      const img2: any = t2.image
      if (img2 && img2.width && img2.height) setTexAspect(img2.width / img2.height)
    })
    loader.load(base + 'LeafSet019_1K-JPG_Opacity.jpg', (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setAlphaMap(t) })
    loader.load(base + 'LeafSet019_1K-JPG_NormalGL.jpg', (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setNormalMap(t) })
    loader.load(base + 'LeafSet019_1K-JPG_Roughness.jpg', (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setRoughnessMap(t) })
  }, [sample])

  // Обновляем центр (держим rotation=0; поворот делаем в шейдере)
  useEffect(() => {
    if ((sample as any)?.geometry?.shape !== 'texture') return
    const applyRot = (t: THREE.Texture | null) => { if (!t) return; t.center.set(0.0,0.0); t.rotation = 0; t.needsUpdate = true }
    applyRot(diffuseMap); applyRot(alphaMap); applyRot(normalMap); applyRot(roughnessMap)
  }, [texRotateRad])

  // Обновляем uniform поворота при изменении крутилки
  useEffect(() => {
    if ((sample as any)?.geometry?.shape !== 'texture') return
    const u = (materialRef.current as any)?.userData?.uniforms
    if (u && u.uTexRotate) {
      u.uTexRotate.value = 0.0
    }
  }, [texRotateRad])

  // Загружаем atlas.json (переменные прямоугольники листьев)
  useEffect(() => {
    const shape = (sample as any)?.geometry?.shape || 'billboard'
    if (shape !== 'texture') return
    fetch('/texture/leaf/LeafSet019_1K-JPG/atlas.json').then(r => r.json()).then(setAtlas).catch(() => setAtlas(null))
  }, [sample])

  // Применяем выбранный спрайт из атласа: repeat/offset, центр, aspect
  useEffect(() => {
    if ((sample as any)?.geometry?.shape !== 'texture') return
    if (!diffuseMap) return
    const img: any = diffuseMap.image
    if (!img || !img.width || !img.height) return
    const W = img.width, H = img.height
    const spriteName: string | undefined = (sample as any)?.geometry?.texSpriteName
    const items = atlas || []
    const rect = (items.find(i => i.name === spriteName) || items[0])
    if (!rect) return
    const repX = rect.width / W
    const repY = rect.height / H
    const offX = rect.x / W
    const offYFlipTrue = 1 - (rect.y + rect.height) / H // конверсия от top-left к UV при flipY=true (по умолчанию)
    const offYFlipFalse = rect.y / H // вариант для flipY=false
    const cx = offX + repX * 0.5
    const cyFlipTrue = offYFlipTrue + repY * 0.5
    const cyFlipFalse = offYFlipFalse + repY * 0.5
    const applyRect = (t: THREE.Texture | null) => {
      if (!t) return
      t.repeat.set(repX, repY)
      t.offset.set(offX, t.flipY ? offYFlipTrue : offYFlipFalse)
      t.center.set(0.0, 0.0)
      // Вращение выполняем в шейдере, здесь держим rotation=0, чтобы сначала применился crop
      t.rotation = 0
      t.needsUpdate = true
    }
    applyRect(diffuseMap); applyRect(alphaMap); applyRect(normalMap); applyRect(roughnessMap)
    setTexAspect(rect.width / rect.height)
    // Центр поворота внутри текущего спрайта (если будем вращать в шейдере)
    if (materialRef.current && (materialRef.current as any).userData?.uniforms?.uTexCenter) {
      const u = (materialRef.current as any).userData.uniforms
      const cy = (diffuseMap && diffuseMap.flipY === false) ? cyFlipFalse : cyFlipTrue
      u.uTexCenter.value.set(cx, cy)
    }
  }, [atlas, diffuseMap, alphaMap, normalMap, roughnessMap, (sample as any)?.geometry?.texSpriteName, texRotateRad])
  const resolvedMaterial = useMemo(() => resolveMaterial({
    directMaterial: sample?.material,
    objectMaterialUuid: sample?.objectMaterialUuid,
    globalMaterialUuid: sample?.globalMaterialUuid,
    objectMaterials
  }), [sample, objectMaterials])
  const materialProps = useMemo(() => materialToThreePropsWithPalette(resolvedMaterial, activePalette as any), [resolvedMaterial, activePalette])

  const count = leaves.length

  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    for (let k = 0; k < leaves.length; k++) {
      const prim = leaves[k].primitive
      const t = prim.transform || {}
      const [px, py, pz] = t.position || [0,0,0]
      const [prx, pry, prz] = t.rotation || [0,0,0]
      const [psx, psy, psz] = t.scale || [1,1,1]
      // Радиус листа → масштаб. Для coniferCross усиливаем в 1.8–2.2 раза, чтобы кластер был заметнее
      const r = prim.type === 'leaf' ? (prim as any).geometry.radius : 0.5
      const shape = (prim as any).geometry?.shape || 'billboard'
      const scaleMul = shape === 'coniferCross' ? 2.0 : 1.0
      const uniformScale = r * Math.cbrt(Math.abs(psx * psy * psz)) * scaleMul
      const shape2 = (prim as any).geometry?.shape || 'billboard'
      // Для режима 'texture' поддерживаем неравномерный масштаб по X с учетом aspect карты
      const sx = shape2 === 'texture' ? uniformScale * (texAspect || 1) : uniformScale
      const sy = uniformScale
      const sz = uniformScale
      dummy.position.set(px, py, pz)
      dummy.rotation.set(prx, pry, prz)
      dummy.scale.set(sx, sy, sz)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(k, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [leaves, texAspect])

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

  // Геометрия: для coniferCross используем «крест» из двух плоскостей, иначе — одиночную плоскость
  const geometry = useMemo(() => {
    const shape = (sample as any)?.geometry?.shape || 'billboard'
    const makePlane = () => new THREE.PlaneGeometry(1, 1, 1, 1)
    if (shape === 'coniferCross') {
      const p1 = makePlane()
      const p2 = makePlane()
      p2.rotateY(Math.PI / 2)
      // Сшиваем вручную
      const g = new THREE.BufferGeometry()
      const pos1 = p1.getAttribute('position') as THREE.BufferAttribute
      const pos2 = p2.getAttribute('position') as THREE.BufferAttribute
      const uv1 = p1.getAttribute('uv') as THREE.BufferAttribute
      const uv2 = p2.getAttribute('uv') as THREE.BufferAttribute
      const normal1 = p1.getAttribute('normal') as THREE.BufferAttribute
      const normal2 = p2.getAttribute('normal') as THREE.BufferAttribute
      const index1 = p1.getIndex()!
      const index2 = p2.getIndex()!
      const positions = new Float32Array(pos1.array.length + pos2.array.length)
      positions.set(pos1.array as any, 0)
      positions.set(pos2.array as any, pos1.array.length)
      const uvs = new Float32Array(uv1.array.length + uv2.array.length)
      uvs.set(uv1.array as any, 0)
      uvs.set(uv2.array as any, uv1.array.length)
      const normals = new Float32Array(normal1.array.length + normal2.array.length)
      normals.set(normal1.array as any, 0)
      normals.set(normal2.array as any, normal1.array.length)
      const idx = new Uint16Array(index1.array.length + index2.array.length)
      idx.set(index1.array as any, 0)
      const offset = pos1.count
      for (let i = 0; i < index2.array.length; i++) idx[index1.array.length + i] = (index2.array as any)[i] + offset
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
      g.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
      g.setIndex(new THREE.BufferAttribute(idx, 1))
      g.computeBoundingSphere()
      g.computeBoundingBox()
      return g
    }
    return makePlane()
  }, [sample])

  // Тот же материал с onBeforeCompile: маска/изгиб/подсветка
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const onMaterialRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    mat.side = THREE.DoubleSide
    mat.alphaTest = 0.5
    mat.onBeforeCompile = (shader) => {
      const shape = (sample as any)?.geometry?.shape || 'billboard'
      const aspect = shape === 'coniferCross' ? 2.4 : (shape === 'texture' ? (texAspect || 1) : 0.6)
      shader.uniforms.uAspect = { value: aspect }
      shader.uniforms.uEdgeSoftness = { value: 0.18 }
      shader.uniforms.uBend = { value: shape === 'coniferCross' ? 0.06 : 0.08 }
      // Поворот UV внутри тайла после кропа
      shader.uniforms.uTexRotate = { value: 0.0 }
      // Яркая прямоугольная рамка по UV краям плоскости (для texture)
      shader.uniforms.uRectDebug = { value: shape === 'texture' ? 1.0 : 0.0 }
      shader.uniforms.uRectColor = { value: new THREE.Color(0xff00ff) }
      shader.uniforms.uRectWidth = { value: 0.02 }
      // Центр поворота UV (держим для совместимости, хотя поворот геометрии)
      shader.uniforms.uTexCenter = { value: new THREE.Vector2(0.5, 0.5) }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nuniform float uBend;\nuniform float uTexRotate;\nuniform vec2 uTexCenter;\nvarying vec2 vLeafUv;`)
        .replace('#include <begin_vertex>', `
          vec3 pos = position;
          vLeafUv = uv;
          float bend = (vLeafUv.y - 0.5);
          // Небольшой изгиб вдоль нормали — подходит и для креста и текстуры
          pos += normalize(normal) * ((bend * bend - 0.25) * uBend);
          vec3 transformed = pos;
        `)
        .replace('#include <uv_vertex>', `#include <uv_vertex>\n  \
          #ifdef USE_MAP\n  { vec2 c = uTexCenter; float s = sin(uTexRotate), cst = cos(uTexRotate); vec2 d = vMapUv - c; vMapUv = vec2(cst*d.x - s*d.y, s*d.x + cst*d.y) + c; }\n  #endif\n  \
          #ifdef USE_NORMALMAP\n  { vec2 c = uTexCenter; float s = sin(uTexRotate), cst = cos(uTexRotate); vec2 d = vNormalMapUv - c; vNormalMapUv = vec2(cst*d.x - s*d.y, s*d.x + cst*d.y) + c; }\n  #endif\n  \
          #ifdef USE_ROUGHNESSMAP\n  { vec2 c = uTexCenter; float s = sin(uTexRotate), cst = cos(uTexRotate); vec2 d = vRoughnessMapUv - c; vRoughnessMapUv = vec2(cst*d.x - s*d.y, s*d.x + cst*d.y) + c; }\n  #endif`)
      // Для текстурных листьев используем альфа из PNG; не подмешиваем круговую маску
      if (shape !== 'texture') {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nvarying vec2 vLeafUv;`)
          .replace('#include <alphatest_fragment>', `
            float dx = (vLeafUv.x - 0.5) / 0.5;
            float dy = (vLeafUv.y - 0.5) / 0.5 / uAspect;
            float r2 = dx*dx + dy*dy;
            float alphaMask = smoothstep(1.0 - uEdgeSoftness, 1.0, 1.0 - r2);
            diffuseColor.a *= alphaMask;
            #include <alphatest_fragment>
          `)
      }
      // Подсветка краёв по альфа‑границе (для texture)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uEdgeDebug;\nuniform vec3 uEdgeColor;\nuniform float uEdgeWidth;\nuniform float uAlphaThreshold;\nuniform float uRectDebug;\nuniform vec3 uRectColor;\nuniform float uRectWidth;\nvarying vec2 vLeafUv;`)
        .replace('#include <map_fragment>', `#include <map_fragment>\n{\n  // Альфа-ориентированная подсветка\n  #if defined(USE_MAP)\n  if (uEdgeDebug > 0.5) {\n    float a = diffuseColor.a;\n    float w = fwidth(a) * uEdgeWidth;\n    float edge = 1.0 - smoothstep(uAlphaThreshold - w, uAlphaThreshold + w, a);\n    diffuseColor.rgb = mix(diffuseColor.rgb, uEdgeColor, clamp(edge, 0.0, 1.0));\n  }\n  #endif\n  // Прямоугольная рамка по UV краям плоскости для отладки кропа\n  if (uRectDebug > 0.5) {\n    float d = min(min(vLeafUv.x, vLeafUv.y), min(1.0 - vLeafUv.x, 1.0 - vLeafUv.y));\n    float wr = max(uRectWidth, fwidth(d) * 2.0);\n    float edgeR = 1.0 - smoothstep(wr * 0.5, wr, d);\n    // Делаем рамку полностью видимой: увеличиваем альфу, чтобы пройти alphaTest\n    diffuseColor.a = max(diffuseColor.a, edgeR);\n    diffuseColor.rgb = mix(diffuseColor.rgb, uRectColor, clamp(edgeR, 0.0, 1.0));\n  }\n}`)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <lights_fragment_end>', `
          #include <lights_fragment_end>
          float back = clamp(dot(normalize(-geometryNormal), normalize(vec3(0.2, 1.0, 0.1))), 0.0, 1.0);
          reflectedLight.indirectDiffuse += vec3(0.06, 0.1, 0.06) * back;
        `)
      ;(mat as any).userData.uniforms = shader.uniforms
    }
    mat.needsUpdate = true
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry as any, undefined as any, count]}
      castShadow
      receiveShadow
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
      <meshStandardMaterial
        key={`leafMat-${spriteNameKey}`}
        ref={onMaterialRef}
        {...materialProps}
        map={(sample as any)?.geometry?.shape === 'texture' ? diffuseMap || undefined : undefined}
        alphaMap={(sample as any)?.geometry?.shape === 'texture' ? alphaMap || undefined : undefined}
        normalMap={(sample as any)?.geometry?.shape === 'texture' ? normalMap || undefined : undefined}
        roughnessMap={(sample as any)?.geometry?.shape === 'texture' ? roughnessMap || undefined : undefined}
        transparent={(sample as any)?.geometry?.shape === 'texture' ? true : materialProps.transparent}
        alphaTest={(sample as any)?.geometry?.shape === 'texture' ? 0.5 : materialProps.alphaTest}
      />
    </instancedMesh>
  )
}

export default InstancedLeavesOE
