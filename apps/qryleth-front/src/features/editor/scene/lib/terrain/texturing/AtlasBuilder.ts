import * as THREE from 'three'
import { TERRAIN_TEXTURING_CONFIG } from '@/features/editor/scene/config/terrainTexturing'

/**
 * Описание результата сборки атласов для каналов материала.
 * Возвращается единая схема оффсетов/скейлов для 4 слоёв и 4 CanvasTexture.
 */
export interface BuiltAtlases {
  /** Атлас albedo (sRGB) */
  albedo: THREE.CanvasTexture
  /** Атлас нормалей (линейное пространство) */
  normal: THREE.CanvasTexture
  /** Атлас шероховатости (линейное, монохром) */
  roughness: THREE.CanvasTexture
  /** Атлас AO (линейное, монохром) */
  ao: THREE.CanvasTexture
  /** Смещение для каждого тайла (в UV координатах атласа) */
  tileOffset: Array<[number, number]>
  /** Масштаб для каждого тайла (в UV координатах атласа) */
  tileScale: Array<[number, number]>
}

/**
 * Пара изображений для одного слоя-материала ландшафта.
 * Поля допускают null: при отсутствии карты будет использовано нейтральное значение.
 */
export interface LayerImages {
  /** Источник изображения, совместимый с CanvasRenderingContext2D.drawImage */
  albedo: CanvasImageSource | null
  normal: CanvasImageSource | null
  roughness: CanvasImageSource | null
  ao: CanvasImageSource | null
}

/**
 * Загрузить изображение по URL как HTMLImageElement (для canvas 2d).
 * @param url ссылка на изображение
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/**
 * Создать canvas заданного размера и залить его постоянным цветом RGBA.
 * @param size размер по ширине/высоте (квадрат)
 * @param rgba массив из 4 значений [0..255]
 */
function makeSolidCanvas(size: number, rgba: [number, number, number, number]): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const imgData = ctx.createImageData(size, size)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgba[0]
    data[i + 1] = rgba[1]
    data[i + 2] = rgba[2]
    data[i + 3] = rgba[3]
  }
  ctx.putImageData(imgData, 0, 0)
  return c
}

/**
 * Прорисовать одну картинку в прямоугольник тайла и выполнить "bleed" в padding-зону.
 * @param ctx контекст канваса-атласа
 * @param img источник (HTMLImageElement) или null (будет игнор в отрисовке, т.к. фон уже залит)
 * @param x левый верхний угол тайла (включая padding)
 * @param y верхний край
 * @param w ширина внутренней области (без padding)
 * @param h высота внутренней области (без padding)
 * @param paddingPx размер padding в пикселях
 */
function drawTileWithBleed(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource | null,
  x: number,
  y: number,
  w: number,
  h: number,
  paddingPx: number
) {
  if (img) {
    ctx.drawImage(img, x, y, w, h)
  }
  // Если padding == 0 — ничего не делаем
  if (paddingPx <= 0) return

  // Копируем границы внутреннего квадрата наружу, растягивая до ширины padding
  // Левая и правая полосы (ширина padding)
  ctx.drawImage(ctx.canvas, x, y, 1, h, x - paddingPx, y, paddingPx, h) // left
  ctx.drawImage(ctx.canvas, x + w - 1, y, 1, h, x + w, y, paddingPx, h) // right
  // Верхняя и нижняя полосы (высота padding)
  ctx.drawImage(ctx.canvas, x, y, w, 1, x, y - paddingPx, w, paddingPx) // top
  ctx.drawImage(ctx.canvas, x, y + h - 1, w, 1, x, y + h, w, paddingPx) // bottom
  // Углы — растягиваем 1x1 пиксель
  ctx.drawImage(ctx.canvas, x, y, 1, 1, x - paddingPx, y - paddingPx, paddingPx, paddingPx) // LT
  ctx.drawImage(ctx.canvas, x + w - 1, y, 1, 1, x + w, y - paddingPx, paddingPx, paddingPx) // RT
  ctx.drawImage(ctx.canvas, x, y + h - 1, 1, 1, x - paddingPx, y + h, paddingPx, paddingPx) // LB
  ctx.drawImage(ctx.canvas, x + w - 1, y + h - 1, 1, 1, x + w, y + h, paddingPx, paddingPx) // RB
}

/**
 * Прорисовать изображение, повторяя его repX/repY раз внутри области w×h.
 * Поддерживает дробные повторы: крайний столбец/ряд обрезается по доле.
 * После заполнения внутренней области bleed выполняется отдельно.
 */
function drawRepeated(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  repX: number,
  repY: number
) {
  const rx = Math.max(1e-4, repX)
  const ry = Math.max(1e-4, repY)
  const baseW = (img as any).width as number
  const baseH = (img as any).height as number
  const cellW = w / rx
  const cellH = h / ry
  const ix = Math.floor(rx)
  const iy = Math.floor(ry)
  const fracX = rx - ix
  const fracY = ry - iy

  // Внутренняя функция отрисовки одной ячейки с учётом обрезки по доле
  const drawCell = (cx: number, cy: number, cw: number, ch: number, sxFrac: number, syFrac: number) => {
    const sw = Math.max(1, Math.floor(baseW * sxFrac))
    const sh = Math.max(1, Math.floor(baseH * syFrac))
    ctx.drawImage(img as any, 0, 0, sw, sh, cx, cy, cw, ch)
  }

  // Полные ячейки по X и Y
  for (let j = 0; j < iy; j++) {
    for (let i = 0; i < ix; i++) {
      drawCell(x + i * cellW, y + j * cellH, cellW, cellH, 1, 1)
    }
    // Дробная колонка справа, если есть
    if (fracX > 1e-6) {
      drawCell(x + ix * cellW, y + j * cellH, cellW * fracX, cellH, fracX, 1)
    }
  }
  // Дробная строка снизу
  if (fracY > 1e-6) {
    for (let i = 0; i < ix; i++) {
      drawCell(x + i * cellW, y + iy * cellH, cellW, cellH * fracY, 1, fracY)
    }
    if (fracX > 1e-6) {
      drawCell(x + ix * cellW, y + iy * cellH, cellW * fracX, cellH * fracY, fracX, fracY)
    }
  }
}

/**
 * Сборка атласов для до 4 слоёв. Используется фиксированная раскладка 2x2.
 * Отсутствующие карты заливаются нейтральными значениями.
 *
 * Возвращает CanvasTexture для каждого канала и оффсеты/скейлы под UV-преобразование.
 * Все CanvasTexture помечаются на генерацию мип-карт согласно конфигу.
 *
 * @param sizePx размер атласа (квадрат, степень двойки)
 * @param layers массив до 4 слоёв с HTMLImageElement для каждого канала
 */
export function buildTextureAtlases(sizePx: number, layers: LayerImages[], repeats?: Array<[number, number]>): BuiltAtlases {
  const cfg = TERRAIN_TEXTURING_CONFIG
  const tiles = cfg.tilesPerAxis
  const tileSize = Math.floor(sizePx / tiles)
  const padding = cfg.paddingPx
  const inner = Math.max(1, tileSize - 2 * padding)

  // Общая схема смещений/масштабов в UV атласа
  const tileOffset: Array<[number, number]> = []
  const tileScale: Array<[number, number]> = []

  // Создаём канвасы для каждого канала и заполняем нейтральным фоном
  const cnvAlbedo = makeSolidCanvas(sizePx, [255, 255, 255, 255])
  const cnvNormal = makeSolidCanvas(sizePx, [128, 128, 255, 255])
  const cnvRough = makeSolidCanvas(sizePx, [255, 255, 255, 255])
  const cnvAO = makeSolidCanvas(sizePx, [255, 255, 255, 255])

  const ctxA = cnvAlbedo.getContext('2d')!
  const ctxN = cnvNormal.getContext('2d')!
  const ctxR = cnvRough.getContext('2d')!
  const ctxO = cnvAO.getContext('2d')!
  // Отключаем сглаживание при масштабировании, чтобы края тайла оставались строго периодическими
  ctxA.imageSmoothingEnabled = false
  ctxN.imageSmoothingEnabled = false
  ctxR.imageSmoothingEnabled = false
  ctxO.imageSmoothingEnabled = false

  // Фиксированная раскладка 2x2: индексы слоёв 0..3 → (ix, iy)
  for (let i = 0; i < Math.min(4, layers.length); i++) {
    const ix = i % tiles
    const iy = Math.floor(i / tiles)
    const x0 = ix * tileSize + padding
    const y0 = iy * tileSize + padding

    const li = layers[i]
    const rep = repeats?.[i] || [1, 1]
    // Базовое «нативное» разрешение слоя (предпочтение albedo, иначе любой канал)
    const wh = (() => {
      const src = li.albedo || li.normal || li.roughness || li.ao
      const w = Math.max(1, Number((src as any)?.width ?? 0))
      const h = Math.max(1, Number((src as any)?.height ?? 0))
      return [w, h] as const
    })()
    const desiredPx = Math.max(Math.ceil(wh[0] * rep[0]), Math.ceil(wh[1] * rep[1]))
    const usePx = Math.min(inner, desiredPx)
    const margin = Math.max(0, Math.floor((inner - usePx) / 2))
    // Сохраняем UV-преобразование для данного слота так, чтобы выборка шла по центральной области usePx×usePx
    tileOffset[i] = [ (ix * tileSize + padding + margin) / sizePx, (iy * tileSize + padding + margin) / sizePx ]
    tileScale[i] = [ usePx / sizePx, usePx / sizePx ]
    const drawX = x0 + margin
    const drawY = y0 + margin
    const padTotal = padding + margin
    if (li.albedo) {
      drawRepeated(ctxA, li.albedo, drawX, drawY, usePx, usePx, rep[0], rep[1])
      drawTileWithBleed(ctxA, null, drawX, drawY, usePx, usePx, padTotal)
    }
    if (li.normal) {
      drawRepeated(ctxN, li.normal, drawX, drawY, usePx, usePx, rep[0], rep[1])
      drawTileWithBleed(ctxN, null, drawX, drawY, usePx, usePx, padTotal)
    }
    if (li.roughness) {
      drawRepeated(ctxR, li.roughness, drawX, drawY, usePx, usePx, rep[0], rep[1])
      drawTileWithBleed(ctxR, null, drawX, drawY, usePx, usePx, padTotal)
    }
    if (li.ao) {
      drawRepeated(ctxO, li.ao, drawX, drawY, usePx, usePx, rep[0], rep[1])
      drawTileWithBleed(ctxO, null, drawX, drawY, usePx, usePx, padTotal)
    }
  }

  const tA = new THREE.CanvasTexture(cnvAlbedo)
  const tN = new THREE.CanvasTexture(cnvNormal)
  const tR = new THREE.CanvasTexture(cnvRough)
  const tO = new THREE.CanvasTexture(cnvAO)

  // Поведение текстур: повторение, мипы, цветовое пространство
  for (const t of [tA, tN, tR, tO]) {
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.generateMipmaps = TERRAIN_TEXTURING_CONFIG.generateMipmaps
    t.minFilter = TERRAIN_TEXTURING_CONFIG.generateMipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter
    t.magFilter = THREE.LinearFilter
    // Небольшой анизотропный фильтр для уменьшения артефактов под углом
    ;(t as any).anisotropy = Math.max( (t as any).anisotropy || 0, 4 )
    t.needsUpdate = true
  }
  // Albedo — sRGB
  ;(tA as any).colorSpace = (THREE as any).SRGBColorSpace || (THREE as any).sRGBEncoding

  return { albedo: tA, normal: tN, roughness: tR, ao: tO, tileOffset, tileScale }
}
