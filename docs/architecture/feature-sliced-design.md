# Feature-Sliced Design в Qryleth

Этот документ описывает структуру папок и основные сегменты проекта в соответствии с принципами Feature-Sliced Design (FSD).

---

## Принципы FSD

**Иерархия слоев** (от высшего к низшему):
```text
app/      ← Может импортировать все слои ниже
pages/    ← Может импортировать все слои ниже  
widgets/  ← Может импортировать все слои ниже
features/ ← Может импортировать entities, shared
entities/ ← Может импортировать shared
shared/   ← НЕ МОЖЕТ импортировать слои выше
```

**Основное правило**: слой может импортировать только из слоев, расположенных **ниже** в иерархии.

---

## Структура папок

```text
src/
├─ features/
│  ├─ scene/
│  │  ├─ model/   # Состояние и бизнес-логика
│  │  ├─ ui/      # React-компоненты
│  │  ├─ lib/     # Вспомогательные функции
│  │  │  └─ ai/   # AI инструменты для сценарии
│  │  │     ├─ tools/     # Конкретные AI tools
│  │  │     └─ index.ts   # Провайдер инструментов
│  │  ├─ api/     # Запросы к серверу
│  │  └─ index.ts # Публичный API
│  └─ object-editor/
│     ├─ model/
│     ├─ ui/
│     ├─ lib/
│     │  └─ ai/   # AI инструменты для редактирования объектов
│     └─ index.ts
├─ shared/
│  └─ lib/
│     └─ langchain/
│        ├─ chatService.ts    # Базовый сервис (без зависимостей от features)
│        ├─ toolRegistry.ts   # Реестр инструментов
│        └─ types.ts          # Общие типы
```

Каждая фича изолирована. Она предоставляет функциональность через `index.ts`, скрывая внутренние модули.

---

## Роли сегментов

- **model/** – zustand-хранилища, селекторы и бизнес-логика.
- **ui/** – React-компоненты, сгруппированные по назначению.
- **lib/** – чистые вспомогательные функции.
  - **lib/ai/** – AI инструменты, специфичные для данной feature.
- **api/** – функции для работы с сервером.

---

## Примеры соблюдения FSD для AI Tools

### ❌ Неправильно (до рефакторинга)

```typescript
// shared/lib/langchain/tools/sceneTools.ts - НАРУШЕНИЕ!
// shared слой импортирует из features
import { SceneAPI } from '@/features/scene/lib/sceneAPI'
import { useSceneStore } from '@/features/scene/model/sceneStore'
```

**Проблемы:**
- `shared` слой не может импортировать из `features`
- Нарушается принцип изоляции слоев FSD
- Создается циклическая зависимость

### ✅ Правильно (после рефакторинга)

```typescript
// features/scene/lib/ai/tools/sceneTools.ts - ПРАВИЛЬНО!
// features может импортировать из своей же feature и из shared/entities
import { SceneAPI } from '@/features/scene/lib/sceneAPI'
import { useSceneStore } from '@/features/scene/model/sceneStore'
import { toolRegistry } from '@/shared/lib/langchain/toolRegistry'

// features/scene/lib/ai/index.ts
export const sceneToolProvider: ToolProvider = {
  register: () => toolRegistry.registerTool('scene', sceneTools),
  unregister: () => toolRegistry.unregisterTool('scene')
}

// shared/lib/langchain/chatService.ts - ПРАВИЛЬНО!
// shared слой работает через абстракцию toolRegistry
import { toolRegistry } from './toolRegistry'
const tools = toolRegistry.getAllTools() // Без прямых импортов из features
```

### Принципы правильной архитектуры AI Tools

1. **Динамическая регистрация**: `shared` слой использует реестр вместо прямых импортов
2. **Feature-специфичные tools**: каждая feature управляет своими AI инструментами
3. **Автоматическая регистрация**: хуки автоматически регистрируют/отменяют инструменты при монтировании компонентов
4. **Изоляция**: изменения в одной feature не затрагивают другие

---

> Соблюдение FSD делает кодовую базу модульной и поддерживаемой. Правильная архитектура AI Tools гарантирует возможность независимого развития различных функций редактора.
