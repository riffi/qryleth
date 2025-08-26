---
title: "Фаза 4 — Нормали и динамический шаг выборки"
status: completed
date: 2025-08-26
---

# Фаза 4 — Нормали и динамический шаг выборки

Реализован динамический `sampleStep` для расчёта нормалей в `GfxHeightSampler`, завязанный на разрешение источника высот (Perlin/heightmap). Обновлён метод `getNormal` с детальными комментариями и обработкой пограничных случаев.

## Сделанные изменения

- `apps/qryleth-front/src/features/scene/lib/terrain/GfxHeightSampler.ts`:
  - Добавлен метод `updateSampleStepBasedOnSource()`:
    - Определяет размеры решётки источника: для Perlin — `params.width/height`, для heightmap — `heightsField` → `ImageData` → `imgWidth/imgHeight`.
    - Вычисляет базовый шаг: `base = min(worldW/(gridW-1), worldH/(gridH-1))`.
    - Применяет ограничения: `stepMin = worldMin/1000`, `stepMax = worldMin/10`.
    - Устанавливает `this.sampleStep = clamp(base, stepMin, stepMax)`.
  - Вызовы `updateSampleStepBasedOnSource()` добавлены:
    - В конструкторе после создания функции-источника.
    - После загрузки `ImageData` heightmap.
    - После загрузки числового поля высот (`heightsField`).
  - `getNormal(x,z)` переписан с подробным комментарием:
    - Центральные разности по X/Z с использованием текущего `sampleStep`.
    - Векторное произведение касательных, нормализация, защита от вырожденных случаев.

## Результаты

- Нормали стабильно рассчитываются при любых масштабах мира и для различных разрешений источника.
- При появлении более точных данных источника (heightsField/ImageData) шаг автоматически адаптируется.

## Затронутые файлы

- Изменён: `apps/qryleth-front/src/features/scene/lib/terrain/GfxHeightSampler.ts`.

