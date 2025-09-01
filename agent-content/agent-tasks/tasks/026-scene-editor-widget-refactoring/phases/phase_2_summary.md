---
id: 26
phase: 2
title: "Фаза 2: scene-toolbar (презентационная) и scene-persistence (чистая)"
status: done
created: 2025-09-01
updated: 2025-09-01
filesChanged: 8
---

# Фаза 2: scene-toolbar (презентационная) и scene-persistence (чистая)

## Цели фазы
- Вынести тулбары в отдельную фичу `features/scene-toolbar` (чисто презентационные компоненты).
- Вынести операции сохранения/загрузки в `features/scene-persistence` (чистые функции + модалка сохранения).
- Обновить виджет `SceneEditor` для композиции новых фич и делегирования сохранения.
- Исключить `feature → feature` импорт из `features/scene`: теперь тулбары передаются в `SceneEditorR3F` как компоненты через пропсы.

## Выполненные работы
- Добавлена фича тулбаров (реэкспорт как первый шаг миграции):
  - `apps/qryleth-front/src/features/scene-toolbar/ui/SceneEditorToolBar.tsx`
  - `apps/qryleth-front/src/features/scene-toolbar/ui/LeftToolbar.tsx`
  - `apps/qryleth-front/src/features/scene-toolbar/ui/RightToolbar.tsx`
  - `apps/qryleth-front/src/features/scene-toolbar/index.ts`
- Добавлена фича сохранения сцен:
  - `apps/qryleth-front/src/features/scene-persistence/lib/persistence.ts` — `saveNewScene`, `updateExistingScene`.
  - `apps/qryleth-front/src/features/scene-persistence/ui/SaveModal.tsx` — презентационный модал сохранения.
  - `apps/qryleth-front/src/features/scene-persistence/index.ts`.
- Виджет `SceneEditor` теперь композирует фичи и обрабатывает сохранение:
  - `apps/qryleth-front/src/widgets/SceneEditor/SceneEditor.tsx` — добавлены:
    - передача тулбаров как `LeftToolbarComponent/RightToolbarComponent/TopToolbarComponent` в `SceneEditorR3F`;
    - делегирование сохранения сцены через `onSaveSceneRequest`;
    - показ `SaveModal` и вызов чистых функций сохранения;
    - установка `sceneMetaData` и нотификации после сохранения.
- `SceneEditorR3F` больше не импортирует тулбары и локальную модалку сохранения:
  - принимает компоненты тулбаров через пропсы;
  - делегирует сохранение через `onSaveSceneRequest`;
  - удалена локальная `SaveSceneModal`.

## Результат
- Композиция фич осуществляется из виджета (widgets → features), а фича `scene` не импортирует другие фичи — соблюдение FSD.
- Сохранение сцены изолировано в чистой фиче `scene-persistence`; модалка — презентационная.
- UI тулбаров оформлен как самостоятельная фича и подключается без зависимостей на сторы.

## Влияние на код
- Добавлено: 6 файлов
- Обновлено: 2 файла
- Поведение UI не изменилось; логика сохранения перенесена на уровень виджета.

## Следующие шаги (подготовка к Фазе 3)
- Выделить `scene-play-mode` (UI Play) без импорта стора сцены; подключать через виджет.
- Расширить `object-library` до полноценной фичи (store/hooks/UI) и использовать в LibraryPage/SceneEditor.

