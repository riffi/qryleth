# Changelog / История изменений

Документ фиксирует заметные архитектурные и функциональные обновления проекта. Для деталей реализации см. соответствующие разделы в документации.

---

## 2025-09 — Рефакторинг SceneEditor под FSD

- Введён виджет `widgets/SceneEditor` — точка композиции редактора.
- Монолит `SceneEditorR3F` разделён по зонам ответственности:
  - `features/editor/scene/layout` — панели и ресайз (persist фасад).
  - `features/editor/scene/toolbar` — презентационные тулбары.
  - `features/scene-persistence` — SaveModal и чистые функции сохранения.
  - `features/scene-play-mode` — Play‑overlay и хоткеи Play (1/2/3/4, Esc).
- Доменные типы сцены `SceneStatus`, `SceneMetaData` вынесены в `entities/scene`.
- Страница библиотеки использует общий `LibraryBrowser` и хук поиска `useLibrarySearch`.

## 2025-09 — Выравнивание по террейну и индикатор осей

- Флаг `alignToTerrain` разделён на: `alignToTerrainHeight` (Y) и `alignToTerrainRotation` (поворот по нормали). По умолчанию: высота — включена, автоповорот — выключен.
- Исправлена математика автоповорота по нормали (X/Z без «зеркал»), добавлено масштабирование наклона: 0° нормали → 0°, 90° → `MAX_TERRAIN_TILT_DEG` (по умолчанию 30°).
- `maxTerrainTiltDeg` доступен в `metadata` стратегий размещения (Random/RandomNoCollision/PlaceAround).
- В `SceneEditor` добавлен экранный индикатор осей (Viewport Gizmo) — фиксировано в правом нижнем углу.

## 2025-08 — Рефакторинг ChatInterface под FSD

- Полный переход на архитектуру Feature-Sliced Design.
- Созданы shared chat entities для переиспользования.
- Введены специализированные ChatInterface для сцен и объектов.
- Новая система панелей для ObjectEditor.

## 2025-08 — Рефакторинг ландшафтных слоёв

- Введена унифицированная система террейна `GfxTerrainConfig`.
- Единый источник высот через `GfxHeightSampler` (рендер + размещение).
- Поддержка PNG heightmap (Dexie) и `TerrainOps` (локальные модификации).
- Обновлён `LandscapeLayer` и UI создания слоя (загрузка PNG).
- Дедупликация PNG heightmap по хэшу высот в Dexie: повторная загрузка идентичной карты переиспользует существующий ассет.
- Введены `sampler.isReady()/ready()/dispose()`; UI ждёт `ready()` без таймеров.
- Выделены модули: sources/sampling/ops/effects/assets; `GeometryBuilder.ts`.
- Кэши heightmap с TTL/LRU и `invalidate(assetId)` для консистентности.
## 2025-09 — ColorSource: hueTowards и насыщенность

- Добавлены новые корректировки для источника цвета `ColorSource`:
  - `hueTowards: { deg: number; t: number }` — интерполяция оттенка (Hue) к целевому значению по кратчайшей дуге.
  - `saturationShift: number` — сдвиг насыщенности (Saturation) в диапазоне `[-1..+1]`.
- Поведение `tint` (яркость, Value) сохранено: диапазон `[-1..+1]`, клампинг в `[0..1]`.
- Порядок применения корректировок: сначала `hueTowards`, затем `saturationShift`, затем `tint`.
- Поддержка ColorSource на стопах многоцветной палитры террейна (применяется ДО интерполяции по высоте).
- Исправление: при нормализации `multiColor` в `sceneStore` сохраняется `colorSource` у стопов (раньше терялся и давал белый цвет).

