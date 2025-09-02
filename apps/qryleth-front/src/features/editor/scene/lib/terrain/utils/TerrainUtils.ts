/**
 * Математические и вспомогательные утилиты для процедурной генерации террейна.
 * Содержит функции для вычисления уклона, проверки пересечений операций,
 * выбора режимов по умолчанию и генерации детерминированных идентификаторов.
 */

import type { GfxTerrainOp } from '@/entities/terrain'

/**
 * Вычисляет угол уклона поверхности в радианах по нормали.
 * 0 — горизонтальная поверхность (ny=1), π/2 — вертикальная.
 */
export function slopeFromNormal(normal: [number, number, number]): number {
  const ny = Math.max(-1, Math.min(1, normal[1]))
  return Math.acos(ny)
}

/**
 * Возвращает «ограничивающий» радиус операции — максимум из радиусов по осям.
 */
export function opBoundingRadius(op: Pick<GfxTerrainOp, 'radius' | 'radiusZ'>): number {
  return Math.max(op.radius, op.radiusZ || op.radius)
}

/**
 * Проверяет пересечение (в первом приближении) двух операций по круговым оболочкам.
 * Учитывает только максимальные радиусы, игнорируя поворот эллипса.
 */
export function opsOverlap(a: Pick<GfxTerrainOp, 'center' | 'radius' | 'radiusZ'>, b: Pick<GfxTerrainOp, 'center' | 'radius' | 'radiusZ'>): boolean {
  const ra = opBoundingRadius(a)
  const rb = opBoundingRadius(b)
  const dx = a.center[0] - b.center[0]
  const dz = a.center[1] - b.center[1]
  const d2 = dx * dx + dz * dz
  const r = ra + rb
  return d2 < r * r
}

/**
 * Подбор режима модификации для значения `mode: 'auto'` в рецепте.
 * Соответствует правилам из AGENT_TASK_SUMMARY:
 * hill/ridge/dune → add; basin/valley → sub; plateau → set; прочие → add.
 */
export function autoModeForKind(kind: string): 'add' | 'sub' | 'set' {
  switch (kind) {
    case 'hill':
    case 'ridge':
    case 'dune':
      return 'add'
    case 'basin':
    case 'valley':
      return 'sub'
    case 'plateau':
      return 'set'
    default:
      return 'add'
  }
}

/**
 * Подбор функции затухания по умолчанию для конкретного вида рецепта.
 *
 * Правило:
 * - Для 'plateau' по умолчанию используем falloff='plateau' (плоское ядро).
 * - Для остальных типов — 'smoothstep' (универсальный мягкий спад).
 */
export function autoFalloffForKind(kind: string): 'smoothstep' | 'gauss' | 'linear' | 'plateau' {
  return kind === 'plateau' ? 'plateau' : 'smoothstep'
}

/**
 * Сгенерировать детерминированный идентификатор операции на основе числа из RNG.
 * Внутри кодирует значение в base36 для компактности.
 */
export function makeDeterministicOpId(nextInt: number): string {
  // Нормализуем и формируем читаемый base36 код
  const u = (nextInt >>> 0).toString(36)
  return `op_${u}`
}
