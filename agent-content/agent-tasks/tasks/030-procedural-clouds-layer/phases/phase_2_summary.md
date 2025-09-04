---
id: 30
phase: 2
title: "Фаза 2: Процедурный генератор облаков и методы SceneAPI"
status: done
created: 2025-09-04
updated: 2025-09-04
filesChanged: 4
---

# Фаза 2: Процедурный генератор облаков и методы SceneAPI — выполнено

## Краткое резюме
Добавлен процедурный генератор облаков с детерминированностью по `seed` и поддержкой стратегий размещения `uniform`, `poisson`, `gridJitter`. В `SceneAPI` реализованы методы управления ветром и CRUD/генерации облачных слоёв, включая создание облачного слоя при отсутствии `layerId` и автоопределение области из первого Terrain‑слоя.

## Изменённые файлы
- apps/qryleth-front/src/entities/cloud/model/types.ts — добавлены типы `GfxCloudPlacementArea`, `GfxCloudAppearanceMeta`, `GfxProceduralCloudSpec`.
- apps/qryleth-front/src/features/editor/scene/lib/clouds/ProceduralCloudGenerator.ts — новый генератор облаков.
- apps/qryleth-front/src/features/editor/scene/lib/sceneAPI.ts — импорт генератора и реализация методов: `getWind`, `setWind`, `setWindDirection`, `setWindSpeed`, `getCloudLayers`, `createCloudLayer`, `updateCloudLayer`, `removeCloudLayer`, `generateProceduralClouds`.
- apps/qryleth-front/src/entities/layer/model/types.ts — ранее добавлена поддержка слоя `Clouds` (Фаза 1), используется текущей логикой.

## Проверки
- Повторные вызовы `generateProceduralClouds` с одинаковым seed и параметрами возвращают одинаковые наборы `items` (детерминированность обеспечивается PRNG утилитами).
- При отсутствии `spec.area` — область берётся из размеров первого Terrain‑слоя (`worldWidth/worldDepth`), иначе возвращается ошибка.
- `clearBefore` корректно очищает текущий список `items` слоя перед добавлением.

## Примечания
- Визуальные параметры для `<Cloud>` вычисляются из `appearance` и записываются в `advancedOverrides` каждого `GfxCloudItem`, что упрощает дальнейший рендер.

