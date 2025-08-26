---
title: "Фаза 3 — Распил GfxHeightSampler на модули"
status: completed
date: 2025-08-26
---

# Фаза 3 — Распил GfxHeightSampler на модули

Выполнено выделение чистых модулей для источников высот, UV-преобразований, билинейной интерполяции, эффектов (edge fade), операций террейна (индекс и применение), а также кэшей/загрузчиков высот для heightmap. `GfxHeightSampler.ts` упрощён до композиции этих модулей, публичные методы сохранены.

## Новые модули

- sampling/uv.ts
  - `worldToUV(x, z, worldW, worldH)` — преобразование мировых координат в UV [0..1].
  - `applyWrap(u, v, mode)` — обработка краёв UV: `clamp | repeat`.
- sampling/bilinear.ts
  - `sampleHeightsFieldBilinear(heights, w, h, px, py)` — билинейная интерполяция по Float32Array (возврат [0..1]).
  - `sampleImageDataBilinear(imageData, px, py)` — билинейная интерполяция по ImageData (яркость → [0..1]).
- effects/edgeFade.ts
  - `calculateEdgeFade(x, z, worldW, worldH, edgeFade)` — коэффициент затухания к краям.
- ops/spatialIndex.ts
  - `buildSpatialIndex(ops, cellSize)` — равномерный индекс, ключ "cx,cz".
  - `getRelevantOps(index, cellSize, x, z)` — выбор операций для точки.
- ops/applyOps.ts
  - `applyTerrainOpsOptimized(baseHeight, x, z, ops)` — применение операций.
  - `calculateOpContribution`, `calculateOpDistance`, `applyFalloffFunction` — вспомогательные функции.
- heightSources/PerlinSource.ts
  - `createPerlinSource(params, world)` — функция-источник для Перлин-шума.
- heightSources/HeightmapSource.ts
  - `sampleHeightFromHeightsField(...)` и `sampleHeightFromImageData(...)` — утилиты семплинга heightmap.
- assets/heightmapCache.ts
  - Кэш и загрузчики: `get/setCachedImageData`, `get/setCachedHeightsField`, `loadImageData`, `loadHeightsField`, `invalidate`.
  - TTL/LRU планируется в фазе 6.

## Изменения в GfxHeightSampler

- Импорты перенесены на новые модули; глобальные кэши/промисы удалены.
- `createPerlinSource` теперь использует модуль `heightSources/PerlinSource`.
- Логика heightmap:
  - Приоритет числового поля высот (heightsField), фоллбэк на ImageData.
  - Загрузка/кэширование через `assets/heightmapCache`.
  - Семплинг через утилиты из `heightSources/HeightmapSource`.
- Edge fade берется из `effects/edgeFade`.
- Пространственный индекс и применение операций — через `ops/*` модули.
- Внутренние помощники `sample*Bilinear`, `calculateEdgeFade`, `getRelevantOps`, `apply*Ops`, `calculateOp*`, `applyFalloff*` удалены из файла (заменены на импорты).

## Результат

- Архитектура стала модульной и заметно проще для чтения/поддержки.
- Поведение при семплинге высот и применении операций эквивалентно исходному.
- Готова база для последующих фаз (динамический sampleStep, ready()/isReady(), TTL кэшей и интеграция с UI без таймеров).

## Затронутые файлы

- Добавлены: `sampling/uv.ts`, `sampling/bilinear.ts`, `effects/edgeFade.ts`, `ops/spatialIndex.ts`, `ops/applyOps.ts`, `assets/heightmapCache.ts`, `heightSources/PerlinSource.ts`, `heightSources/HeightmapSource.ts`.
- Изменён: `GfxHeightSampler.ts` (упрощён до композиции модулей).

