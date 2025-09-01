---
id: 26
phase: 1
title: "Фаза 1: Виджет SceneEditor и выделение scene-layout"
status: done
created: 2025-09-01
updated: 2025-09-01
filesChanged: 7
---

# Фаза 1: Виджет SceneEditor и выделение scene-layout

## Цели фазы
- Добавить виджет `widgets/SceneEditor` как точку композиции (pages → widgets → features).
- Выделить фичу `features/scene-layout` и вынести в неё управление боковыми панелями и ресайзом.
- Перевести страницу `SceneEditorPage` на использование виджета.
- Интегрировать новую фичу в существующий редактор без изменения доменной логики сцены.

## Выполненные работы
- Создан виджет:
  - `apps/qryleth-front/src/widgets/SceneEditor/SceneEditor.tsx`
  - `apps/qryleth-front/src/widgets/SceneEditor/index.ts`
- Страница обновлена на виджет:
  - `apps/qryleth-front/src/pages/SceneEditorPage.tsx`
- Создана фича раскладки `scene-layout`:
  - `apps/qryleth-front/src/features/scene-layout/model/store.ts` — фасад над persist‑стором визуальных настроек.
  - `apps/qryleth-front/src/features/scene-layout/hooks/useScenePanelLayout.ts` — хук управления панелями и ресайзом.
  - `apps/qryleth-front/src/features/scene-layout/index.ts`
- Интеграция в SceneEditorR3F:
  - `apps/qryleth-front/src/features/scene/ui/SceneEditorR3F.tsx` — удалена внутренняя логика ресайза/инициализации, подключён `useScenePanelLayout`.

## Результат
- Устранено прямое использование фичи со страницы: теперь страница использует виджет.
- Логика раскладки/ресайза отделена от доменной логики сцены и вынесена в самостоятельную фичу.
- Соблюдены ограничения FSD: композиция только на уровне widgets, `scene-layout` не импортирует стор сцены.

## Влияние на код
- Добавлено: 5 файлов
- Обновлено: 2 файла
- Сборка и типы должны оставаться зелёными; поведение UI панелей неизменно.

## Следующие шаги (подготовка к Фазе 2)
- Вынести тулбары в `features/scene-toolbar` (презентационные).
- Вынести операции сохранения/загрузки в `features/scene-persistence` (чистые, без импорта стора сцены).

