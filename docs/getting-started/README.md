# Getting Started with Qryleth / Начало работы с Qryleth

Welcome to Qryleth, a powerful 3D scene editor with AI integration. This guide will help you get up and running quickly.

Добро пожаловать в Qryleth, мощный редактор 3D сцен с интеграцией ИИ. Это руководство поможет вам быстро начать работу.

---

## Quick Setup / Быстрая настройка

### Prerequisites / Требования

- **Node.js** 18+ 
- **npm** or **yarn** or **pnpm**
- Modern browser with WebGL support
- Git

### Installation / Установка

```bash
# Clone the repository / Клонируйте репозиторий
git clone <repository-url>
cd qryleth

# Install dependencies / Установите зависимости
npm install

# Start development server / Запустите сервер разработки
npm run dev
```

### First Run / Первый запуск

1. Open your browser to `http://localhost:5173`
2. You should see the Qryleth 3D editor interface
3. Try creating a simple scene by adding a cube

Откройте браузер по адресу `http://localhost:5173`
Вы должны увидеть интерфейс 3D редактора Qryleth
Попробуйте создать простую сцену, добавив куб

---

## Project Structure Overview / Обзор структуры проекта

Qryleth follows **Feature-Sliced Design (FSD)** architecture:

Qryleth использует архитектуру **Feature-Sliced Design (FSD)**:

```
src/
├── app/               # Application entry point / Точка входа
├── pages/             # Route components / Компоненты маршрутов
├── features/          # Business logic features / Бизнес-логика
│   ├── scene/         # Scene management / Управление сценой
│   ├── object/        # Object operations / Операции с объектами
│   ├── ai-assistant/  # AI chat integration / Интеграция AI чата
│   └── library/       # Object library / Библиотека объектов
├── widgets/           # Composite UI blocks / Составные UI блоки
├── entities/          # Domain models / Доменные модели
├── shared/            # Shared utilities / Общие утилиты
└── boundaries/        # External integrations / Внешние интеграции
```

For detailed architecture information, see [Design Principles](../architecture/design-principles.md).

Подробную информацию об архитектуре см. в [Принципах проектирования](../architecture/design-principles.md).

---

## Key Concepts / Ключевые концепции

### 🎨 3D Scene Editor / 3D редактор сцен

- **Scene** - 3D environment containing objects, lighting, and cameras
- **Objects** - Composite 3D entities made of primitives
- **Primitives** - Basic 3D shapes (box, sphere, cylinder, etc.)
- **Layers** - Organizational structure for scene objects

**Russian:**
- **Сцена** - 3D окружение, содержащее объекты, освещение и камеры
- **Объекты** - Составные 3D сущности из примитивов
- **Примитивы** - Базовые 3D формы (куб, сфера, цилиндр и т.д.)
- **Слои** - Организационная структура для объектов сцены

### 🤖 AI Assistant / ИИ ассистент

- **Chat Interface** - Natural language interaction with the editor
- **Tool Calls** - AI can manipulate scenes through defined tools
- **Agent Tasks** - Complex multi-step operations executed by AI

**Russian:**
- **Чат интерфейс** - Взаимодействие с редактором на естественном языке
- **Вызовы инструментов** - ИИ может манипулировать сценами через определенные инструменты
- **Агентские задачи** - Сложные многошаговые операции, выполняемые ИИ

### 📦 State Management / Управление состоянием

- **Zustand** - Primary state management for scene data
- **TanStack Query** - Server state and caching
- **Local State** - Component-level state with useState/useReducer

---

## Your First Scene / Ваша первая сцена

### Step 1: Create a New Scene / Шаг 1: Создайте новую сцену

1. Click "New Scene" button in the interface
2. Give your scene a name
3. The 3D viewport will show an empty scene

### Step 2: Add Objects / Шаг 2: Добавьте объекты

1. Open the object library panel
2. Select a primitive (e.g., "Box")
3. Click to place it in the scene
4. Use transform tools to position, rotate, and scale

### Step 3: Configure Lighting / Шаг 3: Настройте освещение

1. Open the lighting panel
2. Adjust ambient light intensity
3. Add directional lights for shadows
4. Experiment with different lighting settings

### Step 4: Save Your Work / Шаг 4: Сохраните работу

1. Use Ctrl+S or the save button
2. Your scene is automatically stored locally
3. Export options are available in the file menu

---

## Using the AI Assistant / Использование ИИ ассистента

### Basic Commands / Базовые команды

Try these natural language commands in the chat:

Попробуйте эти команды на естественном языке в чате:

```
"Add a red cube to the scene"
"Create a lighting setup for product photography"
"Arrange objects in a circle"
"Change the camera angle"
```

### Agent Tasks / Агентские задачи

For complex operations, you can create agent tasks:

Для сложных операций можно создать агентские задачи:

```
"Create an agent task to build a complete room scene"
"Set up an agent task for optimizing scene performance"
```

See [Agent Tasks](../development/workflows/agent-tasks.md) for detailed information.

---

## Development Workflow / Рабочий процесс разработки

### Hot Reload / Горячая перезагрузка

The development server supports hot reload:
- Changes to React components update immediately
- Type changes require a restart
- Asset changes are reflected instantly

### Code Structure / Структура кода

When adding new functionality:

При добавлении новой функциональности:

1. **Identify the layer** (entities, shared, features, etc.)
2. **Follow naming conventions** established in the codebase
3. **Add proper TypeScript types** using the [type system](../api/types/README.md)
4. **Write tests** for new functionality
5. **Update documentation** as needed

### Building / Сборка

```bash
# Development build / Сборка для разработки
npm run build:dev

# Production build / Продакшн сборка
npm run build

# Type checking / Проверка типов
npm run type-check

# Linting / Линтинг
npm run lint
```

---

## Common Patterns / Общие паттерны

### Adding a New Feature / Добавление новой функции

1. Create feature directory in `src/features/`
2. Implement business logic in `model/`
3. Create UI components in `ui/`
4. Add integration logic in `api/`
5. Export public interface from `index.ts`

### Working with Types / Работа с типами

```typescript
// Import domain entities / Импорт доменных сущностей
import type { GfxPrimitive, GfxObject } from '@/entities'

// Import UI types / Импорт UI типов
import type { ViewMode, SelectedObject } from '@/shared/types/ui'

// Import store types / Импорт типов стора
import type { SceneStore } from '@/features/scene/model'
```

### Creating Components / Создание компонентов

```typescript
import React from 'react'
import type { GfxObject } from '@/entities'

interface ObjectPanelProps {
  object: GfxObject
  onUpdate: (object: GfxObject) => void
}

export const ObjectPanel: React.FC<ObjectPanelProps> = ({ 
  object, 
  onUpdate 
}) => {
  return (
    <div>
      <h3>{object.name}</h3>
      {/* Component implementation */}
    </div>
  )
}
```

---

## Next Steps / Следующие шаги

### Learn the Architecture / Изучите архитектуру

- [Design Principles](../architecture/design-principles.md) - Core architectural guidelines
- [Feature-Sliced Design](../architecture/feature-sliced-design.md) - FSD implementation
- [Component Patterns](../architecture/patterns/component-patterns.md) - React patterns

### Explore Features / Изучите функциональность

- [Scene Management](../features/scene-management/README.md) - Scene editing capabilities
- [AI Integration](../features/ai-integration/README.md) - AI assistant features
- [Object Editing](../features/object-editing/README.md) - Object manipulation tools

### Development Resources / Ресурсы разработки

- [API Reference](../api/README.md) - Complete API documentation
- [Testing Guide](../development/testing/README.md) - Testing strategies
- [Contributing](../development/contributing.md) - How to contribute

---

## Troubleshooting / Устранение неполадок

### Common Issues / Частые проблемы

**Build Errors / Ошибки сборки:**
- Check Node.js version (18+ required)
- Clear node_modules and reinstall dependencies
- Verify TypeScript configuration

**3D Rendering Issues / Проблемы 3D рендеринга:**
- Ensure WebGL is enabled in your browser
- Check browser console for errors
- Verify graphics drivers are up to date

**AI Assistant Not Working / ИИ ассистент не работает:**
- Check API key configuration
- Verify network connectivity
- Look for errors in browser console

### Getting Help / Получение помощи

- Check the [documentation](../README.md)
- Search existing GitHub issues
- Create a new issue with detailed information
- Join community discussions

---

> ✨ **Ready to build amazing 3D experiences with Qryleth!**
> 
> ✨ **Готовы создавать удивительные 3D впечатления с Qryleth!**