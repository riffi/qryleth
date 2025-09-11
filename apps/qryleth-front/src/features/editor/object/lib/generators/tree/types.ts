/**
 * Параметры процедурной генерации дерева.
 * На основе этих значений генератор строит набор примитивов ствола/ветвей/листвы
 * и возвращает их для добавления в редактируемый объект.
 */
export interface TreeGeneratorParams {
  /** Сид случайности для детерминированной генерации */
  seed: number
  /** Общая высота ствола (в единицах сцены) */
  trunkHeight: number
  /** Радиус ствола у основания */
  trunkRadius: number
  /** Количество сегментов ствола (вертикальная детализация) */
  trunkSegments: number
  /** Количество уровней ветвления (0 — без ветвей) */
  branchLevels: number
  /** Количество ветвей на сегмент ствола (усреднённо) */
  branchesPerSegment: number
  /** Длина ветви базовая (умножается на коэффициенты по уровням) */
  branchLength: number
  /** Радиус ветви на первом уровне (тоньше на следующих уровнях) */
  branchRadius: number
  /** Угол наклона ветви от вертикали, в градусах */
  branchAngleDeg: number
  /** Доля случайного разброса параметров (0..1) */
  randomness: number
  /** Количество листьев на конце каждой ветви (на верхнем уровне) */
  leavesPerBranch: number
  /** Размер (радиус) листа, если рендерим лист как сферу */
  leafSize: number
  /** Тип листвы: billboard или sphere */
  leafShape?: 'billboard' | 'sphere'
}

/**
 * Результат генерации дерева: примитивы и базовые материалы (без UUID).
 */
export interface TreeGeneratorResult {
  primitives: import('@/entities/primitive').GfxPrimitive[]
  materials: import('@/entities/material').CreateGfxMaterial[]
}
