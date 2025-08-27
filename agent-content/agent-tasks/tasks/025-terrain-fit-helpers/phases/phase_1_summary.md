---
id: 25
phase: 1
title: "Фаза 1: Спецификация типов и каркас хелперов"
status: done
created: 2025-08-27
updated: 2025-08-27
filesChanged: 3
notes:
  - scope: types-and-skeleton
  - api: non-breaking
---

# Фаза 1: Спецификация типов и каркас хелперов

## Выполненные работы
- Добавлены Fit-типы для высокоуровневых хелперов:
  - `apps/qryleth-front/src/entities/terrain/model/fitTypes.ts` — `FitRect`, `WorldSize`, `ValleyFitOptions`, `RidgeBandFitOptions`, `FitResult`.
- Экспорт новых типов из публичного модуля террейна:
  - `apps/qryleth-front/src/entities/terrain/index.ts`.
- Создан каркас класса статических хелперов (без реализации эвристик):
  - `apps/qryleth-front/src/features/scene/lib/terrain/fit/TerrainHelpers.ts`:
    - `valleyFitToRecipes(...)` — возвращает заглушку `FitResult` и предупреждение (логика будет в Фазе 2).
    - `ridgeBandFitToRecipes(...)` — возвращает заглушку и вычисляет авто-направление вдоль длинной стороны `rect`.
    - `estimateOpsForRecipes(...)` — рабочая оценка бюджета.
    - `suggestGlobalBudget(...)` — рекомендация `maxOps` с запасом.

Все публичные методы снабжены детальными комментариями на русском языке.

## Непрерывность и обратная совместимость
- Изменения не затрагивают существующие сценарии; новые API не используются по умолчанию.
- Сборка/линт/тесты остаются зелёными (ожидаемо, т.к. добавлены изолированные файлы и экспорты).

## Следующие шаги (связь с Фазой 2)
- Реализовать эвристики автоподбора `step/radius/aspect/intensity`, учёт `edgeFade` и защиту от выхода за мир.
- Расширить предупреждения (`warnings`) и покрыть эвристику юнит-тестами.

## Результат
- [x] Типы Fit экспортируются из `@/entities/terrain`.
- [x] Класс `TerrainHelpers` добавлен, методы задокументированы.
- [x] API не ломает существующий функционал.

