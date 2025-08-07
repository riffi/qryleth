# Agent Tasks UI

Веб-приложение для управления агентскими задачами в проекте qryleth.

## Структура проекта

```
apps/agent-tasks-ui/
├── frontend/          # React + Mantine + TypeScript фронтенд
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── hooks/        # Пользовательские хуки
│   │   ├── pages/        # Страницы приложения
│   │   ├── services/     # API вызовы
│   │   └── types/        # TypeScript типы
│   ├── package.json
│   └── vite.config.ts
├── backend/           # Express.js бэкенд
│   ├── src/
│   │   ├── routes/       # Express роуты
│   │   ├── services/     # Бизнес-логика
│   │   ├── types/        # TypeScript типы
│   │   └── utils/        # Утилиты
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Технологии

### Frontend
- **React 19** - UI библиотека
- **TypeScript** - типизация
- **Mantine UI** - компоненты интерфейса
- **Vite** - сборщик проекта
- **React Router** - маршрутизация

### Backend  
- **Express.js** - веб-сервер
- **TypeScript** - типизация
- **gray-matter** - парсинг YAML front matter из markdown файлов
- **fs-extra** - расширенные функции для работы с файловой системой

## Запуск разработки

### Backend (порт 3002)
```bash
cd backend
npm install
npm run dev
```

### Frontend (порт 3001)
```bash
cd frontend  
npm install
npm run dev
```

## API Endpoints

### Проверка состояния
- `GET /api/health` - проверка работоспособности сервера

## Цели приложения

1. **Просмотр задач** - отображение всех агентских задач и эпиков
2. **Поиск и фильтрация** - поиск по названию, тегам, статусу
3. **Редактирование** - изменение описаний задач через веб-интерфейс
4. **CRUD операции** - создание, чтение, обновление, удаление задач
5. **Файловая синхронизация** - сохранение изменений в markdown файлы

## Интеграция с существующей структурой

Приложение работает с существующей файловой структурой:
```
agent-content/agent-tasks/
├── epics/
│   └── [id]-[slug]/
│       ├── epic.md
│       └── tasks/
├── tasks/
│   └── [id]-[slug]/
│       ├── AGENT_TASK_SUMMARY.md
│       └── phases/
└── manager-state.json
```