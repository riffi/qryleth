---
id: 23
phase: 1
title: "Фаза 1: Перенос PRNG и базовые типы"
status: done
created: 2025-08-26
updated: 2025-08-26
filesChanged: 5
notes:
  - prng: mulberry32+createRng+xfnv1a moved
  - types: proceduralTypes added
---

# Фаза 1: Перенос PRNG и базовые типы

Выполнены перенос PRNG (mulberry32) и связанных функций в общий модуль утилит, обновлён импорт в генераторе перлин-шума, а также добавлены базовые типы процедурной генерации террейна.

## Изменения по коду
- Добавлен общий модуль PRNG: `apps/qryleth-front/src/shared/lib/utils/prng.ts`
  - `mulberry32(seed: number): () => number`
  - `xfnv1a(str: string): number`
  - `createRng(seed?: number | string): () => number`
- Обновлён генератор перлин-шума: `apps/qryleth-front/src/shared/lib/noise/perlin.ts`
  - Удалены локальные реализации PRNG
  - Добавлен импорт `createRng` из общего модуля
- Добавлены типы процедурной генерации: `apps/qryleth-front/src/entities/terrain/model/proceduralTypes.ts`
  - `GfxProceduralPerlinParams`, `GfxProceduralTerrainSpec`, `GfxTerrainOpPool`, `GfxTerrainOpRecipe`
  - `GfxPlacementSpec`, `GfxBiasSpec`, `GfxPlacementArea`, `GfxOpsGenerationOptions`
- Обновлён индекс типов террейна: `apps/qryleth-front/src/entities/terrain/index.ts` (реэкспорт новых типов)

## Результат
- PRNG вынесен в общий модуль, обеспечивая переиспользование и единый источник детерминизма.
- Перлин-генератор использует общий PRNG через `createRng`, логика не меняется.
- Заданы чёткие спецификации типов для последующих фаз (размещение, рецепты, движок), с подробными комментариями на русском языке.

## Проверка
- Рекомендуется выполнить локальную сборку/тесты для подтверждения корректности.
- Внесённые изменения соответствуют лимиту ≤ 15 файлов.
