import type { GfxTerrainOp } from '@/entities/terrain'
import type { GfxTerrainOpRecipe } from '@/entities/terrain'
import { pickFromNumberOrRange, randAngle } from '../utils/PRNGUtils'
import { autoModeForKind, autoFalloffForKind } from '../utils/TerrainUtils'

/**
 * Промежуточный тип «черновика» операции — все поля кроме id.
 * Используется шаблонами для генерации набора операций из одного центра.
 */
export type GfxTerrainOpDraft = Omit<GfxTerrainOp, 'id'>

/**
 * «Замороженные» параметры рецепта — позволяют зафиксировать одинаковые
 * значения радиуса/аспекта/интенсивности/поворота/затухания для всех точек.
 */
export type FrozenRecipeParams = Partial<{
  radius: number
  aspect: number
  intensity: number
  rotation: number
  falloff: 'smoothstep' | 'gauss' | 'linear' | 'plateau'
  flatInner: number
}>

/**
 * Вычислить итоговый угол поворота операции с учётом orientation.
 *
 * Правила:
 * - Если orientation не задан — используется прежняя логика (rotation/randomRotationEnabled/0).
 * - orientation может быть строкой ('radial'|'tangent'|'fixed'|'random') или объектом с полями.
 * - Для режимов radial/tangent базовый угол определяется относительно центра (placement.center для ring
 *   либо явно заданного orientation.center). invert меняет направление.
 * - Поле rotation внутри orientation трактуется как «дельта» к базовому углу: число или диапазон.
 * - При lockParams дельта может быть «заморожена» снаружи и передана через frozen.rotation.
 */
function resolveRotation(
  recipe: GfxTerrainOpRecipe,
  center: [number, number],
  rng: () => number,
  frozen?: FrozenRecipeParams,
): number {
  const o: any = (recipe as any).orientation
  if (o) {
    const mode: 'radial' | 'tangent' | 'fixed' | 'random' = typeof o === 'string' ? o : o.mode
    const placementAny: any = recipe.placement as any
    const ringCenter: [number, number] | undefined = placementAny?.type === 'ring' ? placementAny.center : undefined
    const origin: [number, number] | undefined = (typeof o === 'object' && o.center) ? o.center : ringCenter
    const invert: boolean = typeof o === 'object' && o.invert ? true : false

    let base = 0
    if (mode === 'radial' || mode === 'tangent') {
      if (origin) {
        base = Math.atan2(center[1] - origin[1], center[0] - origin[0])
        if (mode === 'tangent') {
          base += invert ? -Math.PI / 2 : Math.PI / 2
        } else {
          base += invert ? Math.PI : 0
        }
      } else {
        base = 0
      }
    }

    // Дельта к базовому углу: frozen.rotation (если lockParams) имеет приоритет,
    // иначе берём из orientation.rotation или из случайного полного круга для 'random'.
    if (frozen && typeof frozen.rotation === 'number') {
      return base + frozen.rotation
    }

    let delta = 0
    if (typeof o === 'object' && o.rotation != null) {
      if (Array.isArray(o.rotation)) {
        const [min, max] = o.rotation
        delta = min + (max - min) * rng()
      } else {
        delta = o.rotation as number
      }
    } else if (mode === 'random') {
      delta = -Math.PI + 2 * Math.PI * rng()
    }
    return base + delta
  }

  // Базовая (прежняя) схема без orientation
  if (frozen && typeof frozen.rotation === 'number') return frozen.rotation
  return (
    recipe.rotation
      ? randAngle(rng, recipe.rotation)
      : (recipe as any).randomRotationEnabled
        ? randAngle(rng)
        : 0
  )
}

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
  frozen?: FrozenRecipeParams,
): GfxTerrainOpDraft[] {
  const baseRadius = (frozen?.radius != null) ? frozen.radius : pickFromNumberOrRange(rng, recipe.radius)
  const aspect = (frozen?.aspect != null)
    ? frozen.aspect
    : (recipe.aspect ? pickFromNumberOrRange(rng, recipe.aspect) : 1)
  const radiusX = baseRadius
  const radiusZ = baseRadius * aspect
  const intensity = ((frozen?.intensity != null)
    ? frozen.intensity
    : pickFromNumberOrRange(rng, recipe.intensity)) * intensityScale
  // ВАЖНО: различаем «угол не задан» и «угол = 0».
  // Если rotation в рецепте не указан — оставляем undefined (случайный угол выберем там, где нужно через ??),
  // если задан — генерируем детерминированный угол из указанного диапазона, включая возможность ровно 0.
  // Вычисляем угол поворота эллипса.
  // Приоритеты:
  // 1) Явно задан `rotation` → угол из указанного диапазона (включая 0).
  // 2) Иначе, если включён `randomRotationEnabled` → случайный угол полного круга.
  // 3) Иначе (по умолчанию) → 0 радиан (ориентация вдоль оси X).
  // Итоговый угол поворота, с учётом orientation (radial/tangent/fixed/random)
  const rotation: number = resolveRotation(recipe, center, rng, frozen)
  // По умолчанию: для plateau → 'plateau'. Для valley без step → тоже 'plateau' (плоское дно).
  // Для остальных типов — 'smoothstep'. Явно заданный falloff имеет приоритет.
  const defaultFalloff: 'smoothstep' | 'gauss' | 'linear' | 'plateau' =
    recipe.kind === 'plateau'
      ? 'plateau'
      : (recipe.kind === 'valley' && !(recipe.step && recipe.step > 0))
        ? 'plateau'
        : autoFalloffForKind(recipe.kind)
  const falloff = frozen?.falloff || recipe.falloff || defaultFalloff
  // Параметр «плоского ядра» для falloff='plateau' (игнорируется для других видов)
  const flatInner = (frozen?.flatInner ?? (recipe as any).flatInner) as number | undefined
  // Автоподстановка: если выбран режим 'plateau' и flatInner не задан — используем дефолт 0.3
  const flatInnerForOp = falloff === 'plateau' ? (flatInner ?? 0.3) : undefined

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
        flatInner: flatInnerForOp,
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
          flatInner: flatInnerForOp,
          rotation,
        })
        return ops
      }
      // Строим 5 точек вдоль направления rotation (или случайного, если rotation=0)
      // Ранее 0 трактовался как ложь и заменялся случайным значением. Теперь 0 — валидный угол.
      const dirAngle = rotation
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
          flatInner: flatInnerForOp,
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
          flatInner: flatInnerForOp,
          rotation,
        },
        {
          mode: 'add',
          center,
          radius: outerR,
          radiusZ: outerR * ringAspect,
          intensity: ringIntensity,
          falloff,
          flatInner: flatInnerForOp,
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
          flatInner: flatInnerForOp,
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
