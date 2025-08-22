---
id: 18
phase: 1
title: "Фаза 1: Схема Dexie и утилиты извлечения высот"
status: done
created: 2025-08-22
updated: 2025-08-22
filesChanged: 2
notes:
  - db: terrainAssets.heightsBuffer/width/height
  - utils: extract/save/load heights
---

# Фаза 1: Схема Dexie и утилиты извлечения высот

## Что сделано
- Расширен тип записи `TerrainAssetRecord` полями:
  - `heightsBuffer?: ArrayBuffer`, `heightsWidth?: number`, `heightsHeight?: number` — хранение массива высот и его размеров.
- Добавлены методы БД:
  - `updateTerrainAssetHeights(assetId, heights, width, height)` — сохранение высот;
  - `getTerrainAssetHeights(assetId)` — чтение высот с восстановлением `Float32Array`.
- Добавлены утилиты в `HeightmapUtils`:
  - `extractHeightsFromImageData(imageData, opts)` — получение `Float32Array` высот из `ImageData` с нормализацией;
  - `saveTerrainHeightsToAsset(assetId, heights, width, height)` — запись высот;
  - `loadTerrainHeightsFromAsset(assetId)` — чтение высот.

Все новые методы снабжены подробными комментариями на русском языке.

## Изменённые файлы
- `apps/qryleth-front/src/shared/lib/database.ts`
- `apps/qryleth-front/src/features/scene/lib/terrain/HeightmapUtils.ts`

## Результат
- База данных готова к хранению массивов высот, извлечённых из PNG.
- Есть утилиты для конвертации `ImageData` → `Float32Array` и записи/чтения высот.
- Обратная совместимость сохранена: если высоты отсутствуют, чтение возвращает `null` (миграция — в Фазе 2).

## Критерии успешности
- [x] Тип `TerrainAssetRecord` поддерживает высоты и их размеры.
- [x] Методы записи/чтения высот реализованы и документированы.
- [x] Утилита извлечения высот из `ImageData` с нормализацией реализована и документирована.

