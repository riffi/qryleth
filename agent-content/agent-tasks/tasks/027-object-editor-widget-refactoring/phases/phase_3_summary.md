---
id: 27
phase: 3
title: "Фаза 3: Рефакторинг неймспейса features/editor/object"
status: done
created: 2025-09-01
updated: 2025-09-01
filesChanged: 6
---

# Отчёт по фазе 3

- Введён новый неймспейс `features/editor/object/*` с реэкспортами существующего `features/object-editor/*`:
  - `apps/qryleth-front/src/features/editor/object/index.ts` — корневой индекс (ui/model/renderer/properties/chat + AI‑регистрация).
  - `apps/qryleth-front/src/features/editor/object/ui/index.ts` — реэкспорт UI.
  - `apps/qryleth-front/src/features/editor/object/model/index.ts` — реэкспорт модели.
  - `apps/qryleth-front/src/features/editor/object/renderer/index.ts` — реэкспорт 3D частей.
  - `apps/qryleth-front/src/features/editor/object/properties/index.ts` — реэкспорт панелей свойств.
  - `apps/qryleth-front/src/features/editor/object/chat/index.ts` — реэкспорт интерфейса чата.

## Мотивация
- Предоставить стабильный новый путь импорта без массового переноса файлов на этой фазе.
- Снизить риск регрессий: существующие импорты из `features/object-editor` продолжают работать.

## Следующие шаги
- На последующих фазах: фактический перенос исходников под `features/editor/object/*` и постепенная замена импортов по коду.
- Разграничение доменов через ESLint (`import/no-restricted-paths`) после подключения `eslint-plugin-import`.

