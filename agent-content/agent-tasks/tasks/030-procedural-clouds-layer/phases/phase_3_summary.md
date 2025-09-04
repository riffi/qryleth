---
id: 30
phase: 3
title: "Фаза 3: Рендер слоёв облаков и дрейф по ветру"
status: done
created: 2025-09-04
updated: 2025-09-04
filesChanged: 2
---

# Фаза 3: Рендер слоёв облаков и дрейф по ветру — выполнено

## Краткое резюме
Добавлен компонент `CloudLayers`, который рендерит все слои `GfxLayerType.Clouds`, читает глобальный ветер из store и анимирует дрейф облаков. В `SceneContent` подключён новый компонент вместо устаревшего `CloudLayer`.

## Изменённые файлы
- apps/qryleth-front/src/features/editor/scene/ui/renderer/environment/CloudLayers.tsx — новый рендерер слоёв облаков с анимацией по ветру.
- apps/qryleth-front/src/features/editor/scene/ui/renderer/SceneContent.tsx — заменён `CloudLayer` на `CloudLayers`.

## Примечания
- Формула дрейфа: смещение на кадр = `wind.direction * wind.speed * dt`. Для облаков учитывается `driftFactor` (если задан в `advancedOverrides`).
- При отсутствии слоёв облаков компонент ничего не рендерит (пустое небо).

