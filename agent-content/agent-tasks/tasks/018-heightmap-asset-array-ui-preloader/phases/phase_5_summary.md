---
title: "Фаза 5: Прелоадер применения heightmap и блокировка рендера"
---

# Фаза 5: Прелоадер применения heightmap и блокировка рендера

Цель фазы — добавить UI‑индикацию и блокировку рендера на время применения карты высот (heightmap), чтобы предотвратить мерцания и частично применённые состояния во время асинхронной загрузки/миграции данных.

## Сделано
- Добавлен флаг состояния `isTerrainApplying` и экшены `startTerrainApplying`/`finishTerrainApplying` в Zustand‑store сцены:
  - Файл: `apps/qryleth-front/src/features/scene/model/store-types.ts`
  - Файл: `apps/qryleth-front/src/features/scene/model/sceneStore.ts`
  - Экспортирован селектор `useIsTerrainApplying`.
- Интеграция в рендер ландшафта (`LandscapeLayer`):
  - Перед началом семплинга heightmap вызывается `startTerrainApplying()`;
  - В колбэке `sampler.onHeightmapLoaded` вызывается `finishTerrainApplying()` и выполняется локальный рефреш геометрии (как ранее);
  - Убраны лишние `console.log` в продакшене (обёртка DEBUG).
  - Файл: `apps/qryleth-front/src/features/scene/ui/renderer/landscape/LandscapeLayer.tsx`.
- Подключён `LoadingOverlay` в `Scene3D`, привязанный к флагу `isTerrainApplying` для блокировки рендера:
  - Файл: `apps/qryleth-front/src/features/scene/ui/renderer/Scene3D.tsx`.
- Ограничены подробные логи в `GfxHeightSampler` для production‑сборки (DEBUG‑флаг):
  - Файл: `apps/qryleth-front/src/features/scene/lib/terrain/GfxHeightSampler.ts`.

## Пояснения по реализации
- `startTerrainApplying()` устанавливается при источнике `heightmap` непосредственно перед генерацией геометрии, так как семплинг запускает асинхронную загрузку/миграцию данных в сэмплере.
- `finishTerrainApplying()` вызывается из `onHeightmapLoaded` — этот колбэк срабатывает как при загрузке `ImageData`, так и при получении массива высот (`heights`) после «ленивой миграции».
- Чтобы не засорять консоль в продакшене, детальные логи обёрнуты в `DEBUG` (основан на `import.meta.env.MODE`).

## Изменённые файлы
- `apps/qryleth-front/src/features/scene/model/store-types.ts`
- `apps/qryleth-front/src/features/scene/model/sceneStore.ts`
- `apps/qryleth-front/src/features/scene/ui/renderer/landscape/LandscapeLayer.tsx`
- `apps/qryleth-front/src/features/scene/ui/renderer/Scene3D.tsx`
- `apps/qryleth-front/src/features/scene/lib/terrain/GfxHeightSampler.ts`

## Результат
При выборе/применении heightmap сцена отображает прелоадер и блокирует взаимодействие до завершения загрузки/миграции данных высот. После получения высот выполняется корректная регенерация геометрии террейна без «рывков», а лишние логи скрыты в продакшене.

