/**
 * Выполняет билинейную интерполяцию по полю высот (Float32Array),
 * представляющему решетку width x height. Предполагается, что значения
 * высот нормализованы в диапазоне [0..1].
 *
 * @param heights — массив высот длиной width*height
 * @param width — ширина решетки
 * @param height — высота решетки
 * @param pixelX — X-координата в «пиксельном» пространстве (может быть дробной)
 * @param pixelY — Y-координата в «пиксельном» пространстве (может быть дробной)
 * @returns интерполированное значение высоты в диапазоне [0..1]
 */
export function sampleHeightsFieldBilinear(
  heights: Float32Array,
  width: number,
  height: number,
  pixelX: number,
  pixelY: number
): number {
  const x0 = Math.floor(pixelX)
  const y0 = Math.floor(pixelY)
  const x1 = Math.min(x0 + 1, width - 1)
  const y1 = Math.min(y0 + 1, height - 1)

  const wx = pixelX - x0
  const wy = pixelY - y0

  const idx = (xx: number, yy: number) => yy * width + xx
  const h00 = heights[idx(x0, y0)]
  const h10 = heights[idx(x1, y0)]
  const h01 = heights[idx(x0, y1)]
  const h11 = heights[idx(x1, y1)]

  const h0 = h00 * (1 - wx) + h10 * wx
  const h1 = h01 * (1 - wx) + h11 * wx
  return h0 * (1 - wy) + h1 * wy
}

/**
 * Билинейная интерполяция по ImageData (RGBA), где высота кодируется яркостью.
 * Возвращает нормализованную яркость в диапазоне [0..1].
 *
 * Примечание: функция сама не делает ремаппинг в диапазон [min..max];
 * примените линейное преобразование на стороне вызова при необходимости.
 *
 * @param imageData — пиксельные данные изображения
 * @param pixelX — X-координата в пикселях (дробная)
 * @param pixelY — Y-координата в пикселях (дробная)
 * @returns интерполированная яркость [0..1]
 */
export function sampleImageDataBilinear(
  imageData: ImageData,
  pixelX: number,
  pixelY: number
): number {
  const { data, width, height } = imageData

  const x0 = Math.floor(pixelX)
  const y0 = Math.floor(pixelY)
  const x1 = Math.min(x0 + 1, width - 1)
  const y1 = Math.min(y0 + 1, height - 1)

  const wx = pixelX - x0
  const wy = pixelY - y0

  const luminanceAt = (x: number, y: number): number => {
    const idx = (y * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    // sRGB относительная светимость -> [0..255]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const h00 = luminanceAt(x0, y0)
  const h10 = luminanceAt(x1, y0)
  const h01 = luminanceAt(x0, y1)
  const h11 = luminanceAt(x1, y1)

  const h0 = h00 * (1 - wx) + h10 * wx
  const h1 = h01 * (1 - wx) + h11 * wx
  const interpolated = h0 * (1 - wy) + h1 * wy // [0..255]
  return interpolated / 255
}

