---
task_id: 5
phase: 7
title: Создание новых задач (POST /api/tasks + UI)
status: done
created: 2025-08-19
updated: 2025-08-19
---

# Фаза 7: Создание новых задач

## Статус
✅ Выполнено

## Цели фазы
- Добавить форму создания новой задачи на фронтенде
- Реализовать POST /api/tasks на бэкенде
- Генерировать ID из `manager-state.json` и создавать файловую структуру

## Выполненная работа

1) Backend: endpoint POST /api/tasks
- Файл: `apps/agent-tasks-ui/backend/src/routes/tasks.ts`
- Добавлен маршрут `POST /api/tasks` с валидацией входных данных (title, tags, content, epic)

2) Backend: сервис создания задачи в ФС
- Файл: `apps/agent-tasks-ui/backend/src/services/fileSystemService.ts`
- Добавлена функция `createTask(input)`:
  - читает `manager-state.json`, получает `nextTaskId`
  - формирует `slug` из заголовка (включая транслитерацию кириллицы)
  - создаёт папку задачи и `phases/`
  - создаёт `AGENT_TASK_SUMMARY.md` с корректной YAML-шапкой
  - обновляет `manager-state.json` (nextTaskId, lastModified, counters)

3) Frontend: API метод
- Файл: `apps/agent-tasks-ui/frontend/src/services/apiService.ts`
- Добавлена функция `createTask(payload)` для вызова `POST /api/tasks`

4) Frontend: страница создания
- Файл: `apps/agent-tasks-ui/frontend/src/pages/NewTaskPage.tsx`
- Форма с полями: название, теги, Markdown-контент (Monaco Editor)
- Шаблон стартового контента; удаление YAML, если пользователь вставил его вручную
- После успешного создания — переход на `/tasks/{id}`

5) Frontend: маршрутизация и вход в форму
- Файл: `apps/agent-tasks-ui/frontend/src/App.tsx` — добавлен маршрут `/tasks/new`
- Файл: `apps/agent-tasks-ui/frontend/src/components/TasksPage.tsx` — кнопка «Создать задачу»

## Технические детали
- Slug формируется функцией `toSlug()` с транслитерацией кириллицы
- Имя папки: `NNN-slug` (NNN — ID с ведущими нулями)
- YAML-шапка включает: `id`, `epic`, `title`, `status`, `created`, `updated`, `owner`, `tags`, `phases: { total, completed }`
- Содержимое файла создаётся из переданного Markdown либо генерируется по шаблону

## Результат
- Пользователь может создать задачу через UI, данные сохраняются на диск
- ID генерируется автоматически и фиксируется в файловой структуре задач
- Приложение перенаправляет на страницу созданной задачи

## Рекомендации по дальнейшим шагам
- Добавить выбор эпика при создании (план фазы 9)
- Добавить пресеты тегов и автодополнение
- Расширить шаблон содержания под разные типы задач

