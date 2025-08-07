# Qryleth - 3D редактор с ИИ

Монорепозиторий содержащий 3D редактор с интегрированным ИИ-ассистентом и конвертер CAD моделей.

## Структура проекта

```
apps/
├── qryleth-front/          # Основное веб-приложение (React + Three.js)
└── cad2qryleth/           # Конвертер CAD моделей в формат Qryleth

docs/                      # Документация проекта
├── getting-started/       # Быстрый старт и терминология
├── architecture/          # Архитектурные принципы и паттерны  
├── features/             # Описание функциональности
└── api/                  # Справочник API

examples/                  # Примеры объектов и сцен
```

## Быстрый старт

### Фронтенд приложение
```bash
cd apps/qryleth-front
npm install
npm run dev
```

### CAD конвертер
```bash
cd apps/cad2qryleth
python converter.py
```

## Технологии

**Frontend:** React, TypeScript, Mantine, Three.js, Vite, Dexie  
**CAD Converter:** Python

## Документация

📚 **[Полная документация](docs/README.md)** - Подробное руководство по всем аспектам проекта

### Основные разделы:
- **[Терминология](docs/getting-started/terminology.md)** - Основные понятия проекта
- **[Архитектура](docs/architecture/design-principles.md)** - Принципы и паттерны разработки
- **[Управление сценой](docs/features/scene-management/README.md)** - Работа с 3D сценами
- **[Интеграция ИИ](docs/features/ai-integration/README.md)** - Настройка и использование ИИ

## Рабочие процессы

- **[Агентские задачи](docs/development/workflows/agent-tasks.md)** - Система управления задачами
- **[Агентские обсуждения](docs/development/workflows/agent-discussion.md)** - Процесс обсуждения задач

