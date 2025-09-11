# Типы процедурной генерации деревьев

Этот документ фиксирует доменные типы, связанные с деревьями: специальные примитивы для ствола/ветвей/листьев и параметры генератора деревьев. Содержит только определение контрактов; поведение и UX описаны в features/object-editing/tree-generation.md.

## Специальные примитивы деревьев

В дополнение к базовым примитивам `box|sphere|cylinder|cone|pyramid|plane|torus` определены три типа, используемые исключительно для деревьев. Они нужны, чтобы оптимизации рендера не затрагивали чужие цилиндры/сферы в других объектах.

- `trunk` — сегменты ствола
  - geometry: `{ radiusTop: number; radiusBottom: number; height: number; radialSegments?: number; collarFrac?: number; collarScale?: number }`
    - `collarFrac` — доля высоты от нижней грани, где действует плавное расширение радиуса ("воротник").
    - `collarScale` — множитель радиуса у самой нижней грани (>1 — расширение). Если не задано — воротник отключён.
- `branch` — ветви дерева
  - geometry: `{ radiusTop: number; radiusBottom: number; height: number; radialSegments?: number; collarFrac?: number; collarScale?: number }`
    - По умолчанию для веток применяется лёгкий воротник (`collarFrac≈0.15`, `collarScale≈1.2`) для мягкого перехода в родителя.
- `leaf` — лист
  - geometry: `{ radius: number; shape?: 'billboard' | 'sphere' }`
    - `shape: 'billboard'` — плоская плоскость с альфа‑маской и лёгким «изгибом» (по умолчанию)
    - `shape: 'sphere'` — объёмная сфера (упрощённый вариант)

Прочие общие поля примитива см. в описании `GfxPrimitive` (uuid, visible, transform, ссылки на материалы).

Bounding Box: `trunk/branch` трактуются как цилиндры; `leaf` — как сфера по `radius`.

## Параметры генератора деревьев

Тип параметров генерации: `TreeGeneratorParams`

Поля:
- `seed: number` — сид случайности (детерминирует результат)
- `trunkHeight: number` — высота ствола
- `trunkRadius: number` — радиус ствола у основания
- `trunkSegments: number` — количество сегментов ствола
- `trunkTaperFactor?: number` — коэффициент сужения ствола кверху (0..1). 0 — без сужения; 1 — сильное сужение. По умолчанию ≈ 0.4.
- `branchLevels: number` — число уровней ветвления (0 — без ветвей)
- `branchesPerSegment: number` — среднее число ветвей на сегмент ствола
- `branchTopBias?: number` — привязка ветвей к верхней части дерева (0..1): 0 — равномерно по высоте, 1 — концентрация у верхних сегментов.
- `branchUpBias?: number` — стремление ветвей «смотреть вверх» (0..1): 0 — без предпочтения; 1 — направления с отрицательной Y‑составляющей сильно штрафуются при выборе кандидата.
- `branchLength: number` — базовая длина ветви (уменьшается на верхних уровнях)
- `branchRadius: number` — радиус ветви первого уровня
- `branchAngleDeg: number` — угол наклона ветви от вертикали (в градусах)
- `branchAngleDegFirst?: number` — угол для ветвей первого уровня (если не задан — берётся `branchAngleDeg`)
- `branchAngleDegNext?: number` — угол для уровней ≥2 (если не задан — берётся `branchAngleDeg`)
- `angleSpread?: number` (0..1) — разброс наклона относительно `branchAngleDeg`
  - 0 — без разброса (точно `branchAngleDeg`)
  - 1 — максимальный джиттер (порядка ±50% от `branchAngleDeg`)
  - На азимут не влияет — азимут выбирается равномерно случайно в [0..2π]
- `randomness: number` — общая доля случайности для некоторых величин
- `leavesPerBranch: number` — число листьев на конце ветви (на последнем уровне)
- `leafSize: number` — базовый размер/радиус листа
- `leafShape?: 'billboard' | 'sphere' | 'coniferCross'` — тип листвы: плоская плоскость, объёмная сфера или «крест» из двух плоскостей (для хвойных)
 - `leafPlacement?: 'end' | 'along'` — размещение листвы: на концах ветвей или вдоль ветви
 - `leavesPerMeter?: number` — плотность кластеров вдоль ветви (для `leafPlacement='along'`)
- `embedFactor?: number` (0..1) — коэффициент заглубления ответвлений и стыков ствола. Используется для скрытия торцевых крышек цилиндров внутри родителя. По умолчанию ≈ 0.6. При малых углах наклона генератор автоматически повышает фактическую глубину до минимально достаточной величины.

Параметры разветвления самого ствола (опционально):
- `trunkBranchLevels?: number` — количество уровней разветвления ствола (0 — без разветвления).
- `trunkBranchesPerLevel?: number` — число дочерних стволов на уровне (по умолчанию 2).
- `trunkBranchAngleDeg?: number` — угол наклона дочерних стволов от вертикали (по умолчанию 20°).
- `trunkBranchChildHeightFactor?: number` — относительная высота дочернего ствола к родителю (по умолчанию ≈ 0.7).

Примечание: нижний радиус каждого дочернего ствола автоматически равен верхнему радиусу родительского, чтобы обеспечить бесшовный переход при любом значении сужения `trunkTaperFactor`.

Возвращаемое значение генератора (сокр.): массив `GfxPrimitive` (trunk/branch/leaf) и список материалов (см. `GfxMaterial`).

## Ссылки
- Реализация типов примитивов: `apps/qryleth-front/src/entities/primitive/model/types.ts`
- Параметры и генератор: `apps/qryleth-front/src/features/editor/object/lib/generators/tree/types.ts`, `.../generateTree.ts`
- Поведение и UI: `docs/features/object-editing/tree-generation.md`
