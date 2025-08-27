---
id: 23
phase: 2
title: "Фаза 2: Алгоритмы размещения"
status: done
created: 2025-08-27
updated: 2025-08-27
filesChanged: 4
notes:
  - placement: uniform/poisson/gridJitter/ring implemented
  - utils: world rect/area helpers
  - tests: vitest for placement algorithms
---

# Фаза 2: Алгоритмы размещения

Реализованы алгоритмы размещения центров операций террейна и вспомогательные утилиты в соответствии с планом. Все публичные методы снабжены подробными комментариями на русском языке. Добавлены модульные тесты (Vitest), проверяющие детерминированность и корректность распределения.

## Изменения по коду

- Добавлены алгоритмы размещения: `apps/qryleth-front/src/features/scene/lib/terrain/placement/PlacementAlgorithms.ts`
  - `placePoints(spec, count, rng, opts)` — диспетчер по типам спецификаций (`uniform`, `poisson`, `gridJitter`, `ring`).
  - `placeUniform(count, rng, opts)` — равномерное случайное размещение.
  - `placePoisson(count, minDistance, rng, opts)` — Poisson-подобное размещение через dart-throwing.
  - `placeGridJitter(count, cell, jitter, rng, opts)` — сетка с дрожанием точки в ячейке.
  - `placeRing(count, cx, cz, rMin, rMax, rng, opts)` — размещение в кольцевой области.

- Добавлены утилиты: `apps/qryleth-front/src/features/scene/lib/terrain/placement/PlacementUtils.ts`
  - `makeWorldRect`, `areaToWorldRect`, `isInsideArea`, `isInsideRect` — работа с мировыми границами и ограничивающими областями (rect/circle).
  - `randomPointInRect`, `randomPointInCircle` — выборка случайной точки.
  - `dist2`, `clamp` — математика для быстрых проверок дистанций и ограничений.

- Экспорт индекса: `apps/qryleth-front/src/features/scene/lib/terrain/placement/index.ts`

- Тесты: `apps/qryleth-front/src/features/scene/lib/terrain/placement/PlacementAlgorithms.test.ts`
  - Проверяют: детерминированность (одинаковый seed → одинаковые точки),
    выполнение минимальной дистанции в poisson, соблюдение границ мира/областей,
    корректность радиальных ограничений для ring, базовую работу диспетчера `placePoints`.

## Особенности реализации

- Все координаты — в мировых единицах (метрах), центр мира — в (0, 0) XZ.
- Алгоритмы учитывают необязательную ограничивающую область (`GfxPlacementArea`): `rect` и `circle`.
- Для Poisson используется «дротикование» с верхней границей числа попыток, чтобы избежать зацикливания на маленьких областях.
- Для ring первый проход распределяет точки равномерно по углу, недостающие точки добираются случайными попытками.

## Проверка

- Тесты написаны на Vitest. В среде CLI сборка может требовать корректно установленные бинарные зависимости (rollup). Для локального запуска:
  - Перейти в каталог `apps/qryleth-front` и выполнить `npm run test:run`.
  - Убедиться, что зависимости установлены (`npm ci`).

## Результат

- Алгоритмы размещения готовы к использованию в фазе 3 (шаблоны операций и bias-фильтры) и в дальнейшем в движке ProceduralTerrainGenerator.

