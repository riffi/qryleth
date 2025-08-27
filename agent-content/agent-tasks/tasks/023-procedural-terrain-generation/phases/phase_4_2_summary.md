---
id: 23
phase: 4.2
title: "Фаза 4.2: Фабрики и интеграционные тесты"
status: done
created: 2025-08-27
updated: 2025-08-27
filesChanged: 2
notes:
  - добавлены фабрики спецификаций и готовых конфигов
  - реализованы тесты фабрик и простая интеграция с сэмплером
---

# Фаза 4.2: Фабрики и интеграционные тесты

Реализованы фабрики для генерации типовых ландшафтов (горы, холмы, дюны) и модульные тесты, проверяющие детерминированность, базовую валидность конфигурации и совместимость с `GfxHeightSampler`.

## Изменения по коду

- `apps/qryleth-front/src/features/scene/lib/terrain/TerrainFactory.ts`
  - `createMountainSpec(seed?)`, `createHillsSpec(seed?)`, `createDunesSpec(seed?)` — формируют `GfxProceduralTerrainSpec` с характерными пулами рецептов.
  - `createMountainTerrain(seed?)`, `createHillsTerrain(seed?)`, `createDunesTerrain(seed?)` — возвращают готовый `GfxTerrainConfig` через `ProceduralTerrainGenerator`.

- Тесты: `apps/qryleth-front/src/features/scene/lib/terrain/TerrainFactory.test.ts`
  - Проверяют детерминированность выходных `ops` по seed, наличие операций и валидные размеры мира.
  - Интеграция: создаётся `GfxHeightSampler` и выполняется выборка высоты как smoke‑тест.

## Проверка

- Тесты Vitest могут требовать корректных optional зависимостей rollup.
  - Локально: `cd apps/qryleth-front && npm ci && npm run test:run`.

## Результат

- Фабрики готовы для использования в SceneAPI (фаза 5) и в UI.

