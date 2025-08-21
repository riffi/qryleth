---
id: 15
phase: 7
title: "Фаза 7: Обновление документации (Play‑режим, хоткеи, store)"
status: done
created: 2025-08-21
updated: 2025-08-21
filesChanged: 3
notes:
  - scope: docs update, play-mode, store api
---

# Фаза 7: Обновление документации (Play‑режим, хоткеи, store)

## Что сделано

### Хоткеи сцены
- Обновлён раздел «Клавиатурные сокращения редактора сцены»: добавлены Play/Esc и 1/2/3 для переключения камер в Play, описано отключение прочих хоткеев и разблокировка мыши при выходе.

### Scene Store API
- Добавлено описание новых полей состояния: `uiMode`, `renderProfile`, `cameraPose`.
- Документированы методы: `setUiMode`, `togglePlay`, `setRenderProfile`, `saveCameraPose`, `restoreCameraPose`.
- Добавлена подсекция «Camera Pose / Поза камеры» с примерами использования.

### Компоненты редактора
- Расширена документация `SceneEditorR3F`: описан Play‑оверлей (панель камер, кнопка Exit, подсказка 1/2/3), правила видимости UI и поведение камеры.

## Изменённые файлы
- `docs/features/scene-management/keyboard-shortcuts.md`
- `docs/api/stores/scene-store.md`
- `docs/api/components/scene-editor.md`

## Результат
- [x] Документация по хоткеям дополнена и согласована с реализацией Play‑режима.
- [x] Scene Store API описывает новые поля/методы, связанные с Play и профилем рендера.
- [x] Документация компонентов отражает текущий UX Play‑оверлея в `SceneEditorR3F`.

