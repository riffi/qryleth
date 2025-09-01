---
id: 26
phase: 3
title: "Фаза 3: scene-play-mode и расширение object-library"
status: done
created: 2025-09-01
updated: 2025-09-01
filesChanged: 10
---

# Фаза 3: scene-play-mode и расширение object-library

## Цели
- Создать фичу `features/scene-play-mode/` с презентационной панелью PlayOverlay (без импорта стора сцены).
- Расширить `features/object-library/`: добавить store поиска, API-обёртки и общий браузер `LibraryBrowser`.
- Интегрировать play‑overlay и новый браузер в композицию.

## Выполнено
- Добавлена фича Play Mode:
  - `apps/qryleth-front/src/features/scene-play-mode/ui/PlayControls.tsx` — презентационная панель управления (view mode + Exit).
  - `apps/qryleth-front/src/features/scene-play-mode/hooks/usePlayMode.ts` — заготовка для будущей логики.
  - `apps/qryleth-front/src/features/scene-play-mode/index.ts` — экспорт.
- Интеграция PlayOverlay:
  - `apps/qryleth-front/src/features/scene/ui/SceneEditorR3F.tsx` — принимает `PlayOverlayComponent` через пропсы; рендерит его в Play.
  - `apps/qryleth-front/src/widgets/SceneEditor/SceneEditor.tsx` — подключён `PlayControls` из новой фичи.
- Расширение object-library:
  - `apps/qryleth-front/src/features/object-library/model/libraryStore.ts` — zustand‑стор строки поиска.
  - `apps/qryleth-front/src/features/object-library/lib/api.ts` — API-обёртки загрузки сцен/объектов из Dexie.
  - `apps/qryleth-front/src/features/object-library/lib/hooks/useLibrarySearch.ts` — общий хук поиска.
  - `apps/qryleth-front/src/features/object-library/lib/hooks/useLibraryFilters.ts` — заготовка для фильтров.
  - `apps/qryleth-front/src/features/object-library/ui/LibraryBrowser.tsx` — общий браузер со вкладками Сцены/Объекты.
  - Экспорт обновлён в `features/object-library/index.ts` и `ui/index.ts`.
- Обновление использования:
  - `apps/qryleth-front/src/pages/LibraryPage.tsx` — переведён на `useLibrarySearch` (hook фичи); браузер пока не внедрён целиком (доступен и готов к замене UI на следующем шаге), чтобы не ломать текущую верстку и сценарии.

## Результат
- Play UI отделён в собственную фичу и подключается через виджет без прямых import из `features/scene`.
- Библиотека получила общий браузер, стор поиска и API-обёртки; страница уже использует общий хук поиска.

## Следующее
- Завершить замену UI в `LibraryPage` на `LibraryBrowser` целиком (при необходимости отдельной мини‑фазой без изменения логики удаления/нотификаций).
