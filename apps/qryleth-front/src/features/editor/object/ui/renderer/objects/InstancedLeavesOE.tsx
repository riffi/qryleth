import React, { useEffect, useMemo, useRef, useState } from 'react'
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
  const spriteNameKey = (sample as any)?.geometry?.texSpriteName || 'default'
  const shape = 'texture'
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  // Общий хук: загрузка карт/atlas + crop и anchor/texAspect + uTexCenter
  const { diffuseMap, alphaMap, normalMap, roughnessMap, texAspect, anchorUV } = useLeafTextures(
    texSetId,
    true,
    (sample as any)?.geometry?.texSpriteName,
    () => (materialRef.current as any)?.userData?.uniforms,
  )

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
      const sx = uniformScale * (texAspect || 1)
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
        ref={onMaterialRefPatched}
        {...materialProps}
        // Полностью отключаем вклад IBL для листвы, чтобы исключить паразитный
        // фиолетовый оттенок от HDRI. При необходимости можно сделать настраиваемым.
        envMapIntensity={1}
        // Для режимов с цветовой картой листа избегаем двойного умножения цвета (tint),
        // иначе текстура выглядит темнее. Устанавливаем базовый цвет в белый, когда map активен.
        //color={(sample as any)?.geometry?.shape === 'texture' ? (diffuseMap ? '#ffffff' : (materialProps as any).color) : (materialProps as any).color}
        color={'#FFFFFF'}
        map={diffuseMap || undefined}
        alphaMap={alphaMap || undefined}
        normalMap={normalMap || undefined}
        roughnessMap={roughnessMap || undefined}
        // Избегаем общего блендинга с HDRI: используем отсечение по альфе вместо полупрозрачности.
        transparent={false}
        alphaToCoverage={true}
      />
    </instancedMesh>
  )
}

export default InstancedLeavesOE
