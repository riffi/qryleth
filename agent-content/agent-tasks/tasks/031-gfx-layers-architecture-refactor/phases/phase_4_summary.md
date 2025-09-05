---
id: 31
phase: 4
title: "Фаза 4: UI и ScriptingPanel"
status: done
created: 2025-09-05
updated: 2025-09-05
filesChanged: 7
---

# Фаза 4: UI и ScriptingPanel

## Что сделано
- Новая модалка базового слоя (type/name): `LayerBasicModal.tsx`.
- Новое окно для GfxLandscape: `LandscapeItemModal.tsx` — включает:
  - выбор формы (plane/terrain), размеры, центр, цвет;
  - источник террейна: Perlin/Heightmap;
  - загрузку PNG heightmap и/или выбор из коллекции ассетов (Dexie);
  - нормализацию высот (min/max), wrap (clamp/repeat);
  - формирование `GfxTerrainConfig` внутри элемента.
- Новое окно для GfxWaterBody: `WaterBodyModal.tsx` — вид водоёма, прямоугольная область, высота, шейдер/яркость.
- SceneObjectManager: добавлены секции «Ландшафт (новая архитектура)» и «Водные слои (новая архитектура)» с подсписками и кнопками CRUD (добавить/редактировать/удалить).
- Удалён legacy компонент `SceneLayerModals.tsx`; экспорт очищен.
- ScriptingPanel: обновлён список методов для автокомплита под новую архитектуру (`getLandscapeContent`, `addLandscape`, `updateLandscape`, `removeLandscape`, `getWaterContent`, `addWaterBody`, `updateWaterBody`, `removeWaterBody`).

## Изменённые/добавленные файлы
- apps/qryleth-front/src/features/editor/scene/ui/objectManager/LayerBasicModal.tsx
- apps/qryleth-front/src/features/editor/scene/ui/objectManager/LandscapeItemModal.tsx
- apps/qryleth-front/src/features/editor/scene/ui/objectManager/WaterBodyModal.tsx
- apps/qryleth-front/src/features/editor/scene/ui/objectManager/SceneObjectManager.tsx
- apps/qryleth-front/src/features/editor/scene/ui/index.ts
- apps/qryleth-front/src/features/editor/scene/ui/ScriptingPanel/constants/methodDocs.ts

## Примечания
- Вода: поддержка кругов/полигонов будет добавлена в отдельной фазе.
- UI окружения/облаков оставлен без изменений на этой фазе.

