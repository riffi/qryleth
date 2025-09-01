# Компоненты редактора сцены

Этот документ описывает публичный состав редактора сцен после рефакторинга под FSD.

- `widgets/SceneEditor/SceneEditor.tsx` — главный виджет‑координатор (точка композиции)
- `features/scene/ui/SceneEditorR3F.tsx` — визуализация сцены (Canvas, R3F)
- `features/scene/ui/objectManager/SceneObjectManager.tsx` — менеджер объектов/слоёв
- `features/scene-toolbar` — презентационные тулбары (верхний/левый/правый)
- `features/scene-layout` — управление видимостью/ресайзом боковых панелей
- `features/scene-persistence` — модал сохранения и чистые операции сохранения/обновления
- `features/scene-play-mode` — Play‑overlay (управление камерой и выход)

Композиция выполняется только в слое `widgets`.

## Виджет `SceneEditor`

- Путь: `apps/qryleth-front/src/widgets/SceneEditor/SceneEditor.tsx`
- Ответственность: собирает всё вместе (SceneEditorR3F + тулбары + панели + модалки).
- Делегирование:
  - Сохранение сцен — через `features/scene-persistence` (чистые функции + SaveModal).
  - Редактор объекта (`ObjectEditorR3F`) — рендерится в модалке на уровне виджета.
  - Тулбары и Play‑overlay — подставляются как компоненты через пропсы в `SceneEditorR3F`.
  - Хоткеи Play (1/2/3/4, Esc) — через `features/scene-play-mode/usePlayHotkeys`.

## `SceneEditorR3F` — визуализация и Play‑режим

- Путь: `apps/qryleth-front/src/features/scene/ui/SceneEditorR3F.tsx`
- Ответственность: Canvas, рендер сцены, интеграция контролов и синхронизация со стором сцены.
- Важные пропсы:
  - `LeftToolbarComponent/RightToolbarComponent/TopToolbarComponent` — презентационные тулбары
  - `PlayOverlayComponent` — оверлей режима Play (камера + выход)
  - `onSaveSceneRequest(payload)` — запрос на сохранение (виджет решает стратегию)
  - `onRequestEditObject(objectUuid, instanceId?)` — запрос открыть редактор объекта (виджет рендерит модал)
- Режимы:
  - `UiMode.Edit` — доступны панели и гизмо трансформации
  - `UiMode.Play` — скрываются хедер/панели; поверх канвы рендерится `PlayOverlayComponent`

## `scene-layout` — панели и ресайз

- Состояние раскладки: свёрнутость левой панели (чат/скриптинг), свёрнутость правой, ширины, первичная адаптация под экран.
- Публичный API: хук `useScenePanelLayout()` — инкапсулирует persist‑хранилище визуальных настроек.

## `scene-persistence` — сохранение/загрузка

- Чистые функции: `saveNewScene(name, data)`, `updateExistingScene(uuid, name, data)`.
- UI: `SaveModal` — презентационный, вызывает переданный `onSave(name, description?)`.

## Play‑режим

- Оверлей: `features/scene-play-mode/ui/PlayControls.tsx` — переключение камер и выход из Play.
- Хоткеи: `features/scene-play-mode/hooks/usePlayHotkeys.ts` (1/2/3/4 и Esc), глобальный toggle по `P` — в `features/scene/lib/hooks/useKeyboardShortcuts.ts`.
- Скорость полёта (`FlyControls`): клавиши `NumpadAdd/NumpadSubtract` меняют скорость и рассылают событие `flySpeedChange`; оверлей может показывать текущее значение.

## Ландшафтные слои (Landscape)

- Компоненты: `features/scene/ui/renderer/landscape/*`
- Геометрия: `GfxHeightSampler` и `buildGfxTerrainGeometry` — единый источник высот для рендера и размещения.
- Источники: Perlin, PNG heightmap (Dexie); UI создания слоя — `SceneLayerModals.tsx`.
- Дедупликация PNG по хэшу высот (повторные загрузки переиспользуют ассет в Dexie).

## Экранный индикатор осей (Viewport Gizmo)

- Реализация: `@react-three/drei` (`GizmoHelper` + `GizmoViewport`).
- Расположение: правый нижний угол, поверх пост‑обработки.
- Код: `apps/qryleth-front/src/features/scene/ui/renderer/controls/ViewportAxesHelper.tsx`, подключение в `SceneContent.tsx`.
