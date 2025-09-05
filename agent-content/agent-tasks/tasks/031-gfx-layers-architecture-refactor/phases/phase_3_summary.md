---
id: 31
phase: 3
title: "Фаза 3: Рендеринг (Clouds/Water/Landscape)"
status: done
created: 2025-09-05
updated: 2025-09-05
filesChanged: 4
---

# Фаза 3: Рендеринг (Clouds/Water/Landscape)

## Что сделано
- Облака: обновлён рендер на `environmentContent.cloudSets` и `environmentContent.wind`.
  - Файл: apps/qryleth-front/src/features/editor/scene/ui/renderer/environment/CloudLayers.tsx
- Ландшафт: добавлен новый рендер контейнера `landscapeContent.items` (plane/terrain, color/multiColor).
  - Файл: apps/qryleth-front/src/features/editor/scene/ui/renderer/landscape/LandscapeContentLayers.tsx
- Вода: добавлен рендер `waterContent` для прямоугольных областей (rect). Поддержка circle/polygon отмечена для следующих фаз.
  - Файл: apps/qryleth-front/src/features/editor/scene/ui/renderer/landscape/WaterContentLayers.tsx
- Подключение новых рендеров в сцену (параллельно с legacy до полной миграции):
  - Файл: apps/qryleth-front/src/features/editor/scene/ui/renderer/SceneContent.tsx

## Примечания
- Рендер воды через `waterContent` пока поддерживает только `surface.kind = 'rect'`.
- Legacy рендер слоёв ландшафта/воды оставлен параллельно; переключение на новые контейнеры будет завершено после миграции данных и UI.

