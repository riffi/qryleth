---
id: 29
phase: 3
title: "Фаза 3: Поверхностная маска — расчёт W(x,z) и spacingFactor(x,z) с кэшем"
status: done
created: 2025-09-04
updated: 2025-09-04
filesChanged: 1
---

# Отчёт по фазе 3

## Что сделано
- Добавлен модуль расчёта surface‑маски для скаттеринга:
  - `evaluateSurfaceAtPoint(x, z, mask, ctx)` — чистая функция, считает `{ weight, spacingFactor }` по высоте/наклону/кривизне.
  - `createSurfaceMaskEvaluator(area, mask, ctx, gridResolution=64)` — фабрика кэшированного оценщика; предрасчёт сетки значений в AABB области биома и билинейная интерполяция.
- Учтена политика вне террейна: `weight=0` (жёсткий reject), `spacingFactor=1`.
- Реализация «мягких» границ по диапазонам через `smoothstep`; объединение факторов по `combine` с поддержкой весов.
- Детализированные комментарии на русском.

## Затронутые файлы
- apps/qryleth-front/src/features/scene/lib/biomes/SurfaceMask.ts

## Совместимость
- Модуль изолирован, интеграция в генераторы точек будет выполнена на фазе 4.

## Следующие шаги
- Фаза 4: Подключить surface‑оценку к RandomSampling и PoissonDiskSampler (reject/weight/spacing) + корректировка целевых количеств.

