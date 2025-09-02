# Документация Qryleth

Добро пожаловать в документацию монорепозитория Qryleth. Этот проект содержит несколько приложений, включая 3D редактор с интеграцией ИИ.

## Структура монорепозитория

- **`apps/qryleth-front/`** - Основное фронт-приложение 3D редактора
- **`docs/`** - Документация проекта
- **`agent-content/`** - Контент для работы ИИ агентов(задачи и обсуждения)

---

## 🚀 Быстрый старт

- **[Getting Started](getting-started/README.md)** - Установка и первые шаги
- **[Project Structure](getting-started/project-structure.md)** - Понимание структуры кода

---

## 📚 Терминология

- **[Terminology](getting-started/terminology.md)** Основные термины проекта

## 🏗️ Архитектура

- **[Design Principles](architecture/design-principles.md)** - Основные архитектурные принципы
- **[Feature-Sliced Design](architecture/feature-sliced-design.md)** - Детали реализации FSD (обновлено с новой Chat архитектурой)
- **[Component Patterns](architecture/patterns/component-patterns.md)** - Паттерны React компонентов

### 🆕 Недавние изменения

- Сводка обновлений и рефакторингов перенесена в отдельный документ:
  - [Changelog](changelog.md)

---

## 🔌 Справочник API

### Типы
- **[Type System Overview](api/types/README.md)** - Полное руководство по системе типов
- **[Layers](api/types/layers.md)** - Слои сцены и перечисление GfxLayerType
- 🆕 **[Terrain](api/types/terrain.md)** - Конфигурация террейна и сэмплер высот

### Управление состоянием
- **[Stores Overview](api/stores/README.md)** - Документация Zustand хранилищ
- **[Scene Store](api/stores/scene-store.md)** - Управление состоянием сцены
- **[Scene API](api/scene-api.md)** - Методы взаимодействия со сценой

### Компоненты
- **[Component Library](api/components/README.md)** - Переиспользуемые компоненты
- **[Chat Components](api/components/chat-components.md)** - Компоненты чата и системы панелей (новое)
- **[Scene Editor](api/components/scene-editor.md)** - Компоненты редактора сцены
 - 🆕 **[Object Preview Card](api/components/object-preview-card.md)** - Карточка с превью и hover‑препросмотром
 - 🆕 **[OffscreenObjectRenderer](api/libs/offscreen-object-renderer.md)** - Утилита генерации PNG превью
 - 🆕 **[Library Browser](api/components/object-library.md)** — вкладки «Сцены/Объекты», поиск и списки

---

## ✨ Функциональность

### Управление сценой
- **[Overview](features/scene-management/README.md)** - общая информация
- **[Scene Creation](features/scene-management/scene-creation.md)** - Создание и управление сценами
- **[Object Placement](features/scene-management/object-placement.md)** - Управление объектами
- **[Lighting System](features/scene-management/lighting-system.md)** - Управление освещением
- **[Scripting Panel](features/scene-management/scripting-panel.md)** - Выполнение пользовательских скриптов
- **[Keyboard Shortcuts](features/scene-management/keyboard-shortcuts.md)** - Клавиатурные сокращения
- 🆕 **[Terrain System](features/scene-management/terrain-system.md)** - Ландшафтные слои, heightmaps, модификации

### Редактирование объектов
- **[Overview](features/object-editing/README.md)** - общая информация
- **[Keyboard Shortcuts](features/object-editing/keyboard-shortcuts.md)** - Горячие клавиши редактора объектов

### Библиотека объектов
- 🆕 **[Превью и препросмотр](features/object-library/README.md)** — offscreen PNG и интерактивный hover‑облёт камеры

### Интеграция ИИ
- **[LLM Integration](features/ai-integration/llm-integration.md)** - Настройка языковой модели
- **[Provider Connections](features/ai-integration/provider-connections.md)** - Управление подключениями к LLM

---

## 🛠️ Разработка

### Рабочие процессы
- **[Agent Tasks](development/workflows/agent-tasks.md)** - Система агентских задач
- [agent-discussion.md](development/workflows/agent-discussion.md) - Система обсуждения задачи агентами
### Правила документации
- **[Doc Style Guide](doc-style-guide.md)** - Правила структуры и содержания документации
### Тестирование
@TODO

---

## 🚢 Развертывание

@TODO

---

## 📎 Дополнительные материалы

- 🧭 Координатная система террейна: features/scene-management/terrain-coordinates.md

## 🔄 Миграции

- 024 — terrain-coordinates-refactor: migrations/024-terrain-coordinates-refactor.md
- 027 — editor-object-namespace-finalize: migrations/027-editor-object-namespace-finalize.md
