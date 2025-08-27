---
id: 25
phase: 4
title: "Фаза 4: Интеграция в SceneAPI и ScriptingPanel"
status: done
created: 2025-08-27
updated: 2025-08-27
filesChanged: 2
notes:
  - integration: sceneapi-bridge
  - scope: helpers-proxy
---

# Фаза 4: Интеграция в SceneAPI и ScriptingPanel

## Изменения
- SceneAPI (прокси‑методы к TerrainHelpers, без создания слоя):
  - Файл: `apps/qryleth-front/src/features/scene/lib/sceneAPI.ts`
  - Методы:
    - `terrainValleyFitToRecipes(rect, options, world, edgeFade?)`
    - `terrainRidgeBandFitToRecipes(rect, options, world, edgeFade?)`
    - `terrainEstimateOpsForRecipes(recipes)`
    - `terrainSuggestGlobalBudget(recipes, margin?)`
    - `terrainAutoBudget(recipes, maxOps)`
- ScriptingPanel bridge:
  - Файл: `apps/qryleth-front/src/features/scene/ui/ScriptingPanel/utils/sceneApiBridge.ts`
  - Экспортирован раздел `sceneApi.terrainHelpers.*` с соответствующими методами.

Все методы только генерируют операции и оценки для встраивания в существующий сценарий. Сборка `spec.pool` и вызов `createProceduralLayer(...)` остаются в текущем пайплайне.

## Результат
- [x] Доступ к fit‑хелперам из скриптового окружения через `sceneApi.terrainHelpers.*`.
- [x] Полностью сохранена обратная совместимость; слои не создаются автоматически хелперами.

