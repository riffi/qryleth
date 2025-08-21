---
id: 15
phase: 1
title: "Фаза 1: Enum-перечисления и базовое состояние uiMode/renderProfile/cameraPose"
status: done
created: 2025-08-21
updated: 2025-08-21
filesChanged: 3
notes:
  - scope: shared/ui-types, sceneStore
---

# Фаза 1: Enum-перечисления и базовое состояние uiMode/renderProfile/cameraPose

## Что сделано
- Добавлены enum-перечисления в `shared/types/ui`:
  - `UiMode`, `RenderProfile`, `ViewModeEnum`, `RenderModeEnum`, `TransformModeEnum`.
- Добавлен интерфейс `CameraPose` для сохранения/восстановления позы камеры.
- В `SceneStoreState` добавлены поля: `uiMode`, `renderProfile`, `cameraPose`.
- Реализованы экшены стора: `setUiMode`, `togglePlay`, `setRenderProfile`, `saveCameraPose`, `restoreCameraPose`.
- К каждому новому методу и полю добавлены подробные комментарии на русском языке.
- Сохранены строковые тип-алиасы (`ViewMode`, `RenderMode`, `TransformMode`) для совместимости на период миграции.

## Изменённые файлы
- `apps/qryleth-front/src/shared/types/ui/index.ts`
- `apps/qryleth-front/src/features/scene/model/store-types.ts`
- `apps/qryleth-front/src/features/scene/model/sceneStore.ts`

## Результат
- [x] Сборка зелёная, поведение в режиме редактирования не изменилось.
- [x] Новые enum-ы и флаги доступны для следующих фаз.
- [x] Подготовлено хранение позы камеры.

