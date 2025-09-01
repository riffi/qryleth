---
id: 27
phase: 6
title: "Фаза 6: Миграция импортов на новый неймспейс"
status: done
created: 2025-09-01
updated: 2025-09-01
filesChanged: 8
---

# Отчёт по фазе 6

## Что сделано
- Добавлены реэкспортные слои для нового неймспейса:
  - `apps/qryleth-front/src/features/editor/object/hooks/index.ts` — хуки ObjectEditor (в т.ч. `useGlobalPanelState`).
  - `apps/qryleth-front/src/features/editor/object/lib/index.ts` — `saveUtils`, offscreen‑рендерер (`ObjectRendererR3F`), `ObjectEditorApi`.
  - Обновлён корневой индекс `apps/qryleth-front/src/features/editor/object/index.ts` — теперь экспортирует `hooks` и `lib`.

- Переведены внешние импорты на новый неймспейс `features/editor/object`:
  - `apps/qryleth-front/src/pages/ObjectEditorPage.tsx:4,11-12` — `PanelToggleButtons`, `useGlobalPanelState`, `buildUpdatedObject`, `generateObjectPreview`.
  - `apps/qryleth-front/src/widgets/SceneEditor/SceneEditor.tsx:5-6` — `PanelToggleButtons`, `useGlobalPanelState`.
  - `apps/qryleth-front/src/widgets/ObjectEditor/ObjectEditor.tsx:3-4` — `ObjectEditorR3F`, `useGlobalPanelState`.
  - `apps/qryleth-front/src/features/scene/ui/objectManager/SceneObjectManager.tsx:44` — `generateObjectPreview`.
  - `apps/qryleth-front/src/features/object-library/ui/LibraryObjectCard/HoverInteractivePreview.tsx:5` — `ObjectRendererR3F`.

- Проверена сборка фронтенда: `apps/qryleth-front` собирается успешно.

## Примечание
- Физический перенос исходников из `features/object-editor/*` в `features/editor/object/*` запланирован отдельным шагом (массовая операция с последующей правкой относительных импортов). Импорты приложения уже используют новый неймспейс, что снижает риск регрессий при переносе файлов.

## DoD (в рамках этой фазы)
- Внешние места использования переведены на `@/features/editor/object/*`.
- Build успешный, типы корректны.

