# Агентская задача: Перевод приложения на Feature-Sliced Design

Эта задача предназначена для реорганизации исходного кода Qryleth по правилам FSD. Требования к ведению агентских задач описаны в [AGENT_TASKS.md](../docs/AGENT_TASKS.md). При выполнении каждой фазы обязательно сверяйтесь с [qryleth_architecture_guidelines.md](../docs/qryleth_architecture_guidelines.md).

## Контекст
Проект уже частично использует FSD‑структуру (`app`, `pages`, `features`, `widgets`, `entities`, `shared`), но часть кода расположена вне слоев или нарушает правило доступа. Например, в каталоге `src/shared/r3f` находятся обёртки над three.js, которые по гайду должны быть в `boundaries`. Также папка `src/hooks` содержит общие хуки, которые стоит перенести в соответствующие слои. API‑обращения к Dexie и OpenAI располагаются в `shared/lib` и требуют вынесения в `boundaries`.

## План работ
Ниже приведён список фаз. Каждая фаза должна быть самостоятельной и не затрагивать более ~15 файлов, чтобы приложение оставалось рабочим после её выполнения.

1. **Переместить R3F primitives и environment**
   - Создать каталог `src/boundaries/r3f`.
   - Переместить содержимое `src/shared/r3f/primitives` и `src/shared/r3f/environment` в новый каталог.
   - Обновить пути импорта в `features/scene` и `features/object-editor`.
2. **Переместить R3F optimization**
   - Перенести `src/shared/r3f/optimization` в `src/boundaries/r3f/optimization`.
   - Исправить импорты в зависимых файлах.
3. **Выделить слой базы данных**
   - Создать `src/boundaries/local-db` и перенести туда `src/shared/lib/database.ts`.
   - Прописать новые импорты в местах использования.
4. **Выделить слой OpenAI API и настроек**
   - Создать `src/boundaries/openai` и переместить `openAIAPI.ts`, `openAISettings.ts`, `systemPrompt.ts`.
   - Исправить импорты в коде и разделить публичный/приватный API.
5. **Распределить общие хуки по слоям**
   - Перенести `src/hooks/r3f` в `features/scene/hooks`.
   - Перенести `src/hooks/objectEditor` в `features/object-editor/hooks`.
   - Удалить устаревшую папку `src/hooks`.

По завершении каждой фазы создавайте отчёт в `phases/phase_[номер]_summary.md` и отмечайте её как выполненную ниже.

## Выполнение фаз
| Фаза | Статус | Отчёт |
|------|--------|-------|
| 1    | `Запланировано` | – |
| 2    | `Запланировано` | – |
| 3    | `Запланировано` | – |
| 4    | `Запланировано` | – |
| 5    | `Запланировано` | – |
