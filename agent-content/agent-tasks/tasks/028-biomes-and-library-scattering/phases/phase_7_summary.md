---
id: 28
phase: 7
title: "Фаза 7: Интеграция биомов в sceneAPI (scatter/regenerate)"
status: done
created: 2025-09-02
updated: 2025-09-02
filesChanged: 1
---

# Фаза 7: Интеграция биомов в sceneAPI

## Что сделано
- Добавлены методы SceneAPI для работы с биомами и скаттерингом:
  - getBiomes, addBiome, updateBiome, removeBiome
  - getInstancesByBiomeUuid
  - scatterBiome(biomeUuid, opts?) — добавляет новые инстансы (append)
  - regenerateBiomeInstances(biomeUuid, opts?) — удаляет старые и создаёт новые (replace)
- Реализовано создание/реиспользование объектов сцены по libraryUuid через ensureSceneObjectsForLibrary.
- Применяется автоподстройка высоты по террейну через adjustAllInstancesForTerrainAsync (GfxHeightSampler под капотом).
- Все операции выполняются через store (addObject/addObjectInstance/setObjectInstances) — UI не трогает store напрямую.

## Примечания
- Возвращаются сводки created/deleted и предупреждения (например, пустой результат генерации).
- Все вычисления (размещения, fade/bias, RNG) — в чистом ядре; sceneAPI выполняет связывание с данными сцены и высотами.

## Следующие шаги
- Фаза 8: UI «Биомы» — раздел в SceneObjectManager с действиями через sceneAPI.

