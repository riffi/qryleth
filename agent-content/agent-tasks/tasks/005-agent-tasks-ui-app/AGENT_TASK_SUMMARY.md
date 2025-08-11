---
id: 5
epic: null
title: Agent Tasks UI Application - Интерфейс управления агентскими задачами
status: planned
created: 2025-08-07
updated: 2025-08-08
owner: team-ui
tags: [frontend, backend, ui, management, react, typescript, express]
phases:
  total: 23
  completed: 14
---

# Agent Tasks UI Application - Интерфейс управления агентскими задачами

## Контекст

В проекте qryleth существует система агентских задач с определенной структурой файлов и workflow, описанными в `docs/development/workflows/agent-tasks.md`. Все задачи хранятся в папке `agent-content/agent-tasks/` в виде markdown файлов со строгой структурой.

Для удобной работы с этими задачами необходимо создать веб-приложение, которое предоставит пользователю графический интерфейс для:
- Просмотра всех существующих задач и эпиков
- Поиска по задачам 
- Редактирования описаний задач напрямую в интерфейсе
- Создания новых задач
- Сохранения изменений обратно в markdown файлы

## Цели

1. **Создать полноценное веб-приложение** `apps/agent-tasks-ui` с фронтендом на React + Mantine + TypeScript + Vite и бэкендом на Express
2. **Реализовать CRUD операции** для агентских задач с сохранением в исходные markdown файлы
3. **Обеспечить удобный UX** для навигации, поиска и редактирования задач
4. **Интегрировать с существующей файловой структурой** agent-content без нарушения форматов

## Список фаз

### ✅ Фаза 1: Настройка архитектуры и базовой структуры проекта - ВЫПОЛНЕНО
- Создание папки `apps/agent-tasks-ui`
- Настройка Vite проекта с React, TypeScript, Mantine
- Настройка Express сервера 
- Базовая файловая структура фронтенда и бэкенда
**Отчет**: [phases/phase_1_summary.md](phases/phase_1_summary.md)

### ✅ Фаза 2: Backend API для чтения задач - ВЫПОЛНЕНО
- Создание Express роутов для получения списка задач и эпиков
- Парсинг markdown файлов и извлечение YAML метаданных
- API endpoints: GET /api/tasks, GET /api/epics, GET /api/tasks/:id, GET /api/epics/:id/tasks, GET /api/manager
**Отчет**: [phases/phase_2_summary.md](phases/phase_2_summary.md)

### ✅ Фаза 3: Frontend базовый интерфейс - ВЫПОЛНЕНО
- Настройка Mantine UI компонентов
- Создание компонентов для отображения списка задач
- Базовая навигация и layout приложения  
- Подключение к backend API
**Отчет**: [phases/phase_3_summary.md](phases/phase_3_summary.md)

### ✅ Фаза 4: Функционал поиска и фильтрации - ВЫПОЛНЕНО
- Реализация поиска по названию, тегам, статусу
- Фильтры для эпиков, статусов, дат
- Пагинация результатов
**Отчет**: [phases/phase_4_summary.md](phases/phase_4_summary.md)

### ✅ Фаза 4.1: Приведение задачи 003-gfx-primitive-groups к формату agent-tasks.md
- Добавлен `updated:` и блок `phases` в YAML шапку
- Секция «Список фаз» приведена к шаблону с корректными ссылками
- Все файлы `phase_*_summary.md` получили стандартные YAML шапки
- Файл: `agent-content/agent-tasks/tasks/003-gfx-primitive-groups/AGENT_TASK_SUMMARY.md`
**Отчёт**: [phases/phase_4.1_summary.md](phases/phase_4.1_summary.md)

### ✅ Фаза 4.2: Приведение задачи 004-new-lighting-system к формату agent-tasks.md
- Добавлен `updated` и блок `phases` в YAML шапку задачи
- Раздел «Список фаз» приведён к шаблону с корректными ссылками
- Все файлы `phase_*_summary.md` получили стандартные YAML шапки
- Файл: `agent-content/agent-tasks/tasks/004-new-lighting-system/AGENT_TASK_SUMMARY.md`
**Отчёт**: [phases/phase_4.2_summary.md](phases/phase_4.2_summary.md)

### ✅ Фаза 4.3: Приведение задачи 006-instanced-mesh-documentation к формату agent-tasks.md
- Добавлены поля `updated` и блок `phases` в YAML шапку задачи
- Раздел «Список фаз» оформлен по шаблону с корректными ссылками
- Отчёты фаз 1–4 получили стандартные YAML шапки
- Файл: `agent-content/agent-tasks/tasks/006-instanced-mesh-documentation/AGENT_TASK_SUMMARY.md`
**Отчёт**: [phases/phase_4.3_summary.md](phases/phase_4.3_summary.md)
### ✅ Фаза 4.4: Приведение задачи 002-fsd-repository-refactoring (эпик 001) к формату
- Поле `epic:` заменено на числовой ID `1`
- Добавлены `updated:` и блок `phases: { total, completed }`
- Секция «Список фаз» оформлена по шаблону и статусы уточнены
- Проверены ссылки на отчёты (при наличии)
- Файл: `agent-content/agent-tasks/epics/001-fsd-shared-layer-cleanup/tasks/002-fsd-repository-refactoring/AGENT_TASK_SUMMARY.md`
**Отчёт**: [phases/phase_4.4_summary.md](phases/phase_4.4_summary.md)

### ✅ Фаза 4.5: Приведение задачи 008-layout-persistence-and-handles (эпик 007) к формату
- Поле `epic` заменено на числовой ID `7`
- Добавлены поля `updated` и `phases` в YAML-шапку задачи
- Раздел «Фазы» преобразован в «Список фаз» с заголовками `⏳ Фаза N`
- Обновлена основная сводка задачи
**Отчёт**: [phases/phase_4.5_summary.md](phases/phase_4.5_summary.md)

### ✅ Фаза 4.6: Приведение задачи 009-hud-actions-and-hotkeys (эпик 007) к формату
- Поле `epic` заменено на числовой ID `7`
- Добавлены поля `updated` и `phases` в YAML-шапку задачи
- Раздел «Фазы» преобразован в «Список фаз» по шаблону
- Обновлена основная сводка задачи
**Отчёт**: [phases/phase_4.6_summary.md](phases/phase_4.6_summary.md)

### ✅ Фаза 4.7: Приведение задачи 010-object-manager-search-and-toggles (эпик 007) к формату
- Поле `epic` заменено на числовой ID `7`
- Добавлены поля `updated` и `phases` в YAML-шапку задачи
- Раздел «Фазы» преобразован в «Список фаз» по шаблону
- Обновлена основная сводка задачи
**Отчёт**: [phases/phase_4.7_summary.md](phases/phase_4.7_summary.md)

### ✅ Фаза 4.8: Приведение задачи 011-context-menu-and-snaps (эпик 007) к формату
- Поле `epic` заменено на числовой ID `7`
- Добавлены поля `updated` и `phases` в YAML-шапку задачи
- Раздел «Фазы» преобразован в «Список фаз» по шаблону
- Обновлена основная сводка задачи
**Отчёт**: [phases/phase_4.8_summary.md](phases/phase_4.8_summary.md)

### ✅ Фаза 4.9: Приведение задачи 012-command-palette-and-help (эпик 007) к формату
- Поле `epic` заменено на числовой ID `7`
- Добавлены поля `updated` и `phases` в YAML-шапку задачи
- Раздел «Фазы» преобразован в «Список фаз» по шаблону
- Обновлена основная сводка задачи
**Отчёт**: [phases/phase_4.9_summary.md](phases/phase_4.9_summary.md)

### ✅ Фаза 4.10: Приведение задачи 013-performance-and-virtualization (эпик 007) к формату
- Поле `epic` заменено на числовой ID `7`
- Добавлены поля `updated` и `phases` в YAML-шапку задачи
- Раздел «Фазы» преобразован в «Список фаз» по шаблону
- Обновлена основная сводка задачи
**Отчёт**: [phases/phase_4.10_summary.md](phases/phase_4.10_summary.md)


### ⏳ Фаза 5: Редактирование задач
- Реализовать страницу - карточку задачи, на странице необходимо отображать:
  - Форма редактирования YAML метаданных задачи
    - название задачи с возможностью редактирования inline
    - номер задачи( не редактируемое)
    - дата создания( не редактируемое)
    - эпик(если есть привязка)( не редактируемое)
    - теги(редактируемое)
  - Markdown c данными AGENT_TASK_SUMMARY: режим просмотра(по-умолчанию) и редактирования. 
    - При редактировании скрывать кусок yaml, при сохранении собирать его из данных формы редактирования yaml

### ⏳ Фаза 6: Сохранение изменений в файлы
- Backend API для обновления задач: PUT /api/tasks/:id
- Сохранение изменений обратно в markdown файлы
- Валидация формата и структуры

### ⏳ Фаза 7: Создание новых задач
- Форма создания новой задачи
- Автоматическая генерация ID из manager-state.json
- POST /api/tasks endpoint
- Создание файловой структуры для новой задачи

### ⏳ Фаза 8: Работа с фазами задач
- Отображение списка фаз для каждой задачи  
- Просмотр содержимого phase_*_summary.md файлов
- Обновление статусов фаз

### ⏳ Фаза 9: Работа с эпиками
- CRUD операции для эпиков
- Связывание задач с эпиками
- Визуализация структуры эпик → задачи

### ⏳ Фаза 10: UI/UX полировка и оптимизация
- Улучшение интерфейса
- Добавление loading состояний
- Error handling и уведомления
- Responsive дизайн

### ⏳ Фаза 11: Обновить документацию
- Добавление README для apps/agent-tasks-ui
- Обновить основную документацию проекта docs согласно выполненной работе
- Инструкции по запуску и использованию
- Документация API endpoints

## Технические требования

- **Frontend**: React 19, TypeScript, Mantine UI, Vite
- **Backend**: Express.js, Node.js  
- **Хранение данных**: Файловая система (markdown файлы)
- **Парсинг**: gray-matter для YAML front matter
- **Интеграция**: Сохранение в существующую структуру agent-content/
