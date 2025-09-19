import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { leafTextureRegistry } from '@/shared/lib/textures'
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
  // Нормированная точка основания спрайта внутри прямоугольника (u,v), u,v в [0..1] с началом в левом верхнем углу
  const [anchorUV, setAnchorUV] = useState<[number, number] | null>(null)
  // Текущее имя спрайта для материал‑ключа (форсируем ремонт при смене)
  const spriteNameKey = (sample as any)?.geometry?.texSpriteName || 'default'

  /**
   * Загружает текстуры листьев из реестра наборов, если выбран режим 'texture'.
   * Используем первый доступный набор из реестра (или конкретный id), с резервом на прежние пути.
   */
  useEffect(() => {
    const shape = (sample as any)?.geometry?.shape || 'billboard'
    if (shape !== 'texture') return
    const loader = new THREE.TextureLoader()
    const set = (texSetId && leafTextureRegistry.get(texSetId)) || leafTextureRegistry.list()[0]
    const colorUrl = set?.colorMapUrl
    const opacityUrl = set?.opacityMapUrl
    const normalUrl = set?.normalMapUrl
    const roughnessUrl = set?.roughnessMapUrl
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      // Оставляем flipY по умолчанию (true), чтобы формулы offset/UV совпадали с atlas.json
      t.anisotropy = 4
      t.needsUpdate = true
    }
    // Загружаем карты по ссылкам из набора: Color + Opacity, чтобы соответствовать atlas.json
    if (colorUrl) loader.load(colorUrl, (t2) => {
      onTex(t2)
      // Цветовая карта листьев должна быть в sRGB, иначе получится визуально темнее.
      ;(t2 as any).colorSpace = (THREE as any).SRGBColorSpace || (t2 as any).colorSpace
      t2.center.set(0.0, 0.0)
      t2.rotation = 0
      setDiffuseMap(t2)
      const img2: any = t2.image
      if (img2 && img2.width && img2.height) setTexAspect(img2.width / img2.height)
    })
    else { setDiffuseMap(null) }
    if (opacityUrl) loader.load(opacityUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setAlphaMap(t) })
    else setAlphaMap(null)
    if (normalUrl) loader.load(normalUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setNormalMap(t) })
    else setNormalMap(null)
    if (roughnessUrl) loader.load(roughnessUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setRoughnessMap(t) })
    else setRoughnessMap(null)
  }, [sample, texSetId])

  // Обновляем центр (держим rotation=0; не вращаем UV)
  useEffect(() => {
    if ((sample as any)?.geometry?.shape !== 'texture') return
    const applyRot = (t: THREE.Texture | null) => { if (!t) return; t.center.set(0.0,0.0); t.rotation = 0; t.needsUpdate = true }
    applyRot(diffuseMap); applyRot(alphaMap); applyRot(normalMap); applyRot(roughnessMap)
  }, [sample, diffuseMap, alphaMap, normalMap, roughnessMap])

  // Загружаем atlas.json (переменные прямоугольники листьев) из активного набора реестра
  useEffect(() => {
    const shape = (sample as any)?.geometry?.shape || 'billboard'
    if (shape !== 'texture') return
    const set = (texSetId && leafTextureRegistry.get(texSetId)) || leafTextureRegistry.list()[0]
    const atlasUrl = set?.atlasUrl
    if (atlasUrl) fetch(atlasUrl).then(r => r.json()).then(setAtlas).catch(() => setAtlas(null))
    else setAtlas(null)
  }, [sample, texSetId])

  // Применяем выбранный спрайт из атласа: repeat/offset, центр, aspect
  useEffect(() => {
    if ((sample as any)?.geometry?.shape !== 'texture') return
    if (!diffuseMap) return
    const img: any = diffuseMap.image
    if (!img || !img.width || !img.height) return
    const W = img.width, H = img.height
    const spriteName: string | undefined = (sample as any)?.geometry?.texSpriteName
    const items = atlas || []
    const rect: any = (items.find(i => i.name === spriteName) || items[0])
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
    // Читаем точку основания из атласа (anchorX/anchorY либо anchor: {x,y}); по умолчанию — нижняя середина (0.5, 1.0)
    const ax = typeof rect.anchorX === 'number' ? rect.anchorX : (rect.anchor?.x)
    const ay = typeof rect.anchorY === 'number' ? rect.anchorY : (rect.anchor?.y)
    if (typeof ax === 'number' && typeof ay === 'number' && rect.width > 0 && rect.height > 0) {
      const uN = Math.min(1, Math.max(0, ax / rect.width))
      const vN = Math.min(1, Math.max(0, ay / rect.height))
      setAnchorUV([uN, vN])
    } else {
      setAnchorUV([0.5, 1.0])
    }
  }, [atlas, diffuseMap, alphaMap, normalMap, roughnessMap, (sample as any)?.geometry?.texSpriteName])
  const resolvedMaterial = useMemo(() => resolveMaterial({
    directMaterial: sample?.material,
    objectMaterialUuid: sample?.objectMaterialUuid,
    globalMaterialUuid: sample?.globalMaterialUuid,
    objectMaterials
  }), [sample, objectMaterials])
  const materialProps = useMemo(() => materialToThreePropsWithPalette(resolvedMaterial, activePalette as any), [resolvedMaterial, activePalette])
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
      // Привязываем геометрию к точке основания спрайта: смещение в локальных координатах плоскости
      if (shape2 === 'texture') {
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
  /**
   * Настройка материала листьев перед компиляцией шейдера.
   * Добавляет униформы и шейдерные вставки:
   * - uAspect/uBend/Debug для маски/изгиба/рамки (как раньше);
   * - uLeafPaintFactor/uLeafTargetColor и RGB↔HSV функции для покраски
   *   текстуры к цвету материала листвы (Hue/Saturation), яркость сохраняется.
   */
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
      // Яркая прямоугольная рамка по UV краям плоскости (для texture)
      shader.uniforms.uRectDebug = { value: (shape === 'texture' && leafRectDebug) ? 1.0 : 0.0 }
      shader.uniforms.uRectColor = { value: new THREE.Color(0xff00ff) }
      shader.uniforms.uRectWidth = { value: 0.02 }
      // Центр поворота UV (держим для совместимости, хотя поворот геометрии)
      shader.uniforms.uTexCenter = { value: new THREE.Vector2(0.5, 0.5) }
      {
        const vCommon = (shape === 'texture')
          ? `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nuniform float uBend;\nuniform vec2 uTexCenter;\nattribute float aLeafPaintMul;\nvarying float vLeafPaintMul;\nvarying vec2 vLeafUv;`
          : `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nuniform float uBend;\nuniform vec2 uTexCenter;\nvarying vec2 vLeafUv;`
        const vBegin = (shape === 'texture')
          ? `\n          vec3 pos = position;\n          vLeafUv = uv;\n          vLeafPaintMul = aLeafPaintMul;\n          float bend = (vLeafUv.y - 0.5);\n          // Небольшой изгиб вдоль нормали — подходит и для креста и текстуры\n          pos += normalize(normal) * ((bend * bend - 0.25) * uBend);\n          vec3 transformed = pos;\n        `
          : `\n          vec3 pos = position;\n          vLeafUv = uv;\n          float bend = (vLeafUv.y - 0.5);\n          pos += normalize(normal) * ((bend * bend - 0.25) * uBend);\n          vec3 transformed = pos;\n        `
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', vCommon)
          .replace('#include <begin_vertex>', vBegin)
          .replace('#include <uv_vertex>', `#include <uv_vertex>`)
      }
      // Для текстурных листьев используем альфа из PNG; не подмешиваем круговую маску
      if (shape !== 'texture') {
        // Вставляем только необходимые uniform'ы, без дублирования объявления vLeafUv
        // Объявление varying vLeafUv выполняется ниже в едином блоке для всех режимов
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;`)
          .replace('#include <alphatest_fragment>', `
            float dx = (vLeafUv.x - 0.5) / 0.5;
            float dy = (vLeafUv.y - 0.5) / 0.5 / uAspect;
            float r2 = dx*dx + dy*dy;
            float alphaMask = smoothstep(1.0 - uEdgeSoftness, 1.0, 1.0 - r2);
            diffuseColor.a *= alphaMask;
            #include <alphatest_fragment>
          `)
      }
      // Гарантируем видимость прямоугольного контура независимо от alphaMap: усиливаем альфу перед alphaTest
      if (shape === 'texture') {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <alphatest_fragment>', `
            // Подмешиваем альфу рамки по UV‑краям плоскости перед пороговой отсечкой
            if (uRectDebug > 0.5) {
              float d = min(min(vLeafUv.x, vLeafUv.y), min(1.0 - vLeafUv.x, 1.0 - vLeafUv.y));
              float wr = max(uRectWidth, fwidth(d) * 2.0);
              float edgeR = 1.0 - smoothstep(wr * 0.5, wr, d);
              diffuseColor.a = max(diffuseColor.a, edgeR);
            }
            #include <alphatest_fragment>
          `)
      }
      // Подсветка краёв + (для текстуры) HSV‑покраска текстуры к цвету материала листвы
      {
        let frag = shader.fragmentShader
        // Debug‑uniforms (общие)
        const debugCommon = `#include <common>\nuniform float uEdgeDebug;\nuniform vec3 uEdgeColor;\nuniform float uEdgeWidth;\nuniform float uAlphaThreshold;\nuniform float uRectDebug;\nuniform vec3 uRectColor;\nuniform float uRectWidth;\n${shape === 'texture' ? 'uniform float uLeafPaintFactor;\nuniform vec3 uLeafTargetColor;\nvec3 rgb2hsv(vec3 c){ vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x); }\nvec3 hsv2rgb(vec3 c){ vec3 rgb = clamp( abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0 ); return c.z * mix(vec3(1.0), rgb, c.y); }\nfloat mixHue(float a, float b, float t){ float d = b - a; d = mod(d + 0.5, 1.0) - 0.5; return fract(a + d * t + 1.0); }' : ''}\n${shape === 'texture' ? 'varying float vLeafPaintMul;\n' : ''}varying vec2 vLeafUv;`
        frag = frag.replace('#include <common>', debugCommon)
        // Вставка в map_fragment: сначала HSV‑покраска (только для текстуры), затем debug‑блок
        const hsvBlock = (shape === 'texture') ? `\n  float leafEff = uLeafPaintFactor * vLeafPaintMul;\n  if (leafEff > 0.0001) {\n    vec3 hsv = rgb2hsv(diffuseColor.rgb);\n    vec3 tgt = rgb2hsv(uLeafTargetColor);\n    hsv.x = mixHue(hsv.x, tgt.x, leafEff);\n    hsv.y = mix(hsv.y, tgt.y, leafEff);\n    diffuseColor.rgb = hsv2rgb(hsv);\n  }\n` : ''
        const debugMap = `#include <map_fragment>\n#if defined(USE_MAP)\n  if (uEdgeDebug > 0.5) {\n    float a = diffuseColor.a;\n    float w = fwidth(a) * uEdgeWidth;\n    float edge = 1.0 - smoothstep(uAlphaThreshold - w, uAlphaThreshold + w, a);\n    diffuseColor.rgb = mix(diffuseColor.rgb, uEdgeColor, clamp(edge, 0.0, 1.0));\n  }\n#endif\n  if (uRectDebug > 0.5) {\n    float d = min(min(vLeafUv.x, vLeafUv.y), min(1.0 - vLeafUv.x, 1.0 - vLeafUv.y));\n    float wr = max(uRectWidth, fwidth(d) * 2.0);\n    float edgeR = 1.0 - smoothstep(wr * 0.5, wr, d);\n    diffuseColor.a = max(diffuseColor.a, edgeR);\n    diffuseColor.rgb = mix(diffuseColor.rgb, uRectColor, clamp(edgeR, 0.0, 1.0));\n  }\n`
        frag = frag.replace('#include <map_fragment>', debugMap.replace('#include <map_fragment>', `#include <map_fragment>${hsvBlock}`))
        shader.fragmentShader = frag
      }
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <lights_fragment_end>', `
          #include <lights_fragment_end>
          float back = clamp(dot(normalize(-geometryNormal), normalize(vec3(0.2, 1.0, 0.1))), 0.0, 1.0);
          reflectedLight.indirectDiffuse += vec3(0.06, 0.1, 0.06) * back;
        `)
      // Инициализация униформов для HSV‑покраски
      shader.uniforms.uLeafPaintFactor = { value: leafPaintFactor }
      shader.uniforms.uLeafTargetColor = { value: new THREE.Color(targetLeafColorLinear.r, targetLeafColorLinear.g, targetLeafColorLinear.b) }
      ;(mat as any).userData.uniforms = shader.uniforms
    }
    mat.needsUpdate = true
  }

  // Обновляем флаг uRectDebug при переключении тумблера в UI без пересоздания материала
  useEffect(() => {
    const shape = (sample as any)?.geometry?.shape || 'billboard'
    if (shape !== 'texture') return
    const uniforms = (materialRef.current as any)?.userData?.uniforms
    if (uniforms && uniforms.uRectDebug) {
      uniforms.uRectDebug.value = leafRectDebug ? 1.0 : 0.0
    }
  }, [leafRectDebug, sample])

  // Обновляем униформы покраски при изменении фактора/цвета
  useEffect(() => {
    const shape = (sample as any)?.geometry?.shape || 'billboard'
    if (shape !== 'texture') return
    const uniforms = (materialRef.current as any)?.userData?.uniforms
    if (!uniforms) return
    if (uniforms.uLeafPaintFactor) uniforms.uLeafPaintFactor.value = leafPaintFactor
    if (uniforms.uLeafTargetColor) uniforms.uLeafTargetColor.value.set(targetLeafColorLinear.r, targetLeafColorLinear.g, targetLeafColorLinear.b)
  }, [leafPaintFactor, targetLeafColorLinear, sample])

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
      <meshStandardMaterial
        key={`leafMat-${spriteNameKey}`}
        ref={onMaterialRef}
        {...materialProps}
        // Для режимов с цветовой картой листа избегаем двойного умножения цвета (tint),
        // иначе текстура выглядит темнее. Устанавливаем базовый цвет в белый, когда map активен.
        color={(sample as any)?.geometry?.shape === 'texture' ? (diffuseMap ? '#ffffff' : (materialProps as any).color) : (materialProps as any).color}
        map={(sample as any)?.geometry?.shape === 'texture' ? diffuseMap || undefined : undefined}
        alphaMap={(sample as any)?.geometry?.shape === 'texture' ? alphaMap || undefined : undefined}
        normalMap={(sample as any)?.geometry?.shape === 'texture' ? normalMap || undefined : undefined}
        roughnessMap={(sample as any)?.geometry?.shape === 'texture' ? roughnessMap || undefined : undefined}
        transparent={(sample as any)?.geometry?.shape === 'texture' ? (!!diffuseMap ? true : false) : materialProps.transparent}
        alphaTest={(sample as any)?.geometry?.shape === 'texture' ? (!!diffuseMap ? 0.5 : 0.0) : materialProps.alphaTest}
      />
    </instancedMesh>
  )
}

export default InstancedLeavesOE
