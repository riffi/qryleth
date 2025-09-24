import * as THREE from 'three'
import type { SceneObject } from '@/entities/scene/types'
import { paletteRegistry } from '@/shared/lib/palette'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import { leafTextureRegistry } from '@/shared/lib/textures'
import { patchLeafMaterial } from '@/shared/r3f/leaves/patchLeafMaterial'
import { defaultTreeLodConfig } from '@/shared/r3f/optimization/treeLod'

export interface TreeBillboardData {
  /** Итоговая текстура RGBA (цвет + альфа) запечённого дерева */
  texture: THREE.Texture
  /** Мировая высота плоскости (берём из treeData.metrics.height) */
  heightWorld: number
  /** Мировая ширина плоскости (tight bbox по альфа‑маске) */
  widthWorld: number
  /** Зарезервировано: смещение pivot→основание (не используется при укладке) */
  baseOffsetY: number
}

/** Простой in‑memory кэш по ключу objectUuid|paletteUuid */
const billboardCache = new Map<string, TreeBillboardData>()
const CACHE_VERSION = 'v3'
function cacheKey(object: SceneObject, paletteUuid: string): string { return `${object.uuid}|${paletteUuid}|${CACHE_VERSION}` }

// Реиспользуем единый offscreen WebGLRenderer, чтобы не плодить контексты.
let _bakeRenderer: THREE.WebGLRenderer | null = null
function getBakeRenderer(): THREE.WebGLRenderer {
  if (_bakeRenderer) return _bakeRenderer
  const r = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: false })
  r.setPixelRatio(1)
  _bakeRenderer = r
  return r
}

/**
 * Запекает текстуру дерева в offscreen WebGL (ортокамера, ambient + directional),
 * с учётом текстурной листвы (map/alphaMap/atlas) и палитры. Подбирает ширину по
 * tight bbox альфа‑маски по 8 углам yaw; хранит один фронтальный снимок.
 */
export async function getOrCreateTreeBillboard(object: SceneObject, paletteUuid: string): Promise<TreeBillboardData | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  const key = cacheKey(object, paletteUuid)
  const existing = billboardCache.get(key)
  if (existing) return existing

  // Высота для билборда возьмём из реальной сцены (bbox), а не из metrics,
  // чтобы избежать рассинхрона. Значение metrics можно использовать как fallback.
  const metricsHeight: number = (object as any)?.treeData?.metrics?.height || 0

  // Сцена для бэйка
  const scene = new THREE.Scene()
  scene.background = null
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dir = new THREE.DirectionalLight(0xffffff, 1)
  dir.position.set(-10, 12, 10)
  dir.target.position.set(0, 0, 0)
  scene.add(dir); scene.add(dir.target)
  const group = new THREE.Group(); scene.add(group)

  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  // Ствол/ветви — поддержка mesh‑примитивов (единый меш коры)
  for (const p of (object.primitives || [])) {
    if (p.type === 'mesh' && p.geometry?.positions) {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p.geometry.positions), 3))
      if (p.geometry?.normals && p.geometry.normals.length === p.geometry.positions.length) {
        g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(p.geometry.normals), 3))
      } else { g.computeVertexNormals() }
      if (p.geometry?.uvs) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.geometry.uvs), 2))
      if (p.geometry?.indices) g.setIndex(p.geometry.indices)
      g.computeBoundingBox(); g.computeBoundingSphere()

      const matDef = resolveMaterial({
        directMaterial: p.material,
        objectMaterialUuid: p.objectMaterialUuid,
        globalMaterialUuid: p.globalMaterialUuid,
        objectMaterials: object.materials,
      })
      const props = materialToThreePropsWithPalette(matDef, activePalette as any)
      const mat = new THREE.MeshStandardMaterial({
        color: (props as any).color,
        roughness: (props as any).roughness ?? 0.8,
        metalness: (props as any).metalness ?? 0.0,
        envMapIntensity: 0,
        side: THREE.FrontSide,
      })
      const mesh = new THREE.Mesh(g, mat)
      const t = p.transform || {}
      mesh.position.set(...(t.position || [0,0,0]))
      mesh.rotation.set(...(t.rotation || [0,0,0]))
      mesh.scale.set(...(t.scale || [1,1,1]))
      group.add(mesh)
    }
  }

  // Листья (отдаём приоритет 'texture')
  const leavesAll = (object.primitives || []).filter(pr => pr.type === 'leaf') as any[]
  // Упрощаем дерево для билборда так же, как в дальнем LOD: реже, но крупнее
  const ratio = Math.max(0, Math.min(1, defaultTreeLodConfig.farLeafSampleRatio))
  const scaleMulLOD = defaultTreeLodConfig.farLeafScaleMul || 1
  const hashToUnit = (s: string): number => { let h = 2166136261 >>> 0; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h=Math.imul(h,16777619) } return (h>>>0)/4294967295 }
  const leaves = (ratio >= 0.999)
    ? leavesAll
    : leavesAll.filter(l => {
        const id = (l as any)?.uuid || (l as any)?.name || 'leaf'
        return hashToUnit(String(id)) <= ratio
      })
  if (leaves.length === 0) return null
  const hasTextureLeaf = leaves.some(l => (l.geometry?.shape === 'texture') || (l.geometry?.texSpriteName))
  const effectiveShape: 'texture' | 'billboard' | 'coniferCross' = hasTextureLeaf ? 'texture' : (leaves.some(l => l.geometry?.shape === 'coniferCross') ? 'coniferCross' : 'billboard')

  const geometry = new THREE.PlaneGeometry(1, 1)
  geometry.translate(0, 0.5, 0)

  const sampleLeaf = leaves[0]
  const matLeafDef = resolveMaterial({
    directMaterial: sampleLeaf.material,
    objectMaterialUuid: sampleLeaf.objectMaterialUuid,
    globalMaterialUuid: sampleLeaf.globalMaterialUuid,
    objectMaterials: object.materials,
  })
  const leafProps = materialToThreePropsWithPalette(matLeafDef, activePalette as any)
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',//(leafProps as any).color,
    roughness: 0.8,
    metalness: 0.0,
    envMapIntensity: 0,
    transparent: false,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  })

  let texAspect = 1
  let anchorUV: [number, number] | null = null
  if (effectiveShape === 'texture') {
    const texSetId: string | undefined = (object as any)?.treeData?.params?.leafTextureSetId
    const spriteName: string | undefined = (sampleLeaf?.geometry?.texSpriteName) || undefined
    const set = (texSetId && leafTextureRegistry.get(texSetId)) || leafTextureRegistry.list()[0]
    if (!set) return null
    const loader = new THREE.TextureLoader()
    const colorMap = await new Promise<THREE.Texture | null>((res) => loader.load(set.colorMapUrl, (t)=>{ (t as any).colorSpace = (THREE as any).SRGBColorSpace || (t as any).colorSpace; t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping; t.generateMipmaps=false; t.minFilter=THREE.LinearFilter; res(t)}, undefined, ()=>res(null)))
    const alphaMap = set.opacityMapUrl ? await new Promise<THREE.Texture | null>((res) => loader.load(set.opacityMapUrl!, (t)=>{ t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping; t.generateMipmaps=false; t.minFilter=THREE.LinearFilter; res(t)}, undefined, ()=>res(null))) : null
    if (!colorMap) return null
    const atlas = set.atlasUrl ? await fetch(set.atlasUrl).then(r=>r.json()).catch(()=>null) : null
    const img: any = colorMap.image
    if (!img || !img.width || !img.height) return null
    const W = img.width, H = img.height
    const rect = (atlas && spriteName) ? (atlas.find((i: any)=>i.name === spriteName) || atlas[0]) : (atlas ? atlas[0] : null)
    if (rect) {
      const repX = rect.width / W
      const repY = rect.height / H
      const offX = rect.x / W
      const offYFlipTrue = 1 - (rect.y + rect.height) / H
      const offYFlipFalse = rect.y / H
      colorMap.repeat.set(repX, repY)
      colorMap.offset.set(offX, colorMap.flipY ? offYFlipTrue : offYFlipFalse)
      if (alphaMap) { alphaMap.repeat.copy(colorMap.repeat); alphaMap.offset.copy(colorMap.offset) }
      texAspect = rect.width / rect.height
      const ax = typeof rect.anchorX === 'number' ? rect.anchorX : (rect.anchor?.x)
      const ay = typeof rect.anchorY === 'number' ? rect.anchorY : (rect.anchor?.y)
      anchorUV = [ Math.min(1, Math.max(0, (ax ?? rect.width*0.5) / rect.width)), Math.min(1, Math.max(0, (ay ?? rect.height) / rect.height)) ]
    } else {
      texAspect = W / H
      anchorUV = [0.5, 1.0]
    }
    leafMat.map = colorMap
    leafMat.alphaMap = alphaMap || undefined
    patchLeafMaterial(leafMat, { shape: 'texture', texAspect, rectDebug: false, edgeDebug: false, leafPaintFactor: (object as any)?.treeData?.params?.leafTexturePaintFactor ?? 0, targetLeafColorLinear: new THREE.Color((leafProps as any).color || '#2E8B57'), backlightStrength: 0, preMultiplyAlpha: false })
  } else {
    patchLeafMaterial(leafMat, { shape: effectiveShape as any, texAspect: 1, rectDebug: false, edgeDebug: false, backlightStrength: 0 })
  }

  const count = leaves.length
  const instanced = new THREE.InstancedMesh(geometry, leafMat, count)
  const aMul = new Float32Array(count); aMul.fill(1)
  ;(instanced.geometry as any).setAttribute('aLeafPaintMul', new THREE.InstancedBufferAttribute(aMul, 1))
  const dummy = new THREE.Object3D()
  for (let k=0;k<leaves.length;k++) {
    const prim = leaves[k]
    const t = prim.transform || {}
    const [px, py, pz] = t.position || [0,0,0]
    const [prx, pry, prz] = t.rotation || [0,0,0]
    const [psx, psy, psz] = t.scale || [1,1,1]
    const r = prim.geometry?.radius || 0.5
    const shapeScaleMul = effectiveShape === 'coniferCross' ? 2.0 : 1.0
    const uniformScale = r * Math.cbrt(Math.abs(psx*psy*psz)) * shapeScaleMul * scaleMulLOD
    const sx = effectiveShape === 'texture' ? uniformScale * (texAspect || 1) : uniformScale
    const sy = uniformScale
    const sz = uniformScale
    dummy.position.set(px, py, pz)
    dummy.rotation.set(prx, pry, prz)
    if (effectiveShape === 'texture') {
      const u = anchorUV?.[0] ?? 0.5
      const v = anchorUV?.[1] ?? 1.0
      const dx = (0.5 - u) * sx
      const dy = (v - 0.5) * sy
      const off = new THREE.Vector3(dx, dy, 0)
      off.applyEuler(new THREE.Euler(prx, pry, prz, 'XYZ'))
      dummy.position.add(off)
    }
    dummy.scale.set(sx, sy, sz)
    dummy.updateMatrix()
    instanced.setMatrixAt(k, dummy.matrix)
  }
  instanced.instanceMatrix.needsUpdate = true
  group.add(instanced)

  // База дерева на y=0 — запоминаем смещение от pivot до основания
  const bbox = new THREE.Box3().setFromObject(group)
  const baseOffsetY = -bbox.min.y
  group.position.y += baseOffsetY
  const heightWorld = Math.max(0.001, bbox.max.y - bbox.min.y) || Math.max(0.001, metricsHeight)

  // Камера ортографическая
  const horizRadius = (() => {
    let maxR = 1
    for (const l of leaves) {
      const t = l.transform || {}
      const [px, , pz] = t.position || [0,0,0]
      const [psx, psy, psz] = t.scale || [1,1,1]
      const r = (l.geometry?.radius || 0.5) * Math.cbrt(Math.abs(psx*psy*psz))
      const d = Math.hypot(px, pz) + r
      maxR = Math.max(maxR, d)
    }
    return maxR * 1.1
  })()

  const heightPx = 512
  const padPx = 0
  const renderer = getBakeRenderer()
  ;(renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace || (renderer as any).outputEncoding
  renderer.toneMapping = THREE.NoToneMapping
  renderer.setSize(heightPx + padPx*2, heightPx + padPx*2)
  renderer.setClearColor(0x000000, 0.0)
  const rt = new THREE.WebGLRenderTarget(heightPx + padPx*2, heightPx + padPx*2, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false })

  const cam = new THREE.OrthographicCamera(-horizRadius, horizRadius, heightWorld/2, -heightWorld/2, 0.1, 1000)
  cam.position.set(0, heightWorld*0.5, horizRadius*2)
  cam.lookAt(0, heightWorld*0.5, 0)

  // Оценка максимальной ширины по 8 углам yaw
  const yaws = [0, 45, 90, 135, 180, 225, 270, 315]
  let maxWidthPx = 1
  for (const deg of yaws) {
    group.rotation.set(0, THREE.MathUtils.degToRad(deg), 0)
    renderer.setRenderTarget(rt)
    renderer.clear()
    renderer.render(scene, cam)
    const w = rt.width, h = rt.height
    const pixels = new Uint8Array(w*h*4)
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, pixels)
    let minX = w, maxX = -1
    for (let y=0;y<h;y++) {
      for (let x=0;x<w;x++) {
        const a = pixels[(y*w + x)*4 + 3]
        if (a > 0) { if (x < minX) minX = x; if (x > maxX) maxX = x }
      }
    }
    if (maxX >= minX) {
      const widthPx = (maxX - minX + 1)
      if (widthPx > maxWidthPx) maxWidthPx = widthPx
    }
  }

  const widthWorld = (maxWidthPx / (rt.width)) * (cam.right - cam.left)

  // Финальный фронтальный рендер в целевой размер
  group.rotation.set(0, 0, 0)
  const outH = heightPx + padPx*2
  const outW = Math.max(64, Math.min(1024, Math.round(outH * (widthWorld/heightWorld))))
  renderer.setSize(outW, outH)
  const outRT = new THREE.WebGLRenderTarget(outW, outH, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false })
  renderer.setRenderTarget(outRT)
  renderer.clear()
  renderer.render(scene, cam)

  const pixelsOut = new Uint8Array(outW*outH*4)
  renderer.readRenderTargetPixels(outRT, 0, 0, outW, outH, pixelsOut)
  const canvas = document.createElement('canvas')
  canvas.width = outW; canvas.height = outH
  const ctx = canvas.getContext('2d')!
  const imageData = new ImageData(new Uint8ClampedArray(pixelsOut), outW, outH)
  ctx.putImageData(imageData, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  // Переворачиваем текстуру на стадии использования, чтобы итог был «основание снизу»
  texture.flipY = true
  ;(texture as any).colorSpace = (THREE as any).SRGBColorSpace || (texture as any).colorSpace
  texture.needsUpdate = true

  // Очистка временных ресурсов
  // Освобождаем RTs (renderer — singleton, не трогаем контекст)
  rt.dispose(); outRT.dispose()
  // Освобождаем временные ресурсы материалов/геометрий
  try {
    (instanced.material as any)?.map?.dispose?.()
    (instanced.material as any)?.alphaMap?.dispose?.()
  } catch {}
  try { (instanced.material as THREE.Material).dispose() } catch {}
  try { instanced.geometry.dispose() } catch {}
  group.clear(); scene.clear()

  const data: TreeBillboardData = { texture, heightWorld, widthWorld, baseOffsetY }
  billboardCache.set(key, data)
  return data
}

export function invalidateTreeBillboards(): void {
  billboardCache.forEach(v => v.texture.dispose())
  billboardCache.clear()
}
