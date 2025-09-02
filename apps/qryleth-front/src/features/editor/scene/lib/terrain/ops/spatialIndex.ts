import type { GfxTerrainOp } from '@/entities/terrain'

/**
 * Строит простой равномерный пространственный индекс для операций террейна.
 * Каждая операция попадает во все ячейки сетки (cellSize), которые пересекают
 * её ограничивающий прямоугольник по радиусу. Это ускоряет поиск релевантных
 * операций при семплинге высот.
 *
 * @param ops — массив операций
 * @param cellSize — размер ячейки индекса (в мировых единицах)
 * @returns Map ключ->массив операций, где ключ — строка "cx,cz"
 */
export function buildSpatialIndex(
  ops: GfxTerrainOp[],
  cellSize: number
): Map<string, GfxTerrainOp[]> {
  const index = new Map<string, GfxTerrainOp[]>()
  for (const op of ops) {
    const maxRadius = Math.max(op.radius, op.radiusZ || op.radius)
    const minX = op.center[0] - maxRadius
    const maxX = op.center[0] + maxRadius
    const minZ = op.center[1] - maxRadius
    const maxZ = op.center[1] + maxRadius

    const startCellX = Math.floor(minX / cellSize)
    const endCellX = Math.floor(maxX / cellSize)
    const startCellZ = Math.floor(minZ / cellSize)
    const endCellZ = Math.floor(maxZ / cellSize)

    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cz = startCellZ; cz <= endCellZ; cz++) {
        const key = `${cx},${cz}`
        if (!index.has(key)) index.set(key, [])
        index.get(key)!.push(op)
      }
    }
  }
  return index
}

/**
 * Возвращает операции, потенциально влияющие на точку (x,z), используя
 * ранее построенный пространственный индекс.
 *
 * @param index — пространственный индекс (см. buildSpatialIndex)
 * @param cellSize — размер ячейки индекса (в мировых единицах)
 * @param x — мировая координата X
 * @param z — мировая координата Z
 */
export function getRelevantOps(
  index: Map<string, GfxTerrainOp[]>,
  cellSize: number,
  x: number,
  z: number
): GfxTerrainOp[] {
  const cx = Math.floor(x / cellSize)
  const cz = Math.floor(z / cellSize)
  const key = `${cx},${cz}`
  return index.get(key) || []
}

