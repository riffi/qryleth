---
id: 29
phase: 5
title: "Фаза 5: Оркестрация — прокидывание surfaceCtx и ожидание readiness"
status: done
created: 2025-09-04
updated: 2025-09-04
filesChanged: 2
---

# Отчёт по фазе 5

## Что сделано
- BiomeScattering:
  - Добавлена расширенная функция `scatterBiomePureWithSurface(biome, library, surfaceCtx?)`.
  - Прежняя `scatterBiomePure` оставлена как обёртка ради совместимости.
  - Внутренний генератор `scatterWithConfig` прокидывает `surfaceMask/surfaceCtx` в `sampleRandomPoints` и `samplePoissonDisk` только если `cfg.surface` задан.
- SceneAPI.scatterBiome:
  - Определение необходимости surface (по base и strata), асинхронное ожидание readiness у heightmap‑сэмплеров.
  - Формирование `surfaceCtx` на основе `getTerrainSamplerAt(layers, x, z)`.
  - Использование `scatterBiomePureWithSurface` для генерации размещений.

## Затронутые файлы
- apps/qryleth-front/src/features/scene/lib/biomes/BiomeScattering.ts
- apps/qryleth-front/src/features/editor/scene/lib/sceneAPI.ts

## Совместимость
- Сигнатура `scatterBiomePure` сохранена. Новая логика включается только при наличии `surface` в конфиге.

## Следующие шаги
- Фаза 6: Обновить шаблоны ScriptingPanel (группа «Биомы») с примерами `surface`.

