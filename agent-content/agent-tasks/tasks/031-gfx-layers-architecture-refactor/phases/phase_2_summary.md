---
id: 31
phase: 2
title: "Фаза 2: Хранилище сцены и SceneAPI (CRUD)"
status: done
created: 2025-09-05
updated: 2025-09-05
filesChanged: 6
---

# Фаза 2: Хранилище сцены и SceneAPI (CRUD)

## Что сделано
- SceneStore:
  - Добавлены контейнеры новой архитектуры: `landscapeContent`, `waterContent`, `environmentContent` с привязкой по `layerId`.
  - Методы CRUD для окружения: `setEnvironmentContent`, `setEnvironmentLayer`, `addCloudSet`, `updateCloudSet`, `removeCloudSet`, `setEnvWind*`, `setEnvSky`, `setEnvFog`, `setEnvExposure`.
  - Методы CRUD для ландшафта: `setLandscapeContent`, `setLandscapeLayer`, `addLandscapeItem`, `updateLandscapeItem`, `removeLandscapeItem`.
  - Методы CRUD для воды: `setWaterContent`, `addWaterBody`, `updateWaterBody`, `removeWaterBody`.
  - Legacy-совместимость: существующие `setWind*` теперь синхронизируют `environmentContent.wind`.
  - `getCurrentSceneData` и `loadSceneData` расширены новыми контейнерами (legacy `environment` сохраняется до завершения миграции UI/рендеров).

- SceneAPI:
  - Добавлены высокоуровневые CRUD обёртки для `environment`, `landscape`, `water`.
  - Отказались от концепции слоя `Environment`: окружение хранится в обязательном `environmentContent` без привязки к слою.
  - `generateProceduralClouds` переведён на работу с `environmentContent.cloudSets` (создаёт CloudSet; `clearBefore` очищает наборы).

## Изменённые файлы
- apps/qryleth-front/src/features/editor/scene/model/store-types.ts
- apps/qryleth-front/src/features/editor/scene/model/sceneStore.ts
- apps/qryleth-front/src/features/editor/scene/lib/sceneAPI.ts

## Примечания
- Legacy поле `environment` в store оставлено и синхронизируется для сохранения работоспособности рендера облаков до Фазы 3.
- Все новые методы снабжены русскими комментариями и описаниями поведения.
