---
id: 23
phase: 3
title: "Фаза 3: Шаблоны операций и bias-функции"
status: done
created: 2025-08-27
updated: 2025-08-27
filesChanged: 10
notes:
  - templates: hill/basin/ridge/valley/crater/plateau/terrace/dune
  - bias: preferHeight/preferSlope/avoidOverlap с жадным отбором
  - utils: PRNG подпотоки, математика, авто-режимы, id
  - tests: vitest покрывают PRNG, шаблоны, процессор, bias
---

# Фаза 3: Шаблоны операций и bias-функции

Реализованы шаблоны (recipes) генерации операций террейна с поддержкой восьми типов рельефа и bias-фильтрацией по высоте/уклону/пересечениям. Все публичные методы снабжены подробными комментариями на русском языке и покрыты unit‑тестами (Vitest).

## Изменения по коду

- Утилиты PRNG: `apps/qryleth-front/src/features/scene/lib/terrain/utils/PRNGUtils.ts`
  - `splitSeed`, `deriveRng` — разветвление seed на подпотоки по меткам.
  - `randRange`, `randIntRange`, `pickFromNumberOrRange`, `randAngle` — выборки из диапазонов для генерации параметров.

- Утилиты математики/террейна: `apps/qryleth-front/src/features/scene/lib/terrain/utils/TerrainUtils.ts`
  - `slopeFromNormal` — угол уклона по нормали.
  - `opBoundingRadius`, `opsOverlap` — проверка пересечений по круговым оболочкам.
  - `autoModeForKind` — дефолты для `mode: 'auto'` (hill/ridge/dune → add; basin/valley → sub; plateau → set).
  - `makeDeterministicOpId` — детерминированные id из целого значения.

- Шаблоны операций: `apps/qryleth-front/src/features/scene/lib/terrain/recipes/OperationTemplates.ts`
  - `buildOpsForPoint(recipe, center, rng, intensityScale?)` — строит 1..N операций из одного центра с учетом диапазонов `radius/intensity/aspect/rotation` и `falloff`.
  - Поддержаны типы: `hill`, `basin`, `ridge`, `valley`, `crater`, `plateau`, `terrace`, `dune`.
    - `crater` → 2 операции: центральная выемка (sub) + вал (add).
    - `ridge/valley` → серия эллипсов по линии через центр при наличии `step` (иначе одна операция).
    - `terrace` → концентрические «ступени» (чередование set/add).

- Процессор рецептов: `apps/qryleth-front/src/features/scene/lib/terrain/recipes/RecipeProcessor.ts`
  - `generateOpsForRecipeAtPoints(recipe, points, seed, { intensityScale })` — детерминированно разворачивает рецепт в массив `GfxTerrainOp`, присваивая id из подпотока `op_ids`.

- Bias‑процессор: `apps/qryleth-front/src/features/scene/lib/terrain/recipes/BiasProcessor.ts`
  - `computeBiasWeight(op, bias, sampler)` — вес по preferHeight/preferSlope (мягкое влияние через `weight`).
  - `applyBiasSelection(candidates, bias, sampler, existingOps)` — сортировка по весу и жадный выбор без пересечений при `avoidOverlap: true`.
  - `processBias(...)` — обёртка для удобного применения.

- Экспорт индекса: `apps/qryleth-front/src/features/scene/lib/terrain/recipes/index.ts`

## Тесты (Vitest)

- `utils/PRNGUtils.test.ts` — детерминированность и независимость подпотоков, выборки диапазонов.
- `recipes/OperationTemplates.test.ts` — auto‑режим для hill, составные операции у crater.
- `recipes/RecipeProcessor.test.ts` — детерминированные id и влияние `intensityScale`.
- `recipes/BiasProcessor.test.ts` — веса по высоте и устранение пересечений при `avoidOverlap`.

## Особенности реализации

- «Один рецепт может порождать несколько GfxTerrainOp»: реализовано для `crater`, `ridge/valley` (штрих‑серия по `step`), `terrace` (концентрические ступени).
- Зафиксированы дефолты `mode: 'auto'` для каждого `kind` согласно описанию задачи.
- Пересечения оценены по круговым оболочкам (max(radius, radiusZ)) для скорости — достаточно для bias‑отсечения; точное эллиптическое пересечение не требуется.

## Проверка

- Тесты написаны на Vitest. В окружении CLI возможна ошибка из‑за optional deps rollup. Для локального запуска:
  - Перейти в `apps/qryleth-front` и выполнить `npm ci` (или `pnpm i`) для корректной установки optional зависимостей.
  - Запустить `npm run test:run`.

## Результат

- Шаблоны операций и bias‑фильтрация готовы для интеграции в фазе 4 (движок `ProceduralTerrainGenerator`) и последующей интеграции с SceneAPI.

