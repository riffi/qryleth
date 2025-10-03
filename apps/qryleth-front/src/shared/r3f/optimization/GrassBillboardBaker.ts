import * as THREE from 'three'
import type { SceneObject } from '@/entities/scene/types'
import { paletteRegistry } from '@/shared/lib/palette'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'

export interface GrassBillboardData {
  /** Итоговая RGBA‑текстура запечённого пучка травы */
  texture: THREE.Texture
  /** Мировая высота плоскости (tight bbox по Y) */
  heightWorld: number
  /** Мировая ширина плоскости (tight bbox по альфа‑маске за 8 углов) */
  widthWorld: number
  /** Смещение pivot→основание (bbox.min.y), чтобы ставить билборд «на землю» */
  baseOffsetY: number
}

/**
 * Внутренний in‑memory кэш запечённых текстур травы.
 * Ключ: `objectUuid|paletteUuid|CACHE_VERSION`.
 * При изменении алгоритма запекания необходимо повышать версию, чтобы сбрасывать устаревшие значения.
 */
const cache = new Map<string, GrassBillboardData>()
const inflight = new Map<string, Promise<GrassBillboardData | null>>()
const CACHE_VERSION = 'v1'
function keyOf(object: SceneObject, paletteUuid: string): string { return `${object.uuid}|${paletteUuid}|${CACHE_VERSION}` }

let _renderer: THREE.WebGLRenderer | null = null
/**
 * Возвращает (или лениво создаёт) offscreen WebGLRenderer для запекания.
 *
 * Особенности:
 * - Включено SRGB‑цветовое пространство и ACES‑тонмаппинг, чтобы совпадать с настройками сцены;
 * - Антиалиас отключён — итог как правило ресемплится, качество достаточно;
 * - Используется одиночный инстанс для экономии памяти/контекста.
 */
function getRenderer(): THREE.WebGLRenderer {
  if (_renderer) return _renderer
  const r = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: false })
  r.setPixelRatio(1)
  _renderer = r
  return r
}

/**
 * Создаёт (или возвращает из кэша) запечённую текстуру пучка травы для заданного объекта и палитры.
 *
 * Алгоритм:
 * 1) Собираем временную сцену: Ambient + Directional свет, группа с мешами травы (p.type === 'mesh');
 * 2) Строим геометрию из `positions/normals/uvs/indices` примитивов, материал резолвим через палитру;
 * 3) Вычисляем tight bbox, поднимаем группу так, чтобы основание оказалось на y=0;
 * 4) Ортокамерой рендерим в offscreen RT, для 8 углов yaw оцениваем ширину по альфа‑каналу;
 * 5) Делаем финальный фронтальный рендер в канвас итогового размера (H фиксирован, W по аспекту);
 * 6) Возвращаем CanvasTexture + размеры в мире; кладём результат в кэш.
 */
export async function getOrCreateGrassBillboard(object: SceneObject, paletteUuid: string): Promise<GrassBillboardData | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  const k = keyOf(object, paletteUuid)
  const cached = cache.get(k)
  if (cached) return cached
  const infl = inflight.get(k)
  if (infl) return await infl

  const task = (async (): Promise<GrassBillboardData | null> => {
    // 1) Сцена/свет/контейнер
    const scene = new THREE.Scene()
    scene.background = null
    scene.add(new THREE.AmbientLight(0xffffff, 5))
    const dir = new THREE.DirectionalLight(0xffffff, 0.5)
    dir.position.set(-10, 12, 10)
    dir.target.position.set(0, 0, 0)
    scene.add(dir); scene.add(dir.target)
    const group = new THREE.Group(); scene.add(group)

    // 2) Сборка геометрий травы (ожидается один mesh‑примитив пучка, но поддержим несколько)
    const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')
    for (const p of (object.primitives || [])) {
      if (p.type !== 'mesh' || !p.geometry?.positions) continue
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p.geometry.positions), 3))
      if (p.geometry?.normals && p.geometry.normals.length === p.geometry.positions.length) {
        g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(p.geometry.normals), 3))
      } else { g.computeVertexNormals() }
      if (p.geometry?.uvs) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.geometry.uvs), 2))
      if (p.geometry?.indices) g.setIndex(p.geometry.indices)
      g.computeBoundingBox(); g.computeBoundingSphere()

      const matDef = resolveMaterial({
        directMaterial: (p as any).material,
        objectMaterialUuid: (p as any).objectMaterialUuid,
        globalMaterialUuid: (p as any).globalMaterialUuid,
        objectMaterials: (object as any).materials,
      })
      const props = materialToThreePropsWithPalette(matDef, activePalette as any)
      const mat = new THREE.MeshStandardMaterial({
        color: (props as any)?.color || '#2E8B57',
        roughness: (props as any)?.roughness ?? 0.9,
        metalness: (props as any)?.metalness ?? 0.0,
        envMapIntensity: 0.0,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(g, mat)
      const t = (p as any).transform || {}
      mesh.position.set(...(t.position || [0,0,0]))
      mesh.rotation.set(...(t.rotation || [0,0,0]))
      mesh.scale.set(...(t.scale || [1,1,1]))
      group.add(mesh)
    }

    // Если нечего печь — выходим
    if (group.children.length === 0) return null

    // 3) Вычисляем bbox, базу поднимаем на y=0, меряем высоту в мире
    const bbox = new THREE.Box3().setFromObject(group)
    const baseOffsetY = -bbox.min.y
    group.position.y += baseOffsetY
    const heightWorld = Math.max(0.001, (bbox.max.y - bbox.min.y))

    // 4) Настройка рендера/камеры, оценка ширины по 8 углам yaw
    const renderer = getRenderer()
    ;(renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace || (renderer as any).outputEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    ;(renderer as any).toneMappingExposure = 1.0

    const heightPx = 512
    const padPx = 0
    renderer.setSize(heightPx + padPx*2, heightPx + padPx*2)
    renderer.setClearColor(0x000000, 0.0)
    const rt = new THREE.WebGLRenderTarget(heightPx + padPx*2, heightPx + padPx*2, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false })

    // Горизонтальный радиус для ortho‑камеры — по максимальному отступу травинок
    const horizRadius = (() => {
      const b = new THREE.Box3().setFromObject(group)
      const maxX = Math.max(Math.abs(b.min.x), Math.abs(b.max.x))
      const maxZ = Math.max(Math.abs(b.min.z), Math.abs(b.max.z))
      return Math.max(maxX, maxZ) * 1.1
    })()

    const cam = new THREE.OrthographicCamera(-horizRadius, horizRadius, heightWorld/2, -heightWorld/2, 0.1, 1000)
    cam.position.set(0, heightWorld*0.5, horizRadius*2)
    cam.lookAt(0, heightWorld*0.5, 0)

    const yaws = [0, 45, 90, 135, 180, 225, 270, 315]
    let maxWidthPx = 1
    for (const deg of yaws) {
      group.rotation.set(0, THREE.MathUtils.degToRad(deg), 0)
      renderer.setRenderTarget(rt)
      renderer.clear(); renderer.render(scene, cam)
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

    // 5) Финальный фронтальный рендер в канвас целевого размера
    group.rotation.set(0, 0, 0)
    const outH = heightPx + padPx*2
    const outW = Math.max(64, Math.min(1024, Math.round(outH * (widthWorld/heightWorld))))
    renderer.setSize(outW, outH)
    const outRT = new THREE.WebGLRenderTarget(outW, outH, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false })
    renderer.setRenderTarget(outRT)
    renderer.clear(); renderer.render(scene, cam)

    const pixelsOut = new Uint8Array(outW*outH*4)
    renderer.readRenderTargetPixels(outRT, 0, 0, outW, outH, pixelsOut)
    const canvas = document.createElement('canvas')
    canvas.width = outW; canvas.height = outH
    const ctx = canvas.getContext('2d')!
    const imageData = new ImageData(new Uint8ClampedArray(pixelsOut), outW, outH)
    ctx.putImageData(imageData, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    // Переворот для соответствия укладке «основание снизу»
    texture.flipY = true
    ;(texture as any).colorSpace = (THREE as any).SRGBColorSpace || (texture as any).colorSpace
    texture.needsUpdate = true

    // 6) Очистка временных ресурсов
    rt.dispose(); outRT.dispose()
    try {
      // Пройтись по дочерним и освободить материалы/геометрии
      for (const ch of group.children) {
        const m = (ch as any).material as THREE.Material | undefined
        const g = (ch as any).geometry as THREE.BufferGeometry | undefined
        try { m?.dispose?.() } catch {}
        try { g?.dispose?.() } catch {}
      }
    } catch {}
    group.clear(); scene.clear()

    const data: GrassBillboardData = { texture, heightWorld, widthWorld, baseOffsetY }
    cache.set(k, data)
    return data
  })()

  inflight.set(k, task)
  const res = await task
  inflight.delete(k)
  return res
}

/**
 * Сбрасывает кэш запечённых билбордов травы и освобождает связанные CanvasTexture.
 *
 * Вызывать при изменении палитры/материалов/параметров травы, влияющих на итоговую текстуру,
 * чтобы принудить пересборку.
 */
export function invalidateGrassBillboards(): void {
  cache.forEach(v => v.texture.dispose())
  cache.clear()
}

