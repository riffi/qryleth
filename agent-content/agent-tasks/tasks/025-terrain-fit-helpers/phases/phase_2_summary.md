---
id: 25
phase: 2
title: "Фаза 2: Ядро вычислений (эвристики step/radius/aspect/intensity)"
status: done
created: 2025-08-27
updated: 2025-08-27
filesChanged: 1
notes:
  - logic: heuristics-implemented
  - api: non-breaking
---

# Фаза 2: Ядро вычислений (эвристики step/radius/aspect/intensity)

## Изменения в коде
- Реализована логика в `TerrainHelpers`:
  - Файл: `apps/qryleth-front/src/features/scene/lib/terrain/fit/TerrainHelpers.ts`
  - Метод `valleyFitToRecipes(...)`:
    - Авто-ориентация (по длинной стороне прямоугольника) и фиксированный угол при явном значении.
    - Расчёт отступов (edgeMargin) с учётом `edgeFade` и размеров мира.
    - Подбор пары `step/radius` для штриха из 5 центров, оценка перекрытия.
    - Вывод `aspect` из желаемой толщины.
    - Интенсивность из `depth` или эвристической `prominencePct`.
    - Поддержка режимов `continuous` (stroke) и `segmented` (множественные одиночные эллипсы в узком rect).
  - Метод `ridgeBandFitToRecipes(...)` — аналогично для гряд/хребтов (интенсивность по `height`).
  - Добавлены утилиты: `clamp`, уточнены предупреждения `warnings`.

## Примечания по поведению
- Для `continuous` генерируется рецепт с `count: 1`, `placement: ring(center, r=0)`, `rotation=[θ,θ]`, `step>0` — штрих из 5 эллипсов.
- Для `segmented` — рецепт с `count≈L/(2r(1-overlap))`, `placement: uniform` в тонком `rect`, без `step`.
- Интенсивности по `prominencePct` рассчитываются эвристически (база: valley≈8, ridge≈10) — это отражено в `warnings`.

## Результат
- [x] Поддержаны оба режима (continuous/segmented).
- [x] Рассчитаны `step/radius/aspect/intensity` и ориентация.
- [x] Предупреждения при потенциальном выходе за границы области.

