---
id: 18
phase: 2
title: "Фаза 2: Масштабирование PNG ≤200×200 и первичное заполнение высот"
status: done
created: 2025-08-22
updated: 2025-08-22
filesChanged: 2
notes:
  - upload: resize→save blob + heights
  - lazy migration for old assets
---

# Фаза 2: Масштабирование PNG ≤200×200 и первичное заполнение высот

## Что сделано
- Реализовано масштабирование входного PNG до ≤200 пикселей по большей стороне в `uploadTerrainAsset` с последующим извлечением высот и сохранением в Dexie:
  - добавлен helper `resizeBitmapToMaxSize` (canvas ресайз с билинейной фильтрацией, `imageSmoothingQuality='high'`);
  - `uploadTerrainAsset` теперь сохраняет уже масштабированный PNG blob и сразу записывает `heightsBuffer` и `heightsWidth/Height`.
- Добавлена «ленивая миграция» старых записей без высот:
  - `loadTerrainHeightsFromAsset` при отсутствии высот вызывает `performLazyHeightsMigration`, которая масштабирует blob ≤200, обновляет запись (blob+габариты) и сохраняет высоты.
- В базу данных добавлен метод `updateTerrainAssetImage` для обновления blob и размеров без затрагивания высот.

## Изменённые файлы
- `apps/qryleth-front/src/features/scene/lib/terrain/HeightmapUtils.ts`
- `apps/qryleth-front/src/shared/lib/database.ts`

## Результат
- Все новые импортируемые карты высот хранятся в масштабе ≤200×200, а их высотные массивы сразу подготовлены и сохранены.
- Старые ассеты автоматически мигрируют при первом запросе высот: PNG пересохраняется в масштабе ≤200, высоты рассчитываются и записываются в Dexie.

## Критерии успешности
- [x] Масштабирование при загрузке до ≤200 с сохранением пропорций.
- [x] Сохранение масштабированного PNG blob, корректных `width/height`, а также `heightsBuffer/Width/Height`.
- [x] «Ленивая миграция» старых записей без высот активируется автоматически при чтении высот.

