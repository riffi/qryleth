# Компоненты редактора сцены

Документ описывает ключевые компоненты интерфейса редактора сцен.

- `SceneHeader` — панель с названием и действиями над сценой
- `SceneObjectManager` — список объектов и слоёв сцены
  - расположен в каталоге `src/features/scene/ui/objectManager/SceneObjectManager.tsx`
  - использует `SceneObjectManagerContext` для передачи общих данных
- `SceneEditorR3F` — Canvas на базе Three.js для визуализации
 - Экранный индикатор осей (Viewport Gizmo) — фиксированный помощник ориентации камеры

Компоненты расположены в каталоге `src/features/scene/ui/` и экспортируются через `index.ts`.

## SceneEditorR3F — Play‑режим

В составе `SceneEditorR3F` реализован Play‑режим просмотра сцены в пределах той же страницы:
- Глобальный флаг `uiMode` берётся из стора (`UiMode.Edit | UiMode.Play`).
- В `Edit` доступны все панели и инструменты, камера — Orbit.
- В `Play` скрываются хедер/панели; поверх канвы показывается компактная панель с:
  - кнопкой `Exit` (выход из Play),
  - переключателем камер `Orbit/Walk/Fly` (синхронизирован с хоткеями 1/2/3),
  - постоянной подсказкой «1 — Orbit, 2 — Walk, 3 — Fly».

Кнопка Play рендерится в `header.rightSection` страницы редактора и вызывает `togglePlay()` из стора. Переходы выполняются без пересоздания сцены.

---

## Ландшафтные слои (Landscape)

- Компоненты: `src/features/scene/ui/renderer/landscape/LandscapeLayers.tsx`, `LandscapeLayer.tsx`
- Генерация геометрии выполняется через `GfxHeightSampler` и `buildGfxTerrainGeometry`, что обеспечивает единый источник высот для рендера и логики размещения.
- Поддерживаются источники: Perlin, PNG heightmap (через Dexie).
- UI создания слоя поддерживает загрузку PNG и настройки (min/max, wrap) — см. `SceneLayerModals.tsx`.
- При загрузке PNG выполняется дедупликация по хэшу высот: повторная загрузка идентичной карты переиспользует уже существующий ассет в Dexie.

---

## Экранный индикатор осей (Viewport Gizmo)

- Реализация: `@react-three/drei` (`GizmoHelper` + `GizmoViewport`).
- Расположение: правый нижний угол, поверх пост‑обработки.
- Назначение: наглядно показывает направления осей X/Y/Z независимо от позиции камеры.
- Код: `apps/qryleth-front/src/features/scene/ui/renderer/controls/ViewportAxesHelper.tsx` и подключение в `SceneContent.tsx`.
