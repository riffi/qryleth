---
id: 26
phase: 4
title: "Фаза 4: Очистка scene, доменные типы в entities, финализация"
status: done
created: 2025-09-01
updated: 2025-09-01
filesChanged: 8
---

# Фаза 4: Очистка scene и перенос доменных типов

## Сделано
- Перенесены доменные типы в entities:
  - `SceneStatus`, `SceneMetaData` добавлены в `apps/qryleth-front/src/entities/scene/types.ts`.
  - Обновлены импорты: `features/scene/model/store-types.ts`, `features/scene/ui/SceneEditorR3F.tsx`, `features/scene/ui/objectManager/SceneHeader.tsx`.
- Устранён import `object-editor` из фичи `scene`:
  - В `SceneEditorR3F` удалены импорт и модалка редактора объекта; добавлен проп `onRequestEditObject`.
  - Виджет `widgets/SceneEditor/SceneEditor.tsx` теперь рендерит модал с `ObjectEditorR3F` и обрабатывает сохранение объекта.
- Завершена интеграция библиотеки:
  - Страница `LibraryPage` использует `LibraryBrowser` и хук `useLibrarySearch`.
  - Вызовы `db.getAllScenes/Objects` заменены на API фичи (`loadScenes/loadObjects`).

## Результат
- `features/scene` очищена от панелей/модалок/редактора, остались только рендер и состояния сцены.
- Межфичевых импортов в `scene` нет; композиция происходит в виджете.
- Доменные типы определены в `entities` и переиспользуются без дублирования.

## Примечания
- Местами могут остаться неиспользуемые импорты (например, Mantine Textarea) — рекомендуется пройти авто‑линт/рефактор перед коммитом.
