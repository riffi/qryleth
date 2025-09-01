---
id: 27
phase: 7
title: "Фаза 7: ESLint ограничения импортов и обновление документации"
status: done
created: 2025-09-01
updated: 2025-09-01
filesChanged: 4
---

# Отчёт по фазе 7

## Изменения ESLint
- Добавлено правило `no-restricted-imports` (flat-config) в `apps/qryleth-front/eslint.config.js:8`:
  - Запрещает импорты из `@/features/object-editor/*` с подсказкой использовать `@/features/editor/object/*`.
- Цель: зафиксировать переход на новый неймспейс без необходимости добавлять `eslint-plugin-import`.

## Обновление документации
- Автоматически обновлены пути в документации на `features/editor/object/*`:
  - `docs/api/stores/README.md:161` — пример импорта `useObjectStore`.
  - `docs/features/ai-integration/llm-integration.md:59` — место регистрации Object Editor Tools.

## Состояние
- Локальные импорты в кодовой базе указывают на новый неймспейс.
- Доки отражают актуальные пути в ключевых разделах. Оставшаяся редактуры — по мере надобности.

