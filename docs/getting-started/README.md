# Начало работы с Qryleth

Добро пожаловать в Qryleth, мощный редактор 3D сцен с интеграцией ИИ. Это руководство поможет вам быстро начать работу.

---

## Быстрая настройка

### Требования

- **Node.js** 18+ 
- **npm** or **yarn** or **pnpm**
- Modern browser with WebGL support
- Git

### Установка

```bash
# Clone the repository / Клонируйте репозиторий
git clone <repository-url>
cd qryleth
cd apps/qryleth-front

# Install dependencies / Установите зависимости
npm install

# Start development server for front-end app / Запустите сервер разработки фронт-приложения
npm run dev
```

### Первый запуск

1. Откройте браузер по адресу `http://localhost:5173`
2. Вы должны увидеть интерфейс 3D редактора Qryleth
3. Попробуйте создать простую сцену, добавив куб

---

## Обзор структуры проекта

Проект организован как монорепозиторий. Основное фронт-приложение находится в `apps/qryleth-front/` и использует архитектуру **[Feature-Sliced Design (FSD)](../architecture/feature-sliced-design.md)**:

```
qryleth/
├── apps/
│   └── qryleth-front/     # Основное фронт-приложение
│       └── src/
│           ├── app/       # Точка входа
│           ├── pages/     # Компоненты маршрутов
│           ├── features/  # Функциональные модули
│           │   ├── scene/ # управление сценой
│           │   └── object-editor/ # редактирование объектов
│           ├── widgets/   # Составные UI блоки (чат, модальные окна)
│           ├── entities/  # Доменные модели
│           └── shared/    # Общие утилиты
├── docs/                  # Документация
└── agent-content/         # Контент для ИИ агентов
```

Примечание: доступен новый неймспейс `features/editor/object/*` с реэкспортами API из `features/object-editor/*` для безопасной миграции.
Виджет `widgets/ObjectEditor` поддерживает режимы `page` и `embedded` и используется в `SceneEditor` в embedded-режиме.


Подробную информацию об архитектуре см. в [Принципах проектирования](../architecture/design-principles.md).

---

## Ключевые концепции

### 🎨 3D редактор сцен

- **Сцена** - 3D окружение, содержащее объекты, освещение и камеры
- **Объекты** - Составные 3D сущности из примитивов
- **Примитивы** - Базовые 3D формы (куб, сфера, цилиндр и т.д.)
- **Слои** - Организационная структура для объектов сцены

### 🤖 ИИ ассистент

- **Чат интерфейс** - Взаимодействие с редактором на естественном языке
- **Вызовы инструментов** - ИИ может манипулировать сценами через определенные инструменты
- **Агентские задачи** - Сложные многошаговые операции, выполняемые ИИ

### 📦 Управление состоянием

- **Zustand** - Primary state management for scene data
- **TanStack Query** - Server state and caching
- **Local State** - Component-level state with useState/useReducer

---

## Ваша первая сцена

### Шаг 1: Создайте новую сцену

1. Click "New Scene" button in the interface
2. Give your scene a name
3. The 3D viewport will show an empty scene

### Шаг 2: Добавьте объекты

1. Open the object library panel
2. Select a primitive (e.g., "Box")
3. Click to place it in the scene
4. Use transform tools to position, rotate, and scale

###  Шаг 3: Настройте освещение

1. Open the lighting panel
2. Adjust ambient light intensity
3. Add directional lights for shadows
4. Experiment with different lighting settings

### Шаг 4: Сохраните работу

1. Use Ctrl+S or the save button
2. Your scene is automatically stored locally
3. Export options are available in the file menu

---

## Использование ИИ ассистента

### Базовые команды

Попробуйте эти команды на естественном языке в чате:

```
"Add a red cube to the scene"
"Create a lighting setup for product photography"
"Arrange objects in a circle"
"Change the camera angle"
```

### Работа с множественными объектами и оптимизацией

Qryleth автоматически оптимизирует производительность при работе с большим количеством одинаковых объектов:

```
"Create 10 red cubes in a grid"
"Add 50 spheres randomly positioned in the scene"
"Place 20 cylinders in a circle formation"
```

**Автоматическая оптимизация:**
- При размещении 3+ экземпляров одного типа объекта система автоматически переключается на высокопроизводительное рендеринг через InstancedMesh
- Оптимизация работает прозрачно - вы можете по-прежнему выбирать и редактировать отдельные объекты
- Поддерживаются материалы, трансформации и все основные операции

**Пример создания оптимизированной сцены:**

1. **Создайте базовые объекты:** "Add a blue cube to the center"
2. **Добавьте множественные экземпляры:** "Duplicate this cube 15 times in a 5x3 grid"  
3. **Настройте индивидуально:** Выберите любой куб и измените его положение/поворот через gizmo controls
4. **Добавьте вариации:** "Change material of every 3rd cube to red"

**Что происходит под капотом:**
- Система группирует объекты по типу (куб, сфера, и т.д.)
- Создает один InstancedMesh на каждый тип с 3+ экземплярами  
- Обеспечивает правильную обработку событий для отдельных экземпляров
- Синхронизирует трансформации между UI и GPU
- Показывает realtime-изменения при трансформации инстансов через gizmo (без записи в store во время перетаскивания)

## Процесс разработки

### Горячая перезагрузка

The development server supports hot reload:
- Changes to React components update immediately
- Type changes require a restart
- Asset changes are reflected instantly

### Структура кода

При добавлении новой функциональности:

1. **Identify the layer** (entities, shared, features, etc.)
2. **Follow naming conventions** established in the codebase
3. **Add proper TypeScript types** using the [type system](../api/types/README.md)
4. **Write tests** for new functionality
5. **Update documentation** as needed

### Сборка

```bash
# Запуск сервера разработки (из корня проекта)
cd apps/qryleth-front
npm run dev

# Продакшн сборка
npm run build

# Линтинг
npm run lint
```

---

## Общие паттерны

### Добавление новой фичи

1. Create feature directory in `apps/qryleth-front/src/features/`
2. Implement business logic in `model/`
3. Create UI components in `ui/`
4. Add integration logic in `api/`
5. Export public interface from `index.ts`

### Работа с типами

```typescript
// Import domain entities / Импорт доменных сущностей
import type { GfxPrimitive, GfxObject } from '@/entities'

// Import UI types / Импорт UI типов
import type { ViewMode, SelectedObject } from '@/shared/types/ui'

// Import store types / Импорт типов стора
import type { SceneStore } from '@/features/scene/model'
```

### Создание компонентов

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

## Следующие шаги

### Изучите архитектуру

- [Design Principles](../architecture/design-principles.md) - Core architectural guidelines
- [Feature-Sliced Design](../architecture/feature-sliced-design.md) - FSD implementation
- [Component Patterns](../architecture/patterns/component-patterns.md) - React patterns

### Изучите функциональность

- [Scene Management](../features/scene-management/README.md) - Scene editing capabilities
- [AI Integration](../features/ai-integration/README.md) - AI assistant features
- [Object Editing](../features/object-editing/README.md) - Object manipulation tools

### Ресурсы разработки

- [API Reference](../api/README.md) - Complete API documentation
- [Testing Guide](../development/testing/README.md) - Testing strategies
---

## Устранение неполадок

### Частые проблемы

**Ошибки сборки:**
- Check Node.js version (18+ required)
- Clear node_modules and reinstall dependencies
- Verify TypeScript configuration

**Проблемы 3D рендеринга:**
- Ensure WebGL is enabled in your browser
- Check browser console for errors
- Verify graphics drivers are up to date

**ИИ ассистент не работает:**
- Check API key configuration
- Verify network connectivity
- Look for errors in browser console

