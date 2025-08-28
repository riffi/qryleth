import type { GfxTerrainOp, GfxTerrainOpRecipe } from '@/entities/terrain'
import { buildOpsForPoint, type GfxTerrainOpDraft, type FrozenRecipeParams } from './OperationTemplates'
import { deriveRng, randIntRange } from '../utils/PRNGUtils'
import { pickFromNumberOrRange, randAngle } from '../utils/PRNGUtils'
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
    // При lockParams фиксируем параметры один раз на рецепт и применяем ко всем точкам
    let frozen: FrozenRecipeParams | undefined
    if ((recipe as any).lockParams) {
      const frng = deriveRng(seed, 'frozen_recipe_params')
      const radius = pickFromNumberOrRange(frng, recipe.radius)
      const aspect = recipe.aspect ? pickFromNumberOrRange(frng, recipe.aspect) : 1
      const intensity = pickFromNumberOrRange(frng, recipe.intensity)
      const rotation = recipe.rotation
        ? randAngle(frng, recipe.rotation)
        : (recipe as any).randomRotationEnabled
          ? randAngle(frng)
          : 0
      const falloff = recipe.falloff
      const flatInner = (recipe as any).flatInner
      frozen = { radius, aspect, intensity, rotation, falloff, flatInner }
    }
    const drafts: GfxTerrainOpDraft[] = buildOpsForPoint(recipe, points[i], rng, intensityScale, frozen)
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
