---
id: 27
phase: 5
title: "Фаза 5: Документация и выверка FSD"
status: done
created: 2025-09-01
updated: 2025-09-01
filesChanged: 3
---

# Отчёт по фазе 5

- Обновлена документация SceneEditor с учётом embedded‑интеграции ObjectEditor:
  - `docs/features/scene-management/README.md:268` — дерево модулей теперь указывает `ObjectEditor` вместо `ObjectEditorR3F`.
  - Раздел о редакторе объекта переименован и дополнен: `ObjectEditor (widget)` с описанием embedded‑режима и синхронизации панелей.
- Добавлено пояснение в Getting Started по новому неймспейсу:
  - `docs/getting-started/README.md:58` — заметка о `features/editor/object/*` (реэкспорт API) и режимах `widgets/ObjectEditor`.
- Подтверждены соглашения FSD:
  - `features/editor/object/*` — новый неймспейс реэкспортов без переноса исходников (миграция безопасна).
  - Persist ширин панелей ObjectEditor унифицирован через `shared/model/visualSettingsStore` (поля `object*`).

## Рекомендации на будущее
- При необходимости жёстко зафиксировать границы импортов через ESLint (`eslint-plugin-import`, правило `import/no-restricted-paths`).
- После стабилизации — перевести импорты с `features/object-editor/*` на `features/editor/object/*` и перенести файлы.

