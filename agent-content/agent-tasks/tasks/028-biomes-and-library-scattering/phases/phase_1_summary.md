---
id: 28
phase: 1
title: "Фаза 1: Доменные типы биомов и расширение сцены"
status: done
created: 2025-09-02
updated: 2025-09-02
filesChanged: 7
---

# Фаза 1: Доменные типы биомов и расширение сцены

## Что сделано
- Добавлен домен биомов и типы областей/параметров скаттеринга:
  - `apps/qryleth-front/src/entities/biome/model/types.ts`
  - `apps/qryleth-front/src/entities/biome/index.ts`
- `SceneData` расширен полем `biomes: GfxBiome[]`:
  - `apps/qryleth-front/src/entities/scene/types.ts`
- Экспорт биомов в общий barrel:
  - `apps/qryleth-front/src/entities/index.ts`
- Инстансы объектов связаны с биомом через `biomeUuid?: string`:
  - `apps/qryleth-front/src/entities/objectInstance/model/types.ts`
- Zustand‑store сцены: добавлены состояние и экшены для биомов (`biomes`, `setBiomes`, `addBiome`, `updateBiome`, `removeBiome`), загрузка/сериализация:
  - `apps/qryleth-front/src/features/editor/scene/model/store-types.ts`
  - `apps/qryleth-front/src/features/editor/scene/model/sceneStore.ts`

## Примечания
- Биомы не привязаны к слоям (это другой разрез), по требованию.
- Все типы снабжены подробными русскими комментариями.

## Следующие шаги
- Реализовать ядро скаттеринга (фаза 3).
- Добавить UI редактирования биомов (фаза 4).
- Встроить управление биомами в `sceneAPI` и `ScriptingPanel` (фаза 5).

