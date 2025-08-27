import type { GfxTerrainOp, GfxTerrainOpRecipe } from '@/entities/terrain'
import { buildOpsForPoint, type GfxTerrainOpDraft } from './OperationTemplates'
import { deriveRng, randIntRange } from '../utils/PRNGUtils'
import { makeDeterministicOpId } from '../utils/TerrainUtils'

/**
 * Генерирует массив операций (`GfxTerrainOp`) для набора точек согласно рецепту.
 *
 * На вход подаются готовые центры (результат алгоритмов размещения). Для
 * каждого центра шаблон может создать одну или несколько операций. Идентификаторы
 * присваиваются детерминированно из отдельного подпотока PRNG.
 *
 * @param recipe — рецепт генерации операций
 * @param points — центры в мировых координатах [x,z]
 * @param seed — базовый seed для детерминированности
 * @param opts — опции, в т.ч. глобальный множитель интенсивности
 */
export function generateOpsForRecipeAtPoints(
  recipe: GfxTerrainOpRecipe,
  points: Array<[number, number]>,
  seed: number,
  opts?: { intensityScale?: number }
): GfxTerrainOp[] {
  const intensityScale = opts?.intensityScale ?? 1
  const idRng = deriveRng(seed, 'op_ids')
  let idCounter = 0

  const result: GfxTerrainOp[] = []
  for (let i = 0; i < points.length; i++) {
    const rng = deriveRng(seed, `pt_${i}`)
    const drafts: GfxTerrainOpDraft[] = buildOpsForPoint(recipe, points[i], rng, intensityScale)
    for (const d of drafts) {
      const nextInt = randIntRange(idRng, 0, 0x7fffffff) ^ (idCounter++ << 1)
      result.push({
        id: makeDeterministicOpId(nextInt),
        ...d,
      })
    }
  }
  return result
}

