import type { GfxTerrainOp } from '@/entities/terrain'
import type { GfxTerrainOpRecipe } from '@/entities/terrain'
import { pickFromNumberOrRange, randAngle } from '../utils/PRNGUtils'
import { autoModeForKind } from '../utils/TerrainUtils'

/**
 * Промежуточный тип «черновика» операции — все поля кроме id.
 * Используется шаблонами для генерации набора операций из одного центра.
 */
export type GfxTerrainOpDraft = Omit<GfxTerrainOp, 'id'>

/**
 * Сгенерировать массив операций для одной «центральной» точки по рецепту.
 *
 * В зависимости от вида (kind) рецепт может порождать одну или несколько
 * операций (например, crater → выемка + вал; terrace → несколько концентрических).
 *
 * @param recipe — рецепт операции
 * @param center — центр размещения [x,z] в мировых координатах
 * @param rng — детерминированный генератор [0..1)
 * @param intensityScale — глобальный множитель интенсивности (по умолчанию 1)
 */
export function buildOpsForPoint(
  recipe: GfxTerrainOpRecipe,
  center: [number, number],
  rng: () => number,
  intensityScale = 1,
): GfxTerrainOpDraft[] {
  const baseRadius = pickFromNumberOrRange(rng, recipe.radius)
  const aspect = recipe.aspect ? pickFromNumberOrRange(rng, recipe.aspect) : 1
  const radiusX = baseRadius
  const radiusZ = baseRadius * aspect
  const intensity = pickFromNumberOrRange(rng, recipe.intensity) * intensityScale
  const rotation = recipe.rotation ? randAngle(rng, recipe.rotation) : 0
  const falloff = recipe.falloff || 'smoothstep'

  const resolvedMode = (recipe.mode && recipe.mode !== 'auto')
    ? recipe.mode
    : autoModeForKind(recipe.kind)

  switch (recipe.kind) {
    case 'hill':
    case 'basin':
    case 'dune':
    case 'plateau': {
      // Одна эллиптическая операция
      return [{
        mode: resolvedMode,
        center,
        radius: radiusX,
        radiusZ,
        intensity: Math.abs(intensity),
        falloff,
        rotation,
      }]
    }
    case 'valley':
    case 'ridge': {
      // Серия эллипсов вдоль линии через центр (псевдо‑штрих), если задан step.
      // Если step не задан — генерируем один эллипс как fallback.
      const step = recipe.step && recipe.step > 0 ? recipe.step : 0
      const ops: GfxTerrainOpDraft[] = []
      if (!step) {
        ops.push({
          mode: resolvedMode,
          center,
          radius: radiusX,
          radiusZ,
          intensity: Math.abs(intensity),
          falloff,
          rotation,
        })
        return ops
      }
      // Строим 5 точек вдоль направления rotation (или случайного, если rotation=0)
      const dirAngle = rotation || randAngle(rng)
      const halfCount = 2
      for (let i = -halfCount; i <= halfCount; i++) {
        const dx = Math.cos(dirAngle) * step * i
        const dz = Math.sin(dirAngle) * step * i
        ops.push({
          mode: resolvedMode,
          center: [center[0] + dx, center[1] + dz],
          radius: radiusX,
          radiusZ,
          intensity: Math.abs(intensity),
          falloff,
          rotation: dirAngle,
        })
      }
      return ops
    }
    case 'crater': {
      // Кратер: центральная выемка (sub) + внешний вал (add)
      const innerR = baseRadius * 0.7
      const outerR = baseRadius * 1.25
      const ringIntensity = Math.abs(intensity) * 0.6
      const pitIntensity = Math.abs(intensity)
      const ringRotation = rotation
      const ringAspect = aspect
      return [
        {
          mode: 'sub',
          center,
          radius: innerR,
          radiusZ: innerR * ringAspect,
          intensity: pitIntensity,
          falloff,
          rotation,
        },
        {
          mode: 'add',
          center,
          radius: outerR,
          radiusZ: outerR * ringAspect,
          intensity: ringIntensity,
          falloff,
          rotation: ringRotation,
        },
      ]
    }
    case 'terrace': {
      // Террасы: несколько концентрических «ступеней», mix set/add
      const rings = 4
      const ops: GfxTerrainOpDraft[] = []
      for (let i = 0; i < rings; i++) {
        const t = (rings - i) / rings
        const r = baseRadius * t
        const ringInt = Math.abs(intensity) * (0.9 - i * 0.15)
        ops.push({
          mode: i % 2 === 0 ? 'set' : 'add',
          center,
          radius: r,
          radiusZ: r * aspect,
          intensity: ringInt,
          falloff,
          rotation,
        })
      }
      return ops
    }
    default: {
      const allowed = ['hill','basin','ridge','valley','crater','plateau','terrace','dune']
      throw new Error(
        `Неподдерживаемый recipe.kind: '${(recipe as any)?.kind}'. Ожидалось одно из: ${allowed.join(', ')}.`
      )
    }
  }
}
