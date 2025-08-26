---
title: "Фаза 5 — UI/Store: чистый LandscapeLayer и ready()"
status: completed
date: 2025-08-26
---

# Фаза 5 — UI/Store: чистый LandscapeLayer и ready()

Цель: устранить побочные эффекты из рендера `LandscapeLayer`, перевести ожидание готовности террейна на `sampler.ready()` и гарантировать, что Terrain‑слой создаётся сразу с валидной конфигурацией.

## Сделанные изменения

- `apps/qryleth-front/src/features/scene/ui/renderer/landscape/LandscapeLayer.tsx`:
  - Удалена логика создания default terrain и вызовы `updateLayer` из рендера.
  - Добавлено ожидание `sampler.ready()` в `useEffect` без таймеров; прелоадер (`start/finishTerrainApplying`) привязан к реальной готовности.
  - Убран принудительный `key` у `<mesh>`; добавлено корректное освобождение геометрии (`geometry.dispose()`) при размонтировании/пересоздании.
  - Для слоёв без `terrain` возвращается плоскость (защитный путь) — создание валидного террейна обеспечивается в SceneAPI.

- `apps/qryleth-front/src/features/scene/lib/terrain/GfxHeightSampler.ts`:
  - Добавлены методы жизненного цикла: `isReady()`, `ready()`, `dispose()` с подробными комментариями.
  - `ready()` инициирует загрузку высот/изображения для heightmap и резолвит промис после готовности.

- `apps/qryleth-front/src/entities/terrain/model/types.ts`:
  - Интерфейс `GfxHeightSampler` расширен методами `isReady`, `ready`, `dispose`.

- `apps/qryleth-front/src/features/scene/lib/sceneAPI.ts`:
  - `createLayerWithAdjustment(...)`: при создании Terrain‑слоя без конфигурации автоматически задаётся валидный Perlin‑террейн (seed: 1234, octaveCount: 4, amplitude: 0.1, persistence: 0.5, сетка ограничена до 200 по каждой оси).

## Результаты

- Рендер `LandscapeLayer` не модифицирует стор, отсутствуют побочные эффекты в вычислениях `useMemo`.
- Состояние прелоадера синхронизировано с фактической готовностью данных (`ready()`), без таймаутов.
- Создание Terrain‑слоя теперь всегда сопровождается валидной конфигурацией террейна через `SceneAPI`.

## Затронутые файлы

- Изменены: `LandscapeLayer.tsx`, `GfxHeightSampler.ts`, `sceneAPI.ts`, `entities/terrain/model/types.ts`.

