---
id: 29
phase: 2
title: "Фаза 2: Выбор террейн-слоя по координате (x,z)"
status: done
created: 2025-09-04
updated: 2025-09-04
filesChanged: 1
---

# Отчёт по фазе 2

## Что сделано
- Реализованы утилиты для выбора подходящего террейн-слоя по мировой координате (x,z) и получения сэмплера высот:
  - `isPointInsideTerrainLayerAabb(layer, x, z)` — проверка попадания точки в AABB слоя с учётом `terrain.worldWidth/worldDepth` и `terrain.center`.
  - `pickLandscapeLayerAt(layers, x, z)` — выбор слоя по приоритетам: `shape=Terrain` → затем максимальный `position`.
  - `getTerrainSamplerAt(layers, x, z)` — вернуть `{ sampler, seaLevel, layer }` или `null`.
- Добавлены развёрнутые комментарии на русском.

## Затронутые файлы
- apps/qryleth-front/src/features/editor/scene/lib/placement/terrainAdapter.ts

## Совместимость
- Не ломает существующие вызовы. Новые функции опциональны и не используются по умолчанию.

## Следующие шаги
- Фаза 3: Реализовать расчёт surface‑маски `W(x,z)` и `spacingFactor(x,z)` (высота/наклон/кривизна) с кэшированием сеткой.

