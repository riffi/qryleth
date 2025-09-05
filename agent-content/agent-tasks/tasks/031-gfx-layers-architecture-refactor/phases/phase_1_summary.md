---
id: 31
phase: 1
title: "Фаза 1: Типы и модель данных (entities)"
status: done
created: 2025-09-05
updated: 2025-09-05
filesChanged: 6
---

# Фаза 1: Типы и модель данных (entities)

## Что сделано
- Добавлен базовый тип тонкого слоя `GfxLayerBase` (id, name, type) с подробной документацией (рус.).
- Расширено перечисление `GfxLayerType`: добавлен `Environment` (временный алиас `Clouds` сохранён для компиляции до завершения миграции).
- Подготовлены новые доменные типы содержимого:
  - `GfxWaterBody` (виды: sea|lake|river) и геометрии `GfxWaterSurface` (`rect|circle|polygon`).
  - `GfxCloudSet` (набор облаков) и контейнер окружения `GfxEnvironmentContent` (ветер, небо, туман, экспозиция).
  - `GfxLandscape` в составе модуля террейна (площадка: shape plane|terrain, size, center, material, terrain).
- В `SceneData` добавлены контейнеры содержимого: `landscapeContent`, `waterContent[]`, `environmentContent` (все опциональны для стадии миграции).

## Изменённые файлы
- apps/qryleth-front/src/entities/layer/model/types.ts
- apps/qryleth-front/src/entities/water/model/types.ts
- apps/qryleth-front/src/entities/water/index.ts
- apps/qryleth-front/src/entities/environment/model/types.ts
- apps/qryleth-front/src/entities/environment/index.ts
- apps/qryleth-front/src/entities/scene/types.ts
- apps/qryleth-front/src/entities/terrain/model/types.ts
- apps/qryleth-front/src/entities/terrain/index.ts

## Примечания
- Репозиторий остаётся в рабочем состоянии: старые поля не удалены на этой фазе в целях непрерывной сборки; удаление и обновление использования будут выполнены в последующих фазах.
- Введены подробные комментарии к новым типам на русском языке.

