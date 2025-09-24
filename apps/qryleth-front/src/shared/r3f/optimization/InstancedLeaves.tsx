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
  /**
   * Доля листьев для отрисовки (LOD), 0..1. Если не задано — используются все листья.
   * Сэмплинг детерминированный по UUID листа, чтобы набор был стабилен между кадрами.
   */
  sampleRatio?: number
  /**
   * Дополнительный множитель масштаба листьев. Используется для дальнего LOD,
   * чтобы компенсировать уменьшение количества и сохранить визуальную плотность.
   */
  scaleMul?: number
  /** Прозрачность для кросс‑фейда LOD (0..1). Если указан < 1, материал станет прозрачным. */
  opacity?: number
  /** Переопределение depthWrite для избежания z‑конфликтов при фейде. */
  depthWrite?: boolean
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
  sampleRatio,
  scaleMul = 1,
  opacity,
  depthWrite,
  onClick,
  onHover,
}) => {
  // Беззвучный отладочный помощник (подавляет логи в консоль)
  const dbg = (..._args: any[]) => {}
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Палитра сцены
  const paletteUuid = useSceneStore(s => s.environmentContent?.paletteUuid || 'default')
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')
  // Интенсивность окружающего света сцены для масштабирования «подсветки на просвет»
  const ambientIntensity = useSceneStore(s => s.lighting?.ambient?.intensity ?? 0.6)

  // Разрешаем материал из первого листа (ожидается «Листья»)
  const samplePrimitive = spheres[0]?.primitive as any
  // Ссылка на материал (для доступа к uniforms при установке uTexCenter из хука)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  // Список биллборд‑листьев (исключаем сферические), используем ниже во всех мемо/эффектах
  const billboardLeavesRaw = useMemo(() => {
    const arr = spheres.filter(s => s.primitive.geometry.shape !== 'sphere')
    dbg('billboardLeavesRaw computed', { total: spheres.length, billboard: arr.length })
    return arr
  }, [spheres])
  /**
   * Применяет детерминированный LOD‑сэмплинг листьев по UUID.
   * При sampleRatio ∈ (0..1) выбирает стабильное подмножество, чтобы избежать «дрожания» набора.
   */
  const billboardLeaves = useMemo(() => {
    if (sampleRatio == null || sampleRatio >= 0.999) return billboardLeavesRaw
    const ratio = Math.max(0, Math.min(1, sampleRatio))
    const out: typeof billboardLeavesRaw = []
    const hashToUnit = (s: string): number => { let h = 2166136261 >>> 0; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h=Math.imul(h,16777619) } return (h>>>0)/4294967295 }
    for (const it of billboardLeavesRaw) {
      const id = ((it.primitive as any)?.uuid || `${(it.primitive as any)?.name || 'leaf'}`) as string
      if (hashToUnit(id) <= ratio) out.push(it)
    }
    dbg('billboardLeaves LOD-sampled', { in: billboardLeavesRaw.length, out: out.length, ratio })
    return out
  }, [billboardLeavesRaw, sampleRatio])
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
        const shapeScaleMul = shape === 'coniferCross' ? 2.0 : 1.0
        // Итоговый множитель масштаба = форма (для «креста» выше) × глобальный LOD‑множитель scaleMul
        const uniformScale = r * Math.cbrt(Math.abs(isx * isy * isz)) * Math.cbrt(Math.abs(psx * psy * psz)) * shapeScaleMul * (scaleMul || 1)
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
// InstancedLeaves.tsx — внутри onMaterialRefPatched
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
      onClick={handleClick}
      onPointerOver={handleHover}
      renderOrder={1}
    >
      {/* debug render log removed */}
      <meshStandardMaterial
        key={`leafMat-${effectiveShape}-${spriteNameKey}-${!!diffuseMap}`}
        ref={onMaterialRefPatched}
        {...materialProps}
        envMapIntensity={0}
        // Листва — диэлектрик без выраженного зеркального отклика. Чтобы исключить
        // паразитный оттенок от HDRI (фиолетовые/розовые зоны неба), полностью
        // отключаем вклад IBL для листьев. При необходимости можно вернуть как
        // настройку материала (envMapIntensity>0), но по умолчанию — 0.
        opacity={opacity != null ? opacity : (materialProps as any).opacity}
        depthWrite={depthWrite != null ? depthWrite : (materialProps as any).depthWrite}

        // При активной цветовой карте листа убираем дополнительный tint (умножение цвета),
        // чтобы не затемнять текстуру. Базовый цвет — белый.
        //color={effectiveShape === 'texture' ? (!!diffuseMap ? '#FFFFFF' : (materialProps as any).color) : (materialProps as any).color}
       // color={'#FFFFFF'}
        //color={diffuseMap}
        map={effectiveShape === 'texture' ? diffuseMap || undefined : undefined}
        alphaMap={effectiveShape === 'texture' ? alphaMap || undefined : undefined}
        normalMap={effectiveShape === 'texture' ? normalMap || undefined : undefined}
        roughnessMap={effectiveShape === 'texture' ? roughnessMap || undefined : undefined}
        // transparent={effectiveShape === 'texture'
        //   ? (opacity != null ? (opacity < 1) : false)
        //   : ((opacity != null ? (opacity < 1) : false) || materialProps.transparent)}
        transparent={false}
        //alphaToCoverage={effectiveShape=== 'texture' ? true : undefined}
        alphaTest={effectiveShape === 'texture' ? (!!diffuseMap ? 0.5 : 0.0) : materialProps.alphaTest}
      />
    </instancedMesh>
  )
}

export default InstancedLeaves









