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
 * Сборка атласов для до 4 слоёв. Используется фиксированная раскладка 2x2.
 * Отсутствующие карты заливаются нейтральными значениями.
 *
 * Возвращает CanvasTexture для каждого канала и оффсеты/скейлы под UV-преобразование.
 * Все CanvasTexture помечаются на генерацию мип-карт согласно конфигу.
 *
 * @param sizePx размер атласа (квадрат, степень двойки)
 * @param layers массив до 4 слоёв с HTMLImageElement для каждого канала
 */
export function buildTextureAtlases(sizePx: number, layers: LayerImages[]): BuiltAtlases {
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

  // Фиксированная раскладка 2x2: индексы слоёв 0..3 → (ix, iy)
  for (let i = 0; i < Math.min(4, layers.length); i++) {
    const ix = i % tiles
    const iy = Math.floor(i / tiles)
    const x0 = ix * tileSize + padding
    const y0 = iy * tileSize + padding
    // Сохраняем UV-преобразование для данного слота
    tileOffset[i] = [ (ix * tileSize + padding) / sizePx, (iy * tileSize + padding) / sizePx ]
    tileScale[i] = [ inner / sizePx, inner / sizePx ]

    const li = layers[i]
    drawTileWithBleed(ctxA, li.albedo, x0, y0, inner, inner, padding)
    drawTileWithBleed(ctxN, li.normal, x0, y0, inner, inner, padding)
    drawTileWithBleed(ctxR, li.roughness, x0, y0, inner, inner, padding)
    drawTileWithBleed(ctxO, li.ao, x0, y0, inner, inner, padding)
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
    t.needsUpdate = true
  }
  // Albedo — sRGB
  ;(tA as any).colorSpace = (THREE as any).SRGBColorSpace || (THREE as any).sRGBEncoding

  return { albedo: tA, normal: tN, roughness: tR, ao: tO, tileOffset, tileScale }
}
