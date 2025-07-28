# Обзор системы типов

Полное руководство по унифицированной системе типов Qryleth, основанной на принципах Feature-Sliced Design.

---

## Architecture Overview / Обзор архитектуры

Все типы в проекте организованы согласно принципам **Feature-Sliced Design (FSD)**:

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

## Категории типов

### 1. 🏗️ Доменные типы (`@/entities`)


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

**Примеры использования**:
```typescript
// Creating a primitive / Создание примитива
const createBox = (): GfxPrimitive => ({
  type: 'box',
  geometry: {
    width: 2,
    height: 2,
    depth: 2,
  },
  material: {
    color: '#ff0000',
    opacity: 1.0,
  },
  transform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  },
})

// Working with composite object / Работа с композитным объектом
const processObject = (object: GfxObject) => {
  object.primitives.forEach(primitive => {
    console.log(`Primitive type: ${primitive.type}`)
    if (primitive.type === 'box') {
      console.log(`Box dimensions: ${primitive.geometry.width}x${primitive.geometry.height}x${primitive.geometry.depth}`)
    }
  })
}

// Type-safe geometry access / Типобезопасный доступ к геометрии
const getPrimitiveVolume = (primitive: GfxPrimitive): number => {
  switch (primitive.type) {
    case 'box':
      return primitive.geometry.width * primitive.geometry.height * primitive.geometry.depth
    case 'sphere':
      return (4/3) * Math.PI * Math.pow(primitive.geometry.radius, 3)
    case 'cylinder':
      const avgRadius = (primitive.geometry.radiusTop + primitive.geometry.radiusBottom) / 2
      return Math.PI * avgRadius * avgRadius * primitive.geometry.height
    // ... другие типы
    default:
      return 0
  }
}
```

### GfxPrimitive

Структура примитива использует дискриминированное объединение с четким разделением геометрии, материала и трансформаций:

```typescript
type GfxPrimitive =
  | ({ type: 'box';      geometry: BoxGeometry;      } & PrimitiveCommon)
  | ({ type: 'sphere';   geometry: SphereGeometry;   } & PrimitiveCommon)
  | ({ type: 'cylinder'; geometry: CylinderGeometry; } & PrimitiveCommon)
  | ({ type: 'cone';     geometry: ConeGeometry;     } & PrimitiveCommon)
  | ({ type: 'pyramid';  geometry: PyramidGeometry;  } & PrimitiveCommon)
  | ({ type: 'plane';    geometry: PlaneGeometry;    } & PrimitiveCommon)
  | ({ type: 'torus';    geometry: TorusGeometry;    } & PrimitiveCommon);

interface PrimitiveCommon {
  name?: string;
  material?: {
    color?: string;
    opacity?: number;
    emissive?: string;
    emissiveIntensity?: number;
  };
  transform?: {
    position?: Vector3;
    rotation?: Vector3;
    scale?: Vector3;
  };
}
```

#### Геометрические интерфейсы

Каждый тип примитива имеет специфичный интерфейс геометрии:

- **BoxGeometry**: `width`, `height`, `depth`
- **SphereGeometry**: `radius`
- **CylinderGeometry**: `radiusTop`, `radiusBottom`, `height`, `radialSegments?`
- **ConeGeometry**: `radius`, `height`, `radialSegments?`
- **PyramidGeometry**: `baseSize`, `height`
- **PlaneGeometry**: `width`, `height`
- **TorusGeometry**: `majorRadius`, `minorRadius`, `radialSegments?`, `tubularSegments?`

### 2. 🔧 Core Utilities (`@/shared/types/core`)

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

Подробная документация в [UI типы](ui-types.md), [Общие типы](shared-types.md) и [Сущности](entities.md).

---

## Паттерны импортов

### ✅ Рекомендуемые паттерны

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

### ❌ Избегайте

```typescript
// 1. Relative paths / Относительные пути
import type { GfxPrimitive } from '../../../entities/primitive'  // ❌

// 2. Mixed type/value imports without type keyword
import { GfxPrimitive } from '@/entities'  // ❌ (if only type)

// 3. Imports from inaccessible layers / Импорты из недоступных слоев
import type { SceneStore } from '@/features/scene/model'  // ❌ in entities layer
```

---

## Архитектурные правила

### 📋 Правила доступа слоев

```
entities/    ← self-sufficient, no dependencies / самодостаточны
   ↑
shared/      ← can import from entities / может импортировать из entities
   ↑  
features/    ← can import from shared and entities
   ↑
app/         ← can import from all layers / может импортировать из всех слоев
```

### 🚫 Запрещенные импорты

- **entities** → features ❌
- **entities** → shared ❌  
- **shared** → features ❌
- Circular dependencies / Циклические зависимости ❌

### ✅ Разрешенные импорты

- **features** → entities ✅
- **features** → shared ✅
- **shared** → entities ✅
- **app** → any layer / любой слой ✅

---

## Руководство по миграции

### При добавлении новых типов

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

## Инструменты и автоматизация

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

### Lint Rules (рекомендуется)

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

## Заключение


Унифицированная система типов обеспечивает:

- 🏗️ **Architectural cleanliness** - FSD principles compliance
- 📦 **Ease of use** - clear barrel exports  
- 🔄 **Maintainability** - easy to find and update types
- ⚡ **Performance** - type-only imports
- 🛡️ **Safety** - prevention of architectural violations

При возникновении вопросов обращайтесь к этому руководству или к архитектурным принципам в [Принципы проектирования](../../architecture/design-principles.md).

## Связанная документация

- [Entities Types](entities.md) - Domain entity types
- [Shared Types](shared-types.md) - Common utility types
- [UI Types](ui-types.md) - User interface types
- [Store Types](../stores/README.md) - State management types
