import * as THREE from 'three'
import type { GfxHeightSampler, GfxTerrainConfig } from '@/entities/terrain'
import { TERRAIN_MAX_SEGMENTS } from '@/features/editor/scene/config/terrain'

/**
 * Построение THREE.js-геометрии террейна на основе сэмплера высот.
 *
 * Метод создаёт плоскую плоскость с количеством сегментов, подобранным
 * под реальное разрешение источника высот (heightmap/perlin), затем
 * модифицирует Y-координату каждой вершины, вызывая `sampler.getHeight(x, z)`.
 * Итоговая геометрия поворачивается в горизонтальную ориентацию и
 * обогащается нормалями/границами для корректного освещения и подбора
 * размеров. Метод не изменяет состояние сэмплера и является чистой
 * функцией построения геометрии.
 *
 * Важно: количество сегментов ограничивается сверху `TERRAIN_MAX_SEGMENTS`
 * и снизу 10, чтобы избежать чрезмерной детализации/«рваности» сетки.
 *
 * @param cfg — конфигурация террейна (размеры мира, источник высот и опции)
 * @param sampler — сэмплер высот, предоставляющий доступ к высоте в любой точке
 * @returns THREE.BufferGeometry, готовая для использования в Mesh
 */
export function buildGfxTerrainGeometry(cfg: GfxTerrainConfig, sampler: GfxHeightSampler): THREE.BufferGeometry {
  // Подбираем число сегментов с учётом реального разрешения источника
  const segments = decideSegments(cfg)

  // Создаём плоскость с одинаковым числом сегментов по X/Z
  // Второй параметр — глубина по оси Z (worldDepth), ранее именовалась worldHeight
  const depth = (cfg as any).worldDepth ?? (cfg as any).worldHeight
  const geom = new THREE.PlaneGeometry(cfg.worldWidth, depth, segments, segments)
  geom.rotateX(-Math.PI / 2) // горизонтальная ориентация (XZ-плоскость)

  const positionArray = geom.attributes.position.array as Float32Array

  // Заполняем высоты: каждые 3 числа — это XYZ одной вершины
  for (let i = 0; i < positionArray.length; i += 3) {
    const x = positionArray[i]
    const z = positionArray[i + 2]
    // Учтём смещение центра: sampler ожидает мировые координаты точки
    const cx = cfg.center?.[0] ?? 0
    const cz = cfg.center?.[1] ?? 0
    positionArray[i + 1] = sampler.getHeight(x + cx, z + cz)
  }

  // Обновляем производные данные геометрии
  geom.attributes.position.needsUpdate = true
  geom.computeVertexNormals()
  geom.computeBoundingBox()

  return geom
}

/**
 * Определение количества сегментов геометрии террейна.
 *
 * Логика привязывает плотность сетки к фактическому разрешению источника:
 * - Heightmap: берём (imgWidth - 1, imgHeight - 1), т.к. количество ячеек
 *   на 1 меньше числа пикселей по каждой оси. Если в дальнейшем будет
 *   доступ к числовому полю высот (heightsField), его размеры аналогично
 *   трактуются как сетка (width-1, height-1).
 * - Perlin: используем размеры сетки шума (width - 1, height - 1).
 * Затем выбираем одно число сегментов для обеих осей — минимум из двух,
 * чтобы не «пересемплировать» более низкую по разрешению ось. Результат
 * ограничивается: нижняя граница ≥ 10, верхняя — `TERRAIN_MAX_SEGMENTS`.
 *
 * @param cfg — конфигурация террейна (даёт доступ к параметрам источника)
 * @returns число сегментов, одинаковое для осей X и Z
 */
export function decideSegments(cfg: GfxTerrainConfig): number {
  let resX: number
  let resZ: number

  if (cfg.source.kind === 'heightmap') {
    // Высокоуровневая оценка сегментов по размеру исходного изображение PNG
    // (imgWidth/imgHeight). В дальнейшем, при наличии числового поля высот,
    // логика остается эквивалентной: количество ячеек = размер - 1.
    resX = Math.max(1, (cfg.source.params.imgWidth ?? 1) - 1)
    resZ = Math.max(1, (cfg.source.params.imgHeight ?? 1) - 1)
  } else {
    // Для Perlin используем размер сетки шума (width/height)
    resX = Math.max(1, (cfg.source.params.width ?? 1) - 1)
    resZ = Math.max(1, (cfg.source.params.height ?? 1) - 1)
  }

  // Единое число сегментов для обеих осей — выбираем минимум, чтобы
  // не создавать лишние (пустые) деления вдоль более низкой по
  // разрешению оси. Далее жёстко ограничиваем диапазон.
  const suggested = Math.min(resX, resZ)
  const clamped = Math.max(10, Math.min(TERRAIN_MAX_SEGMENTS, suggested))
  return clamped
}

