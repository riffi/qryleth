import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useLeafTextures } from '@/shared/r3f/leaves/useLeafTextures'
import { makeConiferCrossGeometry, makeLeafPlaneGeometry } from '@/shared/r3f/leaves/makeLeafGeometry'
import { patchLeafMaterial } from '@/shared/r3f/leaves/patchLeafMaterial'
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
  // Ссылка на материал (для доступа к uniforms при установке uTexCenter из хука)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
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
  // Идентификатор набора текстур и параметры покраски берем из object.treeData.params
  const setIdFromObject: string | undefined = (sceneObject as any)?.treeData?.params?.leafTextureSetId
  const paintFactorFromObject: number = (sceneObject as any)?.treeData?.params?.leafTexturePaintFactor ?? 0
  const paintJitterFromObject: number = (sceneObject as any)?.treeData?.params?.leafTexturePaintJitter ?? 0

  // Унифицированная загрузка текстур/атласа и расчёт anchor/texAspect с установкой uTexCenter
  const { diffuseMap, alphaMap, normalMap, roughnessMap, texAspect, anchorUV } = useLeafTextures(
    setIdFromObject,
    effectiveShape === 'texture',
    (textureSample as any)?.geometry?.texSpriteName,
    () => (materialRef.current as any)?.userData?.uniforms,
  )

  // useLeafTextures берёт на себя загрузку карт/atlas и расчёт anchor/texAspect/uTexCenter
  const resolvedMaterial = useMemo(() => resolveMaterial({
    directMaterial: samplePrimitive?.material,
    objectMaterialUuid: samplePrimitive?.objectMaterialUuid,
    globalMaterialUuid: samplePrimitive?.globalMaterialUuid,
    objectMaterials: materials || sceneObject.materials,
  }), [samplePrimitive, materials, sceneObject.materials])
  const materialProps = useMemo(() => materialToThreePropsWithPalette(resolvedMaterial, activePalette as any), [resolvedMaterial, activePalette])
  /**
   * Целевой цвет листвы (линейное пространство) для HSV‑покраски.
   *
   * При выборе роли из палитры (ColorSource: role) основной цвет должен браться из
   * резолвнутых свойств с учётом активной палитры (materialProps.color). Использование
   * сырого поля material.properties.color приводит к игнорированию палитры.
   */
  const targetLeafColorLinear = useMemo(() => {
    const hex = (materialProps as any)?.color || (resolvedMaterial as any)?.properties?.color || '#2E8B57'
    const c = new THREE.Color(hex)
    ;(c as any).convertSRGBToLinear?.()
    return c
  }, [resolvedMaterial, materialProps])
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
    return effectiveShape === 'coniferCross' ? makeConiferCrossGeometry() : makeLeafPlaneGeometry()
  }, [effectiveShape])

  // Подкручиваем материал для маски формы листа и лёгкой подсветки на просвет
  // materialRef объявлен выше
  // Унифицированная настройка материала через общий патчер шейдеров листвы
  const onMaterialRefPatched = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    patchLeafMaterial(mat, {
      shape: effectiveShape,
      texAspect: texAspect || 1,
      rectDebug: false,
      edgeDebug: false,
      leafPaintFactor: paintFactorFromObject,
      targetLeafColorLinear: targetLeafColorLinear,
    })
  }
  // LEGACY: блок ниже (старый onBeforeCompile и принудительная установка карт) отключён
  if (false) {
  /**
   * Настраивает стандартный материал листьев (инстансированный) перед компиляцией.
   * Помимо существующих правок (маска формы, изгиб, рамка/подсветка) добавляет
   * униформы uLeafPaintFactor/uLeafTargetColor и вставку HSV‑покраски текстуры
   * к цвету материала листвы (меняем Hue/Saturation по фактору, яркость сохраняем).
   */
  const onMaterialRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    mat.side = THREE.DoubleSide
    // Устанавливаем сразу 0.5, чтобы потом не было прыганья при изменении порога
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
      {
        const vCommon = (shape === 'texture')
          ? `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nuniform float uBend;\nuniform vec2 uTexCenter;\nattribute float aLeafPaintMul;\nvarying float vLeafPaintMul;\nvarying vec2 vLeafUv;`
          : `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nuniform float uBend;\nuniform vec2 uTexCenter;\nvarying vec2 vLeafUv;`
        const vBegin = (shape === 'texture')
          ? `\n          vec3 pos = position;\n          vLeafUv = uv;\n          vLeafPaintMul = aLeafPaintMul;\n          float bend = (vLeafUv.y - 0.5);\n          pos += normalize(normal) * ((bend * bend - 0.25) * uBend);\n          vec3 transformed = pos;\n        `
          : `\n          vec3 pos = position;\n          vLeafUv = uv;\n          float bend = (vLeafUv.y - 0.5);\n          pos += normalize(normal) * ((bend * bend - 0.25) * uBend);\n          vec3 transformed = pos;\n        `
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', vCommon)
          .replace('#include <begin_vertex>', vBegin)
          .replace('#include <uv_vertex>', `#include <uv_vertex>`)
      }

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
        // Вставляем HSV‑покраску альбедо (только для текстуры) + подсветку края и прямоугольную рамку
        const debugCommon = `#include <common>\nuniform float uEdgeDebug;\nuniform vec3 uEdgeColor;\nuniform float uEdgeWidth;\nuniform float uAlphaThreshold;\nuniform float uRectDebug;\nuniform vec3 uRectColor;\nuniform float uRectWidth;\n${shape === 'texture' ? 'uniform float uLeafPaintFactor;\nuniform vec3 uLeafTargetColor;\nvec3 rgb2hsv(vec3 c){ vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x); }\nvec3 hsv2rgb(vec3 c){ vec3 rgb = clamp( abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0 ); return c.z * mix(vec3(1.0), rgb, c.y); }\nfloat mixHue(float a, float b, float t){ float d = b - a; d = mod(d + 0.5, 1.0) - 0.5; return fract(a + d * t + 1.0); }' : ''}\n${shape === 'texture' ? 'varying float vLeafPaintMul;\n' : ''}varying vec2 vLeafUv;`
        frag = frag.replace('#include <common>', debugCommon)
        const hsvBlock = (shape === 'texture') ? `\n  float leafEff = uLeafPaintFactor * vLeafPaintMul;\n  if (leafEff > 0.0001) {\n    vec3 hsv = rgb2hsv(diffuseColor.rgb);\n    vec3 tgt = rgb2hsv(uLeafTargetColor);\n    hsv.x = mixHue(hsv.x, tgt.x, leafEff);\n    hsv.y = mix(hsv.y, tgt.y, leafEff);\n    diffuseColor.rgb = hsv2rgb(hsv);\n  }\n` : ''
        const debugMap = `#include <map_fragment>\n#if defined(USE_MAP)\n  if (uEdgeDebug > 0.5) {\n    float a = diffuseColor.a;\n    float w = fwidth(a) * uEdgeWidth;\n    float edge = 1.0 - smoothstep(uAlphaThreshold - w, uAlphaThreshold + w, a );\n    diffuseColor.rgb = mix(diffuseColor.rgb, uEdgeColor, clamp(edge, 0.0, 1.0) );\n  }\n#endif\n  if (uRectDebug > 0.5) {\n    float d = min(min(vLeafUv.x, vLeafUv.y), min(1.0 - vLeafUv.x, 1.0 - vLeafUv.y) );\n    float wr = max(uRectWidth, fwidth(d) * 2.0 );\n    float edgeR = 1.0 - smoothstep(wr * 0.5, wr, d );\n    // Делаем рамку полностью видимой: увеличиваем альфу до alphaTest\n    diffuseColor.a = max(diffuseColor.a, edgeR );\n    diffuseColor.rgb = mix(diffuseColor.rgb, uRectColor, clamp(edgeR, 0.0, 1.0) );\n  }\n`
        frag = frag.replace('#include <map_fragment>', debugMap.replace('#include <map_fragment>', `#include <map_fragment>${hsvBlock}`))
        shader.fragmentShader = frag
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

      // Пробрасываем униформы в материал и инициализируем HSV‑покраску
      shader.uniforms.uLeafPaintFactor = { value: paintFactorFromObject }
      shader.uniforms.uLeafTargetColor = { value: new THREE.Color(targetLeafColorLinear.r, targetLeafColorLinear.g, targetLeafColorLinear.b) }
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
    // Прозрачность и alphaTest активируем только при наличии текстур, иначе полагаемся на материал
    mat.transparent = !!diffuseMap
    mat.alphaTest = diffuseMap ? 0.5 : 0.0
    mat.needsUpdate = true
  }, [effectiveShape, diffuseMap, alphaMap, normalMap, roughnessMap])
  }

  // Генерация инстансового атрибута aLeafPaintMul: множитель применения фактора на каждый инстанс листа
  useEffect(() => {
    if (!meshRef.current) return
    if (effectiveShape !== 'texture') return
    const g = meshRef.current.geometry as THREE.BufferGeometry
    const total = instances.length * billboardLeaves.length
    const arr = new Float32Array(total)
    // Хеш в [0..1] из пары (instanceUuid, leafUuid)
    const hashToUnit = (s: string): number => { let h = 2166136261 >>> 0; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h=Math.imul(h,16777619)}; return (h>>>0)/4294967295 }
    let k = 0
    for (let i = 0; i < instances.length; i++) {
      const instUuid = (instances[i] as any)?.uuid || String(i)
      for (let j = 0; j < billboardLeaves.length; j++) {
        const primUuid = (billboardLeaves[j]?.primitive as any)?.uuid || String(j)
        const rnd = hashToUnit(instUuid + '/' + primUuid)
        const mul = 1 - Math.max(0, Math.min(1, paintJitterFromObject)) * rnd
        arr[k++] = mul
      }
    }
    g.setAttribute('aLeafPaintMul', new THREE.InstancedBufferAttribute(arr, 1))
  }, [meshRef.current, effectiveShape, instances, billboardLeaves, paintJitterFromObject])

  // Обновляем униформы покраски при изменении фактора/цвета
  useEffect(() => {
    if (!materialRef.current) return
    if (effectiveShape !== 'texture') return
    const uniforms = (materialRef.current as any)?.userData?.uniforms
    if (!uniforms) return
    if (uniforms.uLeafPaintFactor) uniforms.uLeafPaintFactor.value = paintFactorFromObject
    if (uniforms.uLeafTargetColor) uniforms.uLeafTargetColor.value.set(targetLeafColorLinear.r, targetLeafColorLinear.g, targetLeafColorLinear.b)
  }, [effectiveShape, paintFactorFromObject, targetLeafColorLinear])

  // Обновляем атрибут при изменении jitter без ремонта шейдера
  useEffect(() => {
    if (!meshRef.current) return
    if (effectiveShape !== 'texture') return
    const g = meshRef.current.geometry as THREE.BufferGeometry
    const attr: any = g.getAttribute('aLeafPaintMul')
    if (!attr) return
    const hashToUnit = (s: string): number => { let h = 2166136261 >>> 0; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h=Math.imul(h,16777619)}; return (h>>>0)/4294967295 }
    let k = 0
    for (let i = 0; i < instances.length; i++) {
      const instUuid = (instances[i] as any)?.uuid || String(i)
      for (let j = 0; j < billboardLeaves.length; j++) {
        const primUuid = (billboardLeaves[j]?.primitive as any)?.uuid || String(j)
        const rnd = hashToUnit(instUuid + '/' + primUuid)
        const mul = 1 - Math.max(0, Math.min(1, paintJitterFromObject)) * rnd
        attr.setX(k++, mul)
      }
    }
    attr.needsUpdate = true
  }, [meshRef.current, effectiveShape, instances, billboardLeaves, paintJitterFromObject])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined as any, count]}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={handleHover}
      renderOrder={1}
    >
      {(() => { /* eslint-disable no-console */ console.log('[InstancedLeaves] render', { count, effectiveShape, hasTextureLeaves, maps: { d: !!diffuseMap, a: !!alphaMap, n: !!normalMap, r: !!roughnessMap } }); return null })()}
      <meshStandardMaterial
        key={`leafMat-${effectiveShape}-${spriteNameKey}-${!!diffuseMap}`}
        ref={onMaterialRefPatched}
        {...materialProps}
        // При активной цветовой карте листа убираем дополнительный tint (умножение цвета),
        // чтобы не затемнять текстуру. Базовый цвет — белый.
        color={effectiveShape === 'texture' ? (!!diffuseMap ? '#ffffff' : (materialProps as any).color) : (materialProps as any).color}
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









