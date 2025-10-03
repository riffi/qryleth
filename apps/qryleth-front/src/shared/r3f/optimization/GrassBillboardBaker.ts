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

/** Набор из трёх текстур травы, запечённых под углами 0/120/240 градусов. */
export interface GrassBillboardSetData {
  textures: [THREE.Texture, THREE.Texture, THREE.Texture]
  normalTextures: [THREE.Texture, THREE.Texture, THREE.Texture]
  heightWorld: number
  widthWorlds: [number, number, number]
  baseOffsetY: number
}

/**
 * Внутренний in‑memory кэш запечённых текстур травы.
 * Ключ: `objectUuid|paletteUuid|CACHE_VERSION`.
 * При изменении алгоритма запекания необходимо повышать версию, чтобы сбрасывать устаревшие значения.
 */
const cache = new Map<string, GrassBillboardData>()
const cacheSet = new Map<string, GrassBillboardSetData>()
const inflight = new Map<string, Promise<GrassBillboardData | null>>()
const inflightSet = new Map<string, Promise<GrassBillboardSetData | null>>()
const CACHE_VERSION = 'v2'
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
    // Для совместимости строим сет и берём нулевой угол
    const set = await getOrCreateGrassBillboardSet(object, paletteUuid)
    if (!set) return null
    const data: GrassBillboardData = { texture: set.textures[0], heightWorld: set.heightWorld, widthWorld: set.widthWorlds[0], baseOffsetY: set.baseOffsetY }
    cache.set(k, data)
    return data
  })()

  inflight.set(k, task)
  const res = await task
  inflight.delete(k)
  return res
}

/**
 * Создаёт (или возвращает из кэша) набор из 3 текстур травы под углами 0/120/240 градусов.
 */
export async function getOrCreateGrassBillboardSet(object: SceneObject, paletteUuid: string): Promise<GrassBillboardSetData | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  const k = keyOf(object, paletteUuid)
  const cached = cacheSet.get(k)
  if (cached) return cached
  const infl = inflightSet.get(k)
  if (infl) return await infl

  const task = (async (): Promise<GrassBillboardSetData | null> => {
    // 1) Сцена/свет/контейнер
    const scene = new THREE.Scene()
    scene.background = null
    scene.add(new THREE.AmbientLight(0xffffff, 1))
    const dir = new THREE.DirectionalLight(0xffffff, 1)
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
      const mat = new THREE.MeshBasicMaterial({
        color: (props as any)?.color || '#2E8B57',
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

    const heightPx = 1024
    const padPx = 0
    renderer.setSize(heightPx + padPx*2, heightPx + padPx*2)
    renderer.setClearColor(0xFFFFFF, 0.0)
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
    // Функция замера ширины по текущему углу и отрисовки в CanvasTexture
    const captureAtCurrentYaw = (yawRad: number): { texture: THREE.Texture; normalTexture: THREE.Texture; widthWorld: number } => {
      // 1) Замер ширины по альфа
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
      const widthPx = (maxX >= minX) ? (maxX - minX + 1) : 1
      const widthWorld = (widthPx / (rt.width)) * (cam.right - cam.left)

      // 2) Финальный фронтальный рендер в целевой размер
      const outH = heightPx + padPx*2
      const outW = Math.max(64, Math.min(1024, Math.round(outH * (widthWorld/heightWorld))))
      const SSAA = 4
      const hiW = outW * SSAA
      const hiH = outH * SSAA
      renderer.setSize(hiW, hiH)
      const outRT = new THREE.WebGLRenderTarget(hiW, hiH, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false })
      renderer.setRenderTarget(outRT)
      renderer.clear(); renderer.render(scene, cam)
      const pixelsOut = new Uint8Array(hiW*hiH*4)
      renderer.readRenderTargetPixels(outRT, 0, 0, hiW, hiH, pixelsOut)
      // Источник высокого разрешения
      const srcCanvas = document.createElement('canvas')
      srcCanvas.width = hiW; srcCanvas.height = hiH
      const srcCtx = srcCanvas.getContext('2d')!
      const srcImage = new ImageData(new Uint8ClampedArray(pixelsOut), hiW, hiH)
      srcCtx.putImageData(srcImage, 0, 0)
      // Целевой канвас с итоговым размером (downsample с фильтрацией)
      const canvas = document.createElement('canvas')
      canvas.width = outW; canvas.height = outH
      const ctx = canvas.getContext('2d')!
      ;(ctx as any).imageSmoothingEnabled = true
      ;(ctx as any).imageSmoothingQuality = 'high'
      ctx.drawImage(srcCanvas, 0, 0, outW, outH)
      const texture = new THREE.CanvasTexture(canvas)
      texture.flipY = true
      ;(texture as any).colorSpace = (THREE as any).SRGBColorSpace || (texture as any).colorSpace
      texture.generateMipmaps = true
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.anisotropy = 8
      texture.needsUpdate = true
      outRT.dispose()
      // ===== Нормальный проход =====
      const meshes: THREE.Mesh[] = []
      group.traverse(obj => { if ((obj as any).isMesh) meshes.push(obj as THREE.Mesh) })
      const originals = meshes.map(m => m.material as THREE.Material)
      const uRight = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), yawRad)
      const uUp = new THREE.Vector3(0,1,0)
      const uFwd = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), yawRad)
      const normMat = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        vertexShader: `
          varying vec3 vWorldNormal;
          void main(){
            mat3 m = mat3(modelMatrix);
            vWorldNormal = normalize(m * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vWorldNormal;
          uniform vec3 uRight; uniform vec3 uUp; uniform vec3 uFwd;
          void main(){
            vec3 n = normalize(vWorldNormal);
            if (!gl_FrontFacing) n = -n;
            float nx = dot(n, normalize(uRight));
            float ny = dot(n, normalize(uUp));
            float nz = dot(n, normalize(uFwd));
            vec3 enc = 0.5 * (vec3(nx, ny, nz) + 1.0);
            gl_FragColor = vec4(enc, 1.0);
          }
        `,
        uniforms: { uRight: { value: uRight }, uUp: { value: uUp }, uFwd: { value: uFwd } }
      })
      meshes.forEach(m => { (m as any).material = normMat })
      const outRTn = new THREE.WebGLRenderTarget(hiW, hiH, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false })
      renderer.setRenderTarget(outRTn)
      renderer.clear(); renderer.render(scene, cam)
      const pixelsN = new Uint8Array(hiW*hiH*4)
      renderer.readRenderTargetPixels(outRTn, 0, 0, hiW, hiH, pixelsN)
      const srcCanvasN = document.createElement('canvas')
      srcCanvasN.width = hiW; srcCanvasN.height = hiH
      const srcCtxN = srcCanvasN.getContext('2d')!
      const srcImageN = new ImageData(new Uint8ClampedArray(pixelsN), hiW, hiH)
      srcCtxN.putImageData(srcImageN, 0, 0)
      const canvasN = document.createElement('canvas')
      canvasN.width = outW; canvasN.height = outH
      const ctxN = canvasN.getContext('2d')!
      ;(ctxN as any).imageSmoothingEnabled = true
      ;(ctxN as any).imageSmoothingQuality = 'high'
      ctxN.drawImage(srcCanvasN, 0, 0, outW, outH)
      const normalTexture = new THREE.CanvasTexture(canvasN)
      normalTexture.flipY = true
      ;(normalTexture as any).colorSpace = (THREE as any).NoColorSpace || (normalTexture as any).colorSpace
      normalTexture.generateMipmaps = true
      normalTexture.minFilter = THREE.LinearMipmapLinearFilter
      normalTexture.magFilter = THREE.LinearFilter
      normalTexture.anisotropy = 8
      normalTexture.needsUpdate = true
      outRTn.dispose()
      // restore materials
      meshes.forEach((m, i) => { (m as any).material = originals[i] })
      return { texture, normalTexture, widthWorld }
    }

    // Снимаем три угла: 0°, 120°, 240°
    const angles = [0, 120, 240]
    const textures: THREE.Texture[] = []
    const normalTextures: THREE.Texture[] = []
    const widths: number[] = []
    for (let i = 0; i < 3; i++) {
      const yaw = THREE.MathUtils.degToRad(angles[i])
      group.rotation.set(0, yaw, 0)
      const { texture, normalTexture, widthWorld } = captureAtCurrentYaw(yaw)
      textures.push(texture)
      normalTextures.push(normalTexture)
      widths.push(widthWorld)
    }

    // Очистка временных ресурсов (renderer сохраняем)
    rt.dispose()
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

    const data: GrassBillboardSetData = { textures: [textures[0], textures[1], textures[2]] as any, normalTextures: [normalTextures[0], normalTextures[1], normalTextures[2]] as any, heightWorld, widthWorlds: [widths[0], widths[1], widths[2]] as any, baseOffsetY }
    cacheSet.set(k, data)
    return data
  })()

  inflightSet.set(k, task)
  const res = await task
  inflightSet.delete(k)
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
  cacheSet.forEach(set => { try { set.textures.forEach(t => t.dispose()); set.normalTextures.forEach(t => t.dispose()) } catch {} })
  cacheSet.clear()
}
