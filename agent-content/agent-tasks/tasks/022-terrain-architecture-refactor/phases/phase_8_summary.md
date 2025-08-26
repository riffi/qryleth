---
title: "Фаза 8 — Обновление документации"
status: completed
date: 2025-08-26
---

# Фаза 8 — Обновление документации

Документация приведена в соответствие с новой архитектурой террейна: добавлены разделы про модульную структуру, жизненный цикл сэмплера (`isReady/ready/dispose`), использование `GeometryBuilder`, а также кэширование heightmap с TTL/LRU и инвалидацией.

## Обновлённые документы

- docs/features/scene-management/terrain-system.md
  - Уточнено: единый `GfxHeightSampler`, наличие методов жизненного цикла, модульная структура (sources/sampling/ops/effects/assets), `GeometryBuilder`.
  - Добавлен пример: ожидание `sampler.ready()` перед построением геометрии.
  - Добавлен раздел про инвалидацию кэшей и ссылку на `assets/heightmapCache.ts`.

- docs/api/types/terrain.md
  - Исправлён импорт `buildGfxTerrainGeometry` (из `GeometryBuilder.ts`).
  - Добавлен блок «Жизненный цикл сэмплера»: `isReady`, `ready`, `dispose` и рекомендации для UI.
  - Добавлен раздел «Кэширование и инвалидация»: TTL/LRU, `invalidate(assetId)`, `clear()` и роль `HeightmapUtils` при rename/delete.

- docs/README.md
  - Расширены пункты «Недавние архитектурные обновления»: модули, `ready()`, TTL/LRU-кэши, `GeometryBuilder`.

## Результаты

- Документация отражает текущую реализацию и гайдлайны по использованию.
- Примеры корректно показывают импорт `GeometryBuilder` и ожидание `ready()`.

