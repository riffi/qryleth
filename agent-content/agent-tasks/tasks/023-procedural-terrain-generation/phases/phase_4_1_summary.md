---
id: 23
phase: 4.1
title: "Фаза 4.1: Движок ProceduralTerrainGenerator (основа)"
status: done
created: 2025-08-27
updated: 2025-08-27
filesChanged: 2
notes:
  - реализован класс ProceduralTerrainGenerator
  - методы generateOpsFromPool и generateTerrain
  - интеграция placement/recipes/bias
  - модульные тесты Vitest
---

# Фаза 4.1: Движок ProceduralTerrainGenerator (основа)

Реализован базовый движок процедурной генерации террейна с интеграцией алгоритмов размещения, шаблонов операций и bias‑фильтрации. Методы снабжены подробными комментариями на русском языке, обеспечена детерминированность генерации по сидy.

## Изменения по коду

- `apps/qryleth-front/src/features/scene/lib/terrain/ProceduralTerrainGenerator.ts`
  - Класс `ProceduralTerrainGenerator`:
    - `generateOpsFromPool(pool, seed, opts)` — размещение центров (`placement.placePoints`), дрожание центров (`jitter.center`), развёртка рецептов в 1..N операций (`recipes/RecipeProcessor`), bias‑фильтрация (`recipes/BiasProcessor`), соблюдение лимита `global.maxOps`. Детерминированность через `deriveRng`.
    - `generateTerrain(spec)` — сборка `GfxTerrainConfig` из `spec.world/spec.base` и генерация `ops` через `generateOpsFromPool`.

- Тесты: `apps/qryleth-front/src/features/scene/lib/terrain/ProceduralTerrainGenerator.test.ts`
  - Проверяют детерминированность по seed, применение `global.maxOps` и корректность итоговой конфигурации (включая базовый семплинг высоты).

## Особенности реализации

- Для `generateOpsFromPool` обязательны `opts.worldWidth/worldHeight` — требуются алгоритмам размещения.
- `jitter.center` задаёт максимальную амплитуду случайного смещения центра в метрах.
- Bias‑фильтрация учитывает `preferHeight`, `preferSlope` (мягкие веса через `weight`) и `avoidOverlap` (жадный отбор без пересечений по круговым оболочкам).
- Все случайности основаны на PRNG `mulberry32` через `deriveRng` с под‑сидом по стадиям.

## Проверка

- Тесты Vitest могут требовать корректных optional зависимостей rollup.
  - Локально: `cd apps/qryleth-front && npm ci && npm run test:run`.

## Результат

- Основа движка процедурной генерации готова для использования в фабриках (фаза 4.2) и дальнейшей интеграции в SceneAPI.

