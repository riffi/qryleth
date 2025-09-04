---
id: 29
phase: 4
title: "Фаза 4: Интеграция surface‑маски в Random/Poisson и коррекция плотности"
status: done
created: 2025-09-04
updated: 2025-09-04
filesChanged: 2
---

# Отчёт по фазе 4

## Что сделано
- RandomSampling:
  - Расширен интерфейс `sampleRandomPoints(area, cfg, seed?, softFactor?, options?)` с `options.surfaceMask/surfaceCtx`.
  - Добавлена поддержка режимов `reject/weight/spacing` через кэшированный оценщик (`createSurfaceMaskEvaluator`).
  - Корректировка `target` по средней плотности: `E[accept] * E[1/spacingFactor^2]` (с учётом edge уже существующей функцией).
- PoissonDiskSampler:
  - Расширен интерфейс `samplePoissonDisk(..., edge?, options?)` с `options.surfaceMask/surfaceCtx`.
  - Учет `spacing` в длине шага и радиусе проверки соседей, `reject/weight` — при принятии кандидатов.
  - Корректировка `targetCount` аналогично Random.
- Везде подробные русские комментарии, поведение по умолчанию не затронуто (если `options` не передан — логика прежняя).

## Затронутые файлы
- apps/qryleth-front/src/features/scene/lib/biomes/RandomSampling.ts
- apps/qryleth-front/src/features/scene/lib/biomes/PoissonDiskSampler.ts

## Совместимость
- Существующие вызовы не менялись; новые параметры опциональны. Биом‑оркестратор будет передавать `options` на фазе 5.

## Следующие шаги
- Фаза 5: Прокинуть `surfaceCtx`/`surfaceMask` из `BiomeScattering` и интегрировать выбор слоя в `SceneAPI.scatterBiome`.

