import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { leafTextureRegistry } from '@/shared/lib/textures'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { paletteRegistry } from '@/shared/lib/palette'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import type { SceneObject, SceneObjectInstance } from '@/entities/scene/types'

interface SpherePrimitiveLike {
  type: 'leaf'
  geometry: { radius: number; shape?: 'billboard' | 'sphere' | 'coniferCross' | 'texture' }
  transform?: { position?: number[]; rotation?: number[]; scale?: number[] }
  material?: any
  objectMaterialUuid?: string
  globalMaterialUuid?: string
}

interface InstancedLeavesProps {
  sceneObject: SceneObject
  spheres: { primitive: SpherePrimitiveLike; index: number }[]
  instances: SceneObjectInstance[]
  materials?: any[]
  segments?: number
  onClick?: (event: any) => void
  onHover?: (event: any) => void
}

/**
 * Единый InstancedMesh для листьев (сферы). Масштаб задается через instanceMatrix
 * с учетом радиуса сферы и масштабов примитива/инстанса.
 */
export const InstancedLeaves: React.FC<InstancedLeavesProps> = ({
  sceneObject,
  spheres,
  instances,
  materials,
  segments = 16,
  onClick,
  onHover,
}) => {
  const dbg = (...args: any[]) => {
    // Отладочные логи рендера листьев в Scene Editor
    // eslint-disable-next-line no-console
    console.log('[InstancedLeaves]', ...args)
  }
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Палитра сцены
  const paletteUuid = useSceneStore(s => s.environmentContent?.paletteUuid || 'default')
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  // Разрешаем материал из первого листа (ожидается «Листья»)
  const samplePrimitive = spheres[0]?.primitive as any
  /**
   * Текстуры листьев для режима shape = 'texture'.
   * Загружаются по требованию и переиспользуются всеми инстансами.
   */
  const [diffuseMap, setDiffuseMap] = useState<THREE.Texture | null>(null)
  const [alphaMap, setAlphaMap] = useState<THREE.Texture | null>(null)
  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null)
  const [roughnessMap, setRoughnessMap] = useState<THREE.Texture | null>(null)
  const [texAspect, setTexAspect] = useState<number>(1)
  const [atlas, setAtlas] = useState<{ name: string; x: number; y: number; width: number; height: number }[] | null>(null)
  const [anchorUV, setAnchorUV] = useState<[number, number] | null>(null)
  // Список биллборд‑листьев (исключаем сферические), используем ниже во всех мемо/эффектах
  const billboardLeaves = useMemo(() => {
    const arr = spheres.filter(s => s.primitive.geometry.shape !== 'sphere')
    dbg('billboardLeaves computed', { total: spheres.length, billboard: arr.length })
    return arr
  }, [spheres])
  // Признак наличия текстурных листьев (по shape или по наличию texSpriteName)
  const hasTextureLeaves = useMemo(
    () => {
      const v = spheres.some(s => (s.primitive.geometry as any)?.shape === 'texture' || (s.primitive.geometry as any)?.texSpriteName)
      dbg('hasTextureLeaves?', v, { sample: (spheres[0]?.primitive.geometry as any) })
      return v
    },
    [spheres]
  )
  // Эффективный режим: texture при наличии текстурных листьев, иначе coniferCross если есть, иначе billboard
  const effectiveShape: 'billboard' | 'coniferCross' | 'texture' = useMemo(() => {
    if (hasTextureLeaves) return 'texture'
    const anyCross = billboardLeaves.some(l => l.primitive.geometry.shape === 'coniferCross')
    const eff = anyCross ? 'coniferCross' : 'billboard'
    dbg('effectiveShape', eff)
    return eff
  }, [hasTextureLeaves, billboardLeaves])
  // Представитель для texture-листьев, если есть
  const textureSample = useMemo(() => {
    const p = spheres.find(l => (l.primitive.geometry as any).shape === 'texture' || (l.primitive.geometry as any).texSpriteName)?.primitive as any
    dbg('textureSample chosen', { sprite: (p as any)?.geometry?.texSpriteName, shape: (p as any)?.geometry?.shape })
    return p
  }, [spheres])
  const spriteNameKey = ((textureSample as any)?.geometry?.texSpriteName) || 'default'
  // Идентификатор набора текстур берём из object.treeData.params
  const setIdFromObject: string | undefined = (sceneObject as any)?.treeData?.params?.leafTextureSetId

  // Загрузка карт из реестра наборов текстур при выборе режима 'texture'
  useEffect(() => {
    dbg('texture load effect start', { hasTextureLeaves })
    if (!hasTextureLeaves) return
    const loader = new THREE.TextureLoader()
    const set = (setIdFromObject && leafTextureRegistry.get(setIdFromObject)) || leafTextureRegistry.list()[0] || leafTextureRegistry.get('leafset019-1k-jpg')
    const colorUrl = set?.colorMapUrl || '/texture/leaf/LeafSet019_1K-JPG/LeafSet019_1K-JPG_Color.jpg'
    const opacityUrl = set?.opacityMapUrl || '/texture/leaf/LeafSet019_1K-JPG/LeafSet019_1K-JPG_Opacity.jpg'
    const normalUrl = set?.normalMapUrl || '/texture/leaf/LeafSet019_1K-JPG/LeafSet019_1K-JPG_NormalGL.jpg'
    const roughnessUrl = set?.roughnessMapUrl || '/texture/leaf/LeafSet019_1K-JPG/LeafSet019_1K-JPG_Roughness.jpg'
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      // flipY оставляем по умолчанию (true), чтобы расчёты offset/UV совпадали с atlas.json
      t.anisotropy = 4
      t.needsUpdate = true
    }
    // Используем ссылки из реестра (JPG Color + JPG Opacity), чтобы соответствовать atlas.json
    loader.load(colorUrl, (t2) => {
      onTex(t2)
      // Цветовая карта листьев должна быть в sRGB, иначе изображение выглядит темнее из-за линейной интерпретации
      ;(t2 as any).colorSpace = (THREE as any).SRGBColorSpace || (t2 as any).colorSpace
      t2.center.set(0.0,0.0)
      t2.rotation = 0
      setDiffuseMap(t2)
      const img2: any = t2.image
      dbg('diffuse loaded', { w: img2?.width, h: img2?.height })
      if (img2 && img2.width && img2.height) setTexAspect(img2.width / img2.height)
    }, undefined, (err) => {
      dbg('ERROR loading diffuse', err)
    })
    loader.load(opacityUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setAlphaMap(t); dbg('alpha loaded') }, undefined, (err) => dbg('ERROR loading alpha', err))
    loader.load(normalUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setNormalMap(t); dbg('normal loaded') }, undefined, (err) => dbg('ERROR loading normal', err))
    loader.load(roughnessUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setRoughnessMap(t); dbg('roughness loaded') }, undefined, (err) => dbg('ERROR loading roughness', err))
  }, [hasTextureLeaves, setIdFromObject])

  useEffect(() => {
    dbg('apply rot/center', { hasTextureLeaves, hasMaps: !!diffuseMap })
    if (!hasTextureLeaves) return
    const applyRot = (t: THREE.Texture | null) => { if (!t) return; t.center.set(0.0,0.0); t.rotation = 0; t.needsUpdate = true }
    applyRot(diffuseMap); applyRot(alphaMap); applyRot(normalMap); applyRot(roughnessMap)
  }, [hasTextureLeaves, diffuseMap, alphaMap, normalMap, roughnessMap])

  // Без поворота UV — ничего не делаем
  useEffect(() => { /* noop */ }, [hasTextureLeaves])

  // Загружаем atlas.json с произвольными прямоугольниками из активного набора реестра
  useEffect(() => {
    dbg('fetch atlas', { hasTextureLeaves })
    if (!hasTextureLeaves) return
    const set = (setIdFromObject && leafTextureRegistry.get(setIdFromObject)) || leafTextureRegistry.list()[0] || leafTextureRegistry.get('leafset019-1k-jpg')
    const atlasUrl = set?.atlasUrl || '/texture/leaf/LeafSet019_1K-JPG/atlas.json'
    fetch(atlasUrl)
      .then(r => r.json())
      .then(a => { setAtlas(a); dbg('atlas loaded', a?.length) })
      .catch((e) => { setAtlas(null); dbg('ERROR loading atlas', e) })
  }, [hasTextureLeaves, setIdFromObject])

  // Применяем выбранный прямоугольник: repeat/offset/center и aspect
  useEffect(() => {
    dbg('apply rect', { hasTextureLeaves, hasDiffuse: !!diffuseMap, sprite: (textureSample as any)?.geometry?.texSpriteName })
    if (!hasTextureLeaves) return
    if (!diffuseMap) return
    const img: any = diffuseMap.image
    if (!img || !img.width || !img.height) return
    const W = img.width, H = img.height
    const spriteName: string | undefined = (textureSample?.geometry as any)?.texSpriteName
    const items = atlas || []
    const rect: any = (items.find(i => i.name === spriteName) || items[0])
    if (!rect) return
    dbg('rect chosen', { spriteName, rect })
    const repX = rect.width / W
    const repY = rect.height / H
    const offX = rect.x / W
    const offYFlipTrue = 1 - (rect.y + rect.height) / H
    const offYFlipFalse = rect.y / H
    const cx = offX + repX * 0.5
    const cyFlipTrue = offYFlipTrue + repY * 0.5
    const cyFlipFalse = offYFlipFalse + repY * 0.5
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
    if (materialRef.current && (materialRef.current as any).userData?.uniforms?.uTexCenter) {
      const u = (materialRef.current as any).userData.uniforms
      const cy = (diffuseMap && diffuseMap.flipY === false) ? cyFlipFalse : cyFlipTrue
      u.uTexCenter.value.set(cx, cy)
      dbg('uTexCenter set', { cx, cy })
    }
    // Anchor: читаем из atlas.json; по умолчанию — нижняя середина (0.5, 1.0)
    const ax = typeof rect.anchorX === 'number' ? rect.anchorX : (rect.anchor?.x)
    const ay = typeof rect.anchorY === 'number' ? rect.anchorY : (rect.anchor?.y)
    if (typeof ax === 'number' && typeof ay === 'number' && rect.width > 0 && rect.height > 0) {
      const uN = Math.min(1, Math.max(0, ax / rect.width))
      const vN = Math.min(1, Math.max(0, ay / rect.height))
      setAnchorUV([uN, vN])
      dbg('anchor set', { u: uN, v: vN })
    } else {
      setAnchorUV([0.5, 1.0])
      dbg('anchor default')
    }
  }, [hasTextureLeaves, atlas, diffuseMap, alphaMap, normalMap, roughnessMap, (textureSample as any)?.geometry?.texSpriteName])
  const resolvedMaterial = useMemo(() => resolveMaterial({
    directMaterial: samplePrimitive?.material,
    objectMaterialUuid: samplePrimitive?.objectMaterialUuid,
    globalMaterialUuid: samplePrimitive?.globalMaterialUuid,
    objectMaterials: materials || sceneObject.materials,
  }), [samplePrimitive, materials, sceneObject.materials])
  const materialProps = useMemo(() => materialToThreePropsWithPalette(resolvedMaterial, activePalette as any), [resolvedMaterial, activePalette])
  const count = instances.length * billboardLeaves.length

  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    dbg('compose instance matrices', { instances: instances.length, leaves: billboardLeaves.length, texAspect, anchorUV })

    let k = 0
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i]
      const it = inst.transform || {}
      const [ix, iy, iz] = it.position || [0,0,0]
      const [irx, iry, irz] = it.rotation || [0,0,0]
      const [isx, isy, isz] = it.scale || [1,1,1]
      const qInst = new THREE.Quaternion().setFromEuler(new THREE.Euler(irx, iry, irz, 'XYZ'))

      for (let j = 0; j < billboardLeaves.length; j++) {
        const prim = billboardLeaves[j].primitive
        const pt = prim.transform || {}
        const [px, py, pz] = pt.position || [0,0,0]
        const [prx, pry, prz] = pt.rotation || [0,0,0]
        const [psx, psy, psz] = pt.scale || [1,1,1]

        const qPrim = new THREE.Quaternion().setFromEuler(new THREE.Euler(prx, pry, prz, 'XYZ'))
        const qFinal = new THREE.Quaternion().copy(qInst).multiply(qPrim)

        // Позиция листа
        const vLocal = new THREE.Vector3(px, py, pz)
        vLocal.multiply(new THREE.Vector3(isx, isy, isz))
        vLocal.applyQuaternion(qInst)
        vLocal.add(new THREE.Vector3(ix, iy, iz))

        // Итоговый масштаб: радиус * scale примитива * scale инстанса (равномерный)
        const r = prim.geometry.radius || 0.5
        const shape = prim.geometry.shape || 'billboard'
        const scaleMul = shape === 'coniferCross' ? 2.0 : 1.0
        const uniformScale = r * Math.cbrt(Math.abs(isx * isy * isz)) * Math.cbrt(Math.abs(psx * psy * psz)) * scaleMul
        const sh = prim.geometry.shape || 'billboard'
        const sx = sh === 'texture' ? uniformScale * (texAspect || 1) : uniformScale
        const sy = uniformScale
        const sz = uniformScale

        dummy.position.set(vLocal.x, vLocal.y, vLocal.z)
        // Смещение на точку основания спрайта (delta относительно нижней середины, которую уже учитывает генератор)
        if (sh === 'texture') {
          const u = anchorUV?.[0] ?? 0.5
          const v = anchorUV?.[1] ?? 1.0
          // Смещение = -anchor_local; anchor_local = ((u-0.5)*sx, (0.5 - v)*sy)
          const dx = (0.5 - u) * sx
          const dy = (v - 0.5) * sy
          const off = new THREE.Vector3(dx, dy, 0)
          // Привязываем смещение к ориентации листа без дополнительного вращения вокруг нормали.
          // В ObjectEditor смещение anchor применяется в локальных координатах плоскости
          // и поворачивается только поворотом примитива. В SceneEditor у нас есть ещё и поворот инстанса,
          // поэтому применяем комбинированный кватернион qFinal (инстанс * примитив),
          // но НЕ добавляем дополнительный «ролл» вокруг нормали.
          off.applyQuaternion(qFinal)
          dummy.position.add(off)
        }
        // Ориентация листа: ровно как в ObjectEditor — только базовый поворот
        // (в Scene учитываем базовый поворот примитива и инстанса без дополнительного «ролла»)
        dummy.quaternion.copy(qFinal)
        dummy.scale.set(sx, sy, sz)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(k, dummy.matrix)
        k++
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [instances, spheres, texAspect, anchorUV])

  const handleClick = (event: any) => {
    if (!onClick) return
    const instanceId: number = event.instanceId
    if (instanceId == null) return
    const perInstance = billboardLeaves.length
    const sceneInstIndex = Math.floor(instanceId / perInstance)
    const inst = instances[sceneInstIndex]
    onClick({
      ...event,
      userData: {
        generated: true,
        objectUuid: sceneObject.uuid,
        objectInstanceUuid: inst.uuid,
        isInstanced: true,
        instanceId,
        layerId: sceneObject.layerId || 'objects'
      }
    })
  }

  const handleHover = (event: any) => {
    if (!onHover) return
    const instanceId: number = event.instanceId
    if (instanceId == null) return
    const perInstance = billboardLeaves.length
    const sceneInstIndex = Math.floor(instanceId / perInstance)
    const inst = instances[sceneInstIndex]
    onHover({
      ...event,
      userData: {
        generated: true,
        objectUuid: sceneObject.uuid,
        objectInstanceUuid: inst.uuid,
        isInstanced: true,
        instanceId,
        layerId: sceneObject.layerId || 'objects'
      }
    })
  }

  // Переходим от сфер к плоским биллбордам-листьям: базовая геометрия — плоскость 1x1
  const geometry = useMemo(() => {
    const shape = effectiveShape
    const makePlane = () => new THREE.PlaneGeometry(1, 1, 1, 1)
    if (shape === 'coniferCross') {
      const p1 = makePlane()
      const p2 = makePlane()
      p2.rotateY(Math.PI / 2)
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
  }, [effectiveShape])

  // Подкручиваем материал для маски формы листа и лёгкой подсветки на просвет
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const onMaterialRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    mat.side = THREE.DoubleSide
    mat.alphaTest = 0.5
    mat.onBeforeCompile = (shader) => {
      const shape = effectiveShape
      const aspect = shape === 'coniferCross' ? 2.4 : (shape === 'texture' ? (texAspect || 1) : 0.6)
      dbg('onBeforeCompile', { shape, aspect, hasMaps: !!diffuseMap })
      shader.uniforms.uAspect = { value: aspect }
      shader.uniforms.uEdgeSoftness = { value: 0.18 }
      shader.uniforms.uBend = { value: shape === 'coniferCross' ? 0.06 : 0.08 }
      // Отладочная прямоугольная рамка по UV‑границам плоскости
      // В SceneEditor не показываем отладочную прямоугольную обводку
      shader.uniforms.uRectDebug = { value: 0.0 }
      shader.uniforms.uRectColor = { value: new THREE.Color(0xff00ff) }
      shader.uniforms.uRectWidth = { value: 0.02 }
      // Debug‑подсветка края по альфа‑границе
      // И отладочную подсветку края по альфа‑границе тоже выключаем
      shader.uniforms.uEdgeDebug = { value: 0.0 }
      shader.uniforms.uEdgeColor = { value: new THREE.Color(0x00ff00) }
      shader.uniforms.uEdgeWidth = { value: 2.0 }
      shader.uniforms.uAlphaThreshold = { value: (mat.alphaTest ?? 0.5) as number }

      // Добавляем объявления uniform и свою varying для UV
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nuniform float uBend;\nuniform vec2 uTexCenter;\nvarying vec2 vLeafUv;`)
        .replace('#include <begin_vertex>', `
          vec3 pos = position;
          vLeafUv = uv;
          float bend = (vLeafUv.y - 0.5);
          pos += normalize(normal) * ((bend * bend - 0.25) * uBend);
          vec3 transformed = pos;
        `)
        .replace('#include <uv_vertex>', `#include <uv_vertex>`)

      {
        let frag = shader.fragmentShader
        if (shape !== 'texture') {
          // Не дублируем объявление varying: vLeafUv объявим единообразно ниже в общем блоке
          frag = frag
            .replace('#include <common>', `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;`)
            .replace('#include <alphatest_fragment>', `
              // Эллиптическая маска листа в UV, мягкий край
              float dx = (vLeafUv.x - 0.5) / 0.5;
              float dy = (vLeafUv.y - 0.5) / 0.5 / uAspect;
              float r2 = dx*dx + dy*dy;
              // Правильный порядок границ smoothstep: edge0 < edge1
              float alphaMask = smoothstep(1.0 - uEdgeSoftness, 1.0, 1.0 - r2);
              diffuseColor.a *= alphaMask;
              #include <alphatest_fragment>
            `)
        }
        // Вставляем подсветку края после применения карты и добавляем прямоугольную рамку по UV плоскости
        frag = frag
          .replace('#include <common>', `#include <common>\nuniform float uEdgeDebug;\nuniform vec3 uEdgeColor;\nuniform float uEdgeWidth;\nuniform float uAlphaThreshold;\nuniform float uRectDebug;\nuniform vec3 uRectColor;\nuniform float uRectWidth;\nvarying vec2 vLeafUv;`)
          .replace('#include <map_fragment>', `#include <map_fragment>\n#if defined(USE_MAP)\n  if (uEdgeDebug > 0.5) {\n    float a = diffuseColor.a;\n    float w = fwidth(a) * uEdgeWidth;\n    float edge = 1.0 - smoothstep(uAlphaThreshold - w, uAlphaThreshold + w, a );\n    diffuseColor.rgb = mix(diffuseColor.rgb, uEdgeColor, clamp(edge, 0.0, 1.0) );\n  }\n#endif\n  if (uRectDebug > 0.5) {\n    float d = min(min(vLeafUv.x, vLeafUv.y), min(1.0 - vLeafUv.x, 1.0 - vLeafUv.y) );\n    float wr = max(uRectWidth, fwidth(d) * 2.0 );\n    float edgeR = 1.0 - smoothstep(wr * 0.5, wr, d );\n    // Делаем рамку полностью видимой: увеличиваем альфу до alphaTest\n    diffuseColor.a = max(diffuseColor.a, edgeR );\n    diffuseColor.rgb = mix(diffuseColor.rgb, uRectColor, clamp(edgeR, 0.0, 1.0) );\n  }\n`)
        // Для режима 'texture' дополнительно гарантируем повышение альфы перед alphaTest (после применения alphaMap)
        if (shape === 'texture') {
          frag = frag.replace('#include <alphatest_fragment>', `
            if (uRectDebug > 0.5) {
              float d = min(min(vLeafUv.x, vLeafUv.y), min(1.0 - vLeafUv.x, 1.0 - vLeafUv.y));
              float wr = max(uRectWidth, fwidth(d) * 2.0);
              float edgeR = 1.0 - smoothstep(wr * 0.5, wr, d);
              diffuseColor.a = max(diffuseColor.a, edgeR);
            }
            #include <alphatest_fragment>
          `)
        }
        frag = frag.replace('#include <lights_fragment_end>', `
          #include <lights_fragment_end>
          // Простая подсветка на просвет (фейковая SSS) — добавляем диффуз к задней стороне
          float back = clamp(dot(normalize(-geometryNormal), normalize(vec3(0.2, 1.0, 0.1))), 0.0, 1.0);
          reflectedLight.indirectDiffuse += vec3(0.06, 0.1, 0.06) * back;
        `)
        shader.fragmentShader = frag
      }

      // Пробрасываем униформы в материал
      ;(mat as any).userData.uniforms = shader.uniforms
    }
    mat.needsUpdate = true
  }

  // Если карты загрузились, принудительно назначаем их в материал и помечаем на обновление
  useEffect(() => {
    if (!materialRef.current) return
    if (effectiveShape !== 'texture') return
    const mat = materialRef.current as any
    if (diffuseMap) mat.map = diffuseMap
    if (alphaMap) mat.alphaMap = alphaMap
    if (normalMap) mat.normalMap = normalMap
    if (roughnessMap) mat.roughnessMap = roughnessMap
    mat.transparent = true
    mat.alphaTest = 0.5
    mat.needsUpdate = true
  }, [effectiveShape, diffuseMap, alphaMap, normalMap, roughnessMap])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined as any, count]}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={handleHover}
    >
      {(() => { /* eslint-disable no-console */ console.log('[InstancedLeaves] render', { count, effectiveShape, hasTextureLeaves, maps: { d: !!diffuseMap, a: !!alphaMap, n: !!normalMap, r: !!roughnessMap } }); return null })()}
      <meshStandardMaterial
        key={`leafMat-${effectiveShape}-${spriteNameKey}-${!!diffuseMap}`}
        ref={onMaterialRef}
        {...materialProps}
        // При активной цветовой карте листа убираем дополнительный tint (умножение цвета),
        // чтобы не затемнять текстуру. Базовый цвет — белый.
        color={effectiveShape === 'texture' ? '#ffffff' : (materialProps as any).color}
        map={effectiveShape === 'texture' ? diffuseMap || undefined : undefined}
        alphaMap={effectiveShape === 'texture' ? alphaMap || undefined : undefined}
        normalMap={effectiveShape === 'texture' ? normalMap || undefined : undefined}
        roughnessMap={effectiveShape === 'texture' ? roughnessMap || undefined : undefined}
        transparent={effectiveShape === 'texture' ? (!!diffuseMap ? true : false) : materialProps.transparent}
        alphaTest={effectiveShape === 'texture' ? (!!diffuseMap ? 0.5 : 0.0) : materialProps.alphaTest}
      />
    </instancedMesh>
  )
}

export default InstancedLeaves









