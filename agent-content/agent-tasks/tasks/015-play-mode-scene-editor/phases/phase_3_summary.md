---
id: 15
phase: 3
title: "Фаза 3: Хоткеи Play/Esc и переключение камер 1–3 (через enum)"
status: done
created: 2025-08-21
updated: 2025-08-21
filesChanged: 1
notes:
  - scope: scene-keyboard-hotkeys
---

# Фаза 3: Хоткеи Play/Esc и переключение камер 1–3 (через enum)

## Что сделано
- Расширен хук `useKeyboardShortcuts` для поддержки Play‑режима:
  - `P` — глобальный toggle Play (в любом `UiMode`).
  - `Esc` — выход из Play (только при `UiMode.Play`).
  - `1/2/3` — в Play: переключение камер на `ViewModeEnum.Orbit/Walk/Fly`.
  - В Play все прочие хоткеи редактора отключены.
- При выходе из Play выполняется `document.exitPointerLock()` (если был активен pointer lock), чтобы не залипала мышь в Walk/Fly.
- Игнорирование ввода в `input/textarea`, CodeMirror и во время drag‑resize панелей (эвристика по `document.body.style.cursor`).
- Добавлен подробный JSDoc‑комментарий к хуку на русском языке.

## Изменённые файлы
- `apps/qryleth-front/src/features/scene/lib/hooks/useKeyboardShortcuts.ts`

## Результат
- [x] В Play работают `1/2/3` и `P/Esc`; в Edit — прежние хоткеи.
- [x] При выходе из Play мышь разблокируется.
- [x] Ввод в поля/редактор не прерывается хоткеями.

