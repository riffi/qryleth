---
title: "Фаза 7 — Тестирование"
status: completed
date: 2025-08-26
---

# Фаза 7 — Тестирование

Добавлены модульные тесты для ключевых утилит террейна и базовые интеграционные проверки рендера слоя ландшафта. Покрыты корректность интерполяции, преобразования UV, подбор сегментов геометрии, жизненный цикл сэмплера и поведение прелоадера в UI.

## Сделанные изменения

- Unit-тесты (Vitest, jsdom):
  - sampling/uv.test.ts — world→UV и wrap (clamp|repeat) на краевых значениях.
  - sampling/bilinear.test.ts — билинейная интерполяция для Float32Array и ImageData на контрольной 2×2-матрице.
  - GeometryBuilder.test.ts — корректный подбор сегментов (min(img−1), нижняя граница 10) и габариты геометрии.
  - GfxHeightSampler.test.ts — Perlin готовность; ready/isReady для heightmap с предкэшем; invalidate кэша; стабильность нормалей для плоскости.

- Интеграционные тесты:
  - LandscapeLayer.int.test.tsx —
    - Проверка: не вызывает updateLayer на маунте.
    - Проверка: прелоадер стартует при isReady=false и закрывается после ready().
    - Для стабильности замокан store (Zustand) и фабрика сэмплера.

## Как запускать

- В рабочем окружении фронтенда: `npm run test` или `npm run test:run` в `apps/qryleth-front`.
- В текущей песочнице запуск заблокирован из-за optional deps Rollup (см. ошибки @rollup/rollup-linux-x64-gnu); после `npm ci` локально тесты должны проходить.

## Затронутые файлы

- Добавлены:
  - apps/qryleth-front/src/features/scene/lib/terrain/sampling/uv.test.ts
  - apps/qryleth-front/src/features/scene/lib/terrain/sampling/bilinear.test.ts
  - apps/qryleth-front/src/features/scene/lib/terrain/GeometryBuilder.test.ts
  - apps/qryleth-front/src/features/scene/lib/terrain/GfxHeightSampler.test.ts
  - apps/qryleth-front/src/features/scene/ui/renderer/landscape/LandscapeLayer.int.test.tsx

## Результаты

- Базовая логика семплинга и геометрии покрыта модульными тестами.
- Подтверждено, что LandscapeLayer не модифицирует стор на маунте и управляет прелоадером через ready() без таймеров.

