---
id: 28
phase: 3
title: "Фаза 3: Скаттеринг по биомам (ядро)"
status: done
created: 2025-09-02
updated: 2025-09-02
filesChanged: 4
---

# Фаза 3: Скаттеринг по биомам (ядро)

## Что сделано
- Реализован модуль утилит областей биома (плоскость XZ):
  - `apps/qryleth-front/src/features/scene/lib/biomes/BiomeAreaUtils.ts`
  - Проверка попадания точки; подписанное расстояние до границы; fade‑вес; bias‑вес; оценка площади.
  - Поддержаны формы: `rect` (с `rotationY`), `circle`, `polygon`.
  - Использованы shared типы (`shared/types/geo2d`) и математика (`shared/lib/math/number`).
- Равномерная выборка с учётом fade/bias:
  - `apps/qryleth-front/src/features/scene/lib/biomes/RandomSampling.ts`
  - Оценка целевого числа точек по плотности и площади; rejection sampling в пределах bounds.
- Выборка Poisson‑disk (blue noise):
  - `apps/qryleth-front/src/features/scene/lib/biomes/PoissonDiskSampler.ts`
  - Грид‑акселерация, проверка соседей, fallback добор при недостатке выборки.
- Оркестратор скаттеринга:
  - `apps/qryleth-front/src/features/scene/lib/biomes/BiomeScattering.ts`
  - Фильтры источников по тегам/исключениям/весам, детерминированный RNG по `seed`.
  - Применение трансформаций: `randomYawDeg`, `randomUniformScale`, `randomOffsetXZ`.
  - Выход — чистый массив `{ position, rotationYDeg, uniformScale, libraryUuid }`.

## Примечания
- Все функции чистые; никакой модификации store — интеграция будет в фазе 5 (sceneAPI/ScriptingPanel).
- Для геометрии и математики использованы только shared типы и функции, без дублирования.
- Комментарии ко всем публичным функциям — на русском языке.

## Следующие шаги
- Фаза 4: UI «Биомы» (раздел в SceneObjectManager, модалки, контекстное меню, 3D‑оверлей).
- Фаза 5: sceneAPI (scatter/regenerate) и инструменты ScriptingPanel.

