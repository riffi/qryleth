# Фаза 5: Интеграция с SceneAPI — отчет

## Выполненные изменения

- Добавлены новые методы в `SceneAPI` (`apps/qryleth-front/src/features/scene/lib/sceneAPI.ts`):
  - `generateProceduralTerrain(spec)` — обертка над `ProceduralTerrainGenerator.generateTerrain`.
  - `generateTerrainOpsFromPool(pool, seed, opts)` — проксирует в генератор с автоматическим определением размеров мира (из opts или активного Terrain-слоя).
  - `createProceduralLayer(spec, layerData?)` — собирает террейн по спецификации и создаёт слой через `createLayerWithAdjustment` (уведомления отключены для стабильности тестов).

- Созданы интеграционные тесты `sceneAPI.procedural-terrain.test.ts`:
  - Проверка детерминированности `generateProceduralTerrain`.
  - Генерация операций при явных размерах мира в `generateTerrainOpsFromPool`.
  - Создание слоя `createProceduralLayer` и возврат валидного `layerId`.

## Файлы

- Обновлено: `apps/qryleth-front/src/features/scene/lib/sceneAPI.ts`
- Добавлено: `apps/qryleth-front/src/features/scene/lib/sceneAPI.procedural-terrain.test.ts`

## Примечания по архитектуре

- `generateTerrainOpsFromPool` принимает расширенный `opts` с полями `worldWidth/worldHeight` для прозрачной интеграции с движком.
- При отсутствии явных размеров мира метод пытается использовать первый подходящий `Landscape/Terrain` слой из стора.
- `createProceduralLayer` использует унифицированный путь создания слоя и выравнивания, сохраняя обратную совместимость.

## Риски и ограничения

- Уведомления Mantine отключены для стабильного прогона тестов в CI.
- При отсутствии Terrain-слоев и не заданных размерах мира `generateTerrainOpsFromPool` выдаёт осмысленную ошибку.

## Следующие шаги

- Фаза 6: обновление ScriptingPanel и AI-подсказок под новые методы SceneAPI.

