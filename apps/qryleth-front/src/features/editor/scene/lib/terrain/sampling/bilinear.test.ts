import { describe, it, expect } from 'vitest'
import { sampleHeightsFieldBilinear, sampleImageDataBilinear } from './bilinear'

// В некоторых окружениях (Node без jsdom) глобальный ImageData может отсутствовать.
// Фабрика безопасно создаёт ImageData или мок-объект с тем же интерфейсом.
function makeImageData(width: number, height: number): ImageData {
  if (typeof (globalThis as any).ImageData !== 'undefined') {
    return new (globalThis as any).ImageData(width, height)
  }
  const data = new Uint8ClampedArray(width * height * 4)
  return { width, height, data } as any as ImageData
}

/**
 * Тесты билинейной интерполяции: числовое поле высот и ImageData.
 */
describe('sampling/bilinear', () => {
  it('sampleHeightsFieldBilinear: корректность на 2x2 решётке', () => {
    // Решётка 2x2:
    // h00=0  h10=1
    // h01=0  h11=1
    const heights = new Float32Array([
      0, 1,
      0, 1,
    ])
    const width = 2
    const height = 2

    expect(sampleHeightsFieldBilinear(heights, width, height, 0, 0)).toBeCloseTo(0, 6)
    expect(sampleHeightsFieldBilinear(heights, width, height, 1, 0)).toBeCloseTo(1, 6)
    expect(sampleHeightsFieldBilinear(heights, width, height, 0.5, 0.5)).toBeCloseTo(0.5, 6)
  })

  it('sampleImageDataBilinear: корректность на 2x2 PNG яркости', () => {
    const img = makeImageData(2, 2)
    const setPixel = (x: number, y: number, v: number) => {
      const idx = (y * img.width + x) * 4
      img.data[idx] = v
      img.data[idx + 1] = v
      img.data[idx + 2] = v
      img.data[idx + 3] = 255
    }
    // 2x2: 0,255 / 0,255
    setPixel(0, 0, 0)
    setPixel(1, 0, 255)
    setPixel(0, 1, 0)
    setPixel(1, 1, 255)

    expect(sampleImageDataBilinear(img, 0, 0)).toBeCloseTo(0, 6)
    expect(sampleImageDataBilinear(img, 1, 0)).toBeCloseTo(1, 6)
    expect(sampleImageDataBilinear(img, 0.5, 0.5)).toBeCloseTo(0.5, 6)
  })
})
