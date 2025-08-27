---
id: 25
phase: 3
title: "Фаза 3: Бюджет и приоритезация"
status: done
created: 2025-08-27
updated: 2025-08-27
filesChanged: 1
notes:
  - logic: budgeting-and-trim
  - api: non-breaking
---

# Фаза 3: Бюджет и приоритезация

## Изменения в коде
- Добавлен авто‑тримминг рецептов под бюджет:
  - Файл: `apps/qryleth-front/src/features/scene/lib/terrain/fit/TerrainHelpers.ts`
  - Новый метод `autoBudget(recipes, maxOps)`:
    - Поддерживает приоритезацию: детализация (hill/basin/crater/terrace/dune/plateau) → ridge → valley.
    - Подрезает `count` пошагово до минимально допустимого (valley ≥ 1; ridge ≥ 0; прочие ≥ 0).
    - Удаляет рецепты с нулевым `count` из результата.
    - Возвращает `trimmedRecipes`, `usedOps`, `report` (поэлементная сводка изменений).
  - Вспомогательные приватные методы: `opsPerCenter(...)`, `trimPriority(...)`.

## Как использовать
```js
const { trimmedRecipes, usedOps, report } = TerrainHelpers.autoBudget(recipes, maxOps)
const pool = { global: { maxOps }, recipes: trimmedRecipes }
// далее собрать spec и вызвать sceneApi.createProceduralLayer(...)
```

## Результат
- [x] При нехватке бюджета детали подрезаются первыми, valley сохраняется.
- [x] Рецепты с нулевым количеством отбрасываются.
- [x] Никаких breaking changes; метод опционален.

