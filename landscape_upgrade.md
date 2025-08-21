# AGENT_TASK: Рефакторинг хранения и генерации Landscape

## As Is

-   Геометрия слоя Landscape создаётся через `createPerlinGeometry`,
    результатом является geometry + noiseData.
-   В `LandscapeLayer` noiseData сохраняется в слой при первом
    рендере【28†source】.
-   В `ObjectPlacementUtils` высота для размещения объектов вычисляется
    независимо, но похожим образом.
-   В `GfxLayer` хранится `noiseData?: number[]`.

## To Be

1.  **Единый источник высоты**
    -   Ввести типы `TerrainSource`, `DeltaGrid`, `TerrainConfig`.
    
```typescript
export type TerrainSource =
| { kind: 'perlin'; params: PerlinParams }
| { kind: 'heightmap'; params: HeightmapParams }
| { kind: 'legacy'; data: Float32Array; width: number; height: number }; // для миграции
```

    -   Реализовать `HeightSampler` с методами `getHeight(x,z)` и
        `getNormal(x,z)`.
    -   Все вычисления высот (рендер и размещение объектов) должны идти
        через `HeightSampler`.
2.  **Seed вместо noiseData**
    -   Использовать seed‑friendly noise (например, simplex-noise или
        open-simplex-noise).
    -   В `TerrainSource` для perlin хранить только параметры + seed.
3.  **Дельта (возвышенности/впадины)**
    -   Хранить отдельным гридом `DeltaGrid` (Float32Array).
    -   При вычислении высоты использовать bilinear-интерполяцию из
        дельты и прибавлять к базовой высоте.
4.  **Импорт heightmap**
    -   Поддержать `TerrainSource.kind = 'heightmap'`.
    -   Сохранять PNG в Dexie (таблица assets), хранить `assetId`.
    -   Сэмплинг высоты через bilinear из `ImageData`.
5.  **Геометрия**
    -   Добавить функцию `buildTerrainGeometry(cfg, sampler)` для
        генерации `PlaneGeometry` с высотами.
    -   В `LandscapeLayer` заменить `createPerlinGeometry` на вызов
        `buildTerrainGeometry`.
    -   Убрать сохранение `noiseData` в слой.
6.  **Миграция**
    -   Старые сцены с `noiseData` → `TerrainSource.kind = 'legacy'`.
    -   Новые сцены → только seed/heightmap + delta.

## Acceptance Criteria

-   Оба места (рендер и ObjectPlacementUtils) используют один
    `HeightSampler`.
-   В БД (Dexie) для новых сцен не хранится `noiseData`, только seed или
    assetId + delta.
-   Возможность загрузить PNG heightmap и отрисовать слой.
-   Возможность процедурно модифицировать дельту (штампы add/sub).
