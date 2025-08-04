# Документация Qryleth

Добро пожаловать в документацию 3D редактора Qryleth. Документация доступна на английском и русском языках.

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

### 🆕 Недавние архитектурные обновления

**Рефакторинг ChatInterface (август 2025):**
- Полный переход на архитектуру Feature-Sliced Design
- Создание shared chat entities для переиспользования
- Специализированные ChatInterface для сцен и объектов
- Новая система панелей для ObjectEditor

---

## 🔌 Справочник API

### Типы
- **[Type System Overview](api/types/README.md)** - Полное руководство по системе типов
- **[Domain Entities](api/types/entities.md)** - Основные доменные типы
- **[Shared Types](api/types/shared-types.md)** - Общие утилиты

### Управление состоянием
- **[Stores Overview](api/stores/README.md)** - Документация Zustand хранилищ
- **[Scene Store](api/stores/scene-store.md)** - Управление состоянием сцены
- **[Scene API](api/scene-api.md)** - Методы взаимодействия со сценой

### Компоненты
- **[Component Library](api/components/README.md)** - Переиспользуемые компоненты
- **[Chat Components](api/components/chat-components.md)** - Компоненты чата и системы панелей (новое)
- **[Scene Editor](api/components/scene-editor.md)** - Компоненты редактора сцены

---

## ✨ Функциональность

### Управление сценой
- **[Overview](features/scene-management/README.md)** - общая информация
- **[Scene Creation](features/scene-management/scene-creation.md)** - Создание и управление сценами
- **[Object Placement](features/scene-management/object-placement.md)** - Управление объектами
- **[Lighting System](features/scene-management/lighting-system.md)** - Управление освещением
- **[Scripting Panel](features/scene-management/scripting-panel.md)** - Выполнение пользовательских скриптов
- **[Keyboard Shortcuts](features/scene-management/keyboard-shortcuts.md)** - Клавиатурные сокращения

### Редактирование объектов
- **[Overview](features/object-editing/README.md)** - общая информация
- **[Keyboard Shortcuts](features/object-editing/keyboard-shortcuts.md)** - Горячие клавиши редактора объектов

### Интеграция ИИ
- **[LLM Integration](features/ai-integration/llm-integration.md)** - Настройка языковой модели
- **[Provider Connections](features/ai-integration/provider-connections.md)** - Управление подключениями к LLM

---

## 🛠️ Разработка

### Рабочие процессы
- **[Agent Tasks](development/workflows/agent-tasks.md)** - Система агентских задач
- [agent-discussion.md](development/workflows/agent-discussion.md) - Система обсуждения задачи агентами
### Тестирование
@TODO

---

## 🚢 Развертывание

@TODO

---

