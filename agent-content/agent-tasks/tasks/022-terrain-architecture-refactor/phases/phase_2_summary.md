---
title: "Фаза 2 — Вынесение построения геометрии"
status: completed
date: 2025-08-26
---

# Фаза 2 — Вынесение построения геометрии

Выполнено разделение ответственности: построение геометрии террейна вынесено из `GfxHeightSampler.ts` в отдельный модуль `GeometryBuilder.ts`. Также обновлена логика подбора количества сегментов в привязке к реальному разрешению источника высот.

## Сделанные изменения

- Новый файл: `apps/qryleth-front/src/features/scene/lib/terrain/GeometryBuilder.ts`.
  - Функция `buildGfxTerrainGeometry(cfg, sampler)` — формирует `THREE.BufferGeometry` из сэмплера.
  - Функция `decideSegments(cfg)` — подбирает число сегментов на основе разрешения источника:
    - Heightmap: `(imgWidth - 1, imgHeight - 1)`.
    - Perlin: `(width - 1, height - 1)`.
    - Берётся минимум по осям, затем результат ограничивается в диапазоне `[10, TERRAIN_MAX_SEGMENTS]`.
  - К обоим методам добавлены подробные комментарии на русском.

- Обновлён импорт в `LandscapeLayer.tsx`:
  - `buildGfxTerrainGeometry` теперь импортируется из `GeometryBuilder.ts`.
  - `createGfxHeightSampler` остаётся в `GfxHeightSampler.ts`.

- `apps/qryleth-front/src/features/scene/lib/terrain/GfxHeightSampler.ts`:
  - Удалены экспортируемые ранее `buildGfxTerrainGeometry` и `decideSegments` (перенос в новый модуль).
  - Очистка неиспользуемых импортов.

## Результаты

- Геометрия строится прежним образом; UI не менялся.
- Количество сегментов теперь ближе к реальному разрешению источника, что уменьшает undersampling/oversampling.
- Подготовлена база для дальнейшего распила сэмплера на подмодули (фаза 3).

## Затронутые файлы

- Добавлено: `apps/qryleth-front/src/features/scene/lib/terrain/GeometryBuilder.ts`.
- Изменено: `apps/qryleth-front/src/features/scene/ui/renderer/landscape/LandscapeLayer.tsx`.
- Изменено: `apps/qryleth-front/src/features/scene/lib/terrain/GfxHeightSampler.ts`.

## Примечания

- Документация API (`docs/api/types/terrain.md`) уже упоминает `buildGfxTerrainGeometry`; путь импорта для примеров можно обновить в рамках фазы 8 (обновление документации).

