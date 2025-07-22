# Type System Overview / Обзор системы типов

Complete guide to Qryleth's unified type system based on Feature-Sliced Design principles.

Полное руководство по унифицированной системе типов Qryleth, основанной на принципах Feature-Sliced Design.

---

## Architecture Overview / Обзор архитектуры

After migration (phases 1-5), all types in the project are organized according to **Feature-Sliced Design (FSD)** principles:

После миграции (фазы 1-5) все типы в проекте организованы согласно принципам **Feature-Sliced Design (FSD)**:

```
src/
├── entities/           # Domain entities / Доменные сущности
│   ├── primitive/
│   ├── object/ 
│   ├── scene/
│   └── index.ts       # Barrel export of all entities
├── shared/             # Reusable types / Переиспользуемые типы
│   ├── types/
│   │   ├── core/      # Base utilities (Vector3, Transform)
│   │   ├── ui/        # UI types (ViewMode, Selection)
│   │   └── index.ts   # Barrel export shared types
│   ├── api/           # Database and API types
│   └── lib/r3f/       # R3F technical types
└── features/           # Business logic / Бизнес-логика
    └── scene/
        └── model/     # Scene store and view types
```

---

## Type Categories / Категории типов

### 1. 🏗️ Domain Entities (`@/entities`)

**Purpose**: Business domain entities of the application  
**Import**: `import type { ... } from '@/entities'`

**Назначение**: Бизнес-доменные сущности приложения  
**Импорт**: `import type { ... } from '@/entities'`

```typescript
// Core domain types / Основные доменные типы
import type { 
  GfxPrimitive,    // 3D primitives (box, sphere, cylinder, etc.)
  GfxObject,       // Composite 3D objects
  GfxLayer,        // Scene layers
  LightingSettings // Lighting configuration
} from '@/entities'

// Specific entity types / Специфичные entity типы
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxObject } from '@/entities/object'
import type { SceneObjectInstance } from '@/entities/scene/types'
```

**Usage Examples / Примеры использования**:
```typescript
// Creating a primitive / Создание примитива
const createBox = (): GfxPrimitive => ({
  type: 'box',
  width: 2,
  height: 2,
  depth: 2,
  position: [0, 0, 0],
  // ...
})

// Working with composite object / Работа с композитным объектом
const processObject = (object: GfxObject) => {
  object.primitives.forEach(primitive => {
    console.log(`Primitive type: ${primitive.type}`)
  })
}
```

### 2. 🔧 Core Utilities (`@/shared/types/core`)

**Purpose**: Base utility types for the entire application  
**Import**: `import type { ... } from '@/shared/types/core'`

**Назначение**: Базовые утилитарные типы для всего приложения  
**Импорт**: `import type { ... } from '@/shared/types/core'`

```typescript
// Mathematical types / Математические типы
import type { 
  Vector3,        // [x, y, z] coordinates
  Transform       // Position, rotation, scale
} from '@/shared/types/core'

// Usage / Использование
const moveObject = (position: Vector3, offset: Vector3): Vector3 => {
  return [
    position[0] + offset[0],
    position[1] + offset[1], 
    position[2] + offset[2]
  ]
}

const applyTransform = (transform: Transform) => {
  const { position, rotation, scale } = transform
  // Apply transformation logic
}
```

### 3. 🎨 UI Types (`@/shared/types/ui`)

**Purpose**: Types for user interface  
**Import**: `import type { ... } from '@/shared/types/ui'`

**Назначение**: Типы для пользовательского интерфейса  
**Импорт**: `import type { ... } from '@/shared/types/ui'`

```typescript
// UI state and events / UI состояние и события
import type { 
  ViewMode,              // 'orbit' | 'walk' | 'fly'
  RenderMode,            // 'solid' | 'wireframe'
  TransformMode,         // 'translate' | 'rotate' | 'scale'
  SelectedObject,        // Selected object
  HoveredObject,         // Object under cursor
  SceneClickEvent,       // Scene click
  ObjectTransformEvent   // Object transformation
} from '@/shared/types/ui'
```

See detailed documentation in [UI Types](ui-types.md), [Shared Types](shared-types.md), and [Entities](entities.md).

Подробная документация в [UI типы](ui-types.md), [Общие типы](shared-types.md) и [Сущности](entities.md).

---

## Import Patterns / Паттерны импортов

### ✅ Recommended Patterns / Рекомендуемые паттерны

```typescript
// 1. Barrel exports (preferred) / Предпочтительно
import type { GfxPrimitive, GfxObject } from '@/entities'
import type { ViewMode, SelectedObject } from '@/shared/types/ui'
import type { SceneStore } from '@/features/scene/model'

// 2. Specific imports (when precision needed) / Когда нужна точность
import type { GfxPrimitive } from '@/entities/primitive'
import type { SceneRecord } from '@/shared/api'

// 3. Type-only imports (always for types) / Всегда для типов
import type { ... } from '...'  // ✅ Correct
import { type ... } from '...'  // ✅ Also correct
```

### ❌ Avoid / Избегайте

```typescript
// 1. Relative paths / Относительные пути
import type { GfxPrimitive } from '../../../entities/primitive'  // ❌

// 2. Mixed type/value imports without type keyword
import { GfxPrimitive } from '@/entities'  // ❌ (if only type)

// 3. Imports from inaccessible layers / Импорты из недоступных слоев
import type { SceneStore } from '@/features/scene/model'  // ❌ in entities layer
```

---

## Architecture Rules / Архитектурные правила

### 📋 Layer Access Rules / Правила доступа слоев

```
entities/    ← self-sufficient, no dependencies / самодостаточны
   ↑
shared/      ← can import from entities / может импортировать из entities
   ↑  
features/    ← can import from shared and entities
   ↑
app/         ← can import from all layers / может импортировать из всех слоев
```

### 🚫 Prohibited Imports / Запрещенные импорты

- **entities** → features ❌
- **entities** → shared ❌  
- **shared** → features ❌
- Circular dependencies / Циклические зависимости ❌

### ✅ Allowed Imports / Разрешенные импорты

- **features** → entities ✅
- **features** → shared ✅
- **shared** → entities ✅
- **app** → any layer / любой слой ✅

---

## Migration Guide / Руководство по миграции

### When Adding New Types / При добавлении новых типов

1. **Determine the layer** according to FSD:
   - Domain logic → `entities/`
   - Reusable utilities → `shared/`
   - Business logic → `features/`

2. **Create type in the right place**:
   ```typescript
   // entities/newEntity/model/types.ts
   export interface NewEntity {
     id: string
     // ...
   }
   ```

3. **Add to barrel export**:
   ```typescript
   // entities/newEntity/index.ts
   export type { NewEntity } from './model/types'
   
   // entities/index.ts
   export * from './newEntity'
   ```

4. **Update documentation** if necessary

---

## Tools and Automation / Инструменты и автоматизация

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/entities": ["src/entities"],
      "@/entities/*": ["src/entities/*"],
      "@/shared": ["src/shared"],
      "@/shared/*": ["src/shared/*"],
      "@/features": ["src/features"],
      "@/features/*": ["src/features/*"]
    }
  }
}
```

### Lint Rules (recommended / рекомендуется)

```json
// .eslintrc.json
{
  "rules": {
    "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
    "import/no-relative-parent-imports": "error"
  }
}
```

---

## Conclusion / Заключение

The unified type system provides:

Унифицированная система типов обеспечивает:

- 🏗️ **Architectural cleanliness** - FSD principles compliance
- 📦 **Ease of use** - clear barrel exports  
- 🔄 **Maintainability** - easy to find and update types
- ⚡ **Performance** - type-only imports
- 🛡️ **Safety** - prevention of architectural violations

For questions, refer to this guide or the architectural principles in [Design Principles](../../architecture/design-principles.md).

При возникновении вопросов обращайтесь к этому руководству или к архитектурным принципам в [Принципы проектирования](../../architecture/design-principles.md).

## Related Documentation / Связанная документация

- [Entities Types](entities.md) - Domain entity types
- [Shared Types](shared-types.md) - Common utility types
- [UI Types](ui-types.md) - User interface types
- [Store Types](../stores/README.md) - State management types