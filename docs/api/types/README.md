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
  GfxPrimitive,      // 3D primitives (box, sphere, cylinder, etc.)
  GfxObject,         // Composite 3D objects
  GfxPrimitiveGroup, // Primitive groups with hierarchy support
  GfxMaterial,       // Material definitions
  GfxLayer,          // Scene layers
  LightingSettings   // Lighting configuration
} from '@/entities'

// Specific entity types / Специфичные entity типы
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxObject } from '@/entities/object'
import type { GfxPrimitiveGroup } from '@/entities/primitiveGroup'
import type { GfxMaterial } from '@/entities/material'
import type { SceneObjectInstance } from '@/entities/scene/types'
```

**Примеры использования**:
```typescript
// Creating a primitive / Создание примитива  
import { generateUUID } from '@/shared/lib/uuid'

const createBox = (): GfxPrimitive => ({
  uuid: generateUUID(),  // 🆕 Обязательное поле
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

// Working with primitive groups / Работа с группами примитивов
import { getPrimitivesInGroup, buildGroupTree } from '@/entities/primitiveGroup'

const analyzeObjectStructure = (object: GfxObject) => {
  console.log(`Object: ${object.name} with ${object.primitives.length} primitives`)
  
  if (object.primitiveGroups) {
    const groupTree = buildGroupTree(object.primitiveGroups)
    console.log('Group structure:', groupTree)
    
    Object.values(object.primitiveGroups).forEach(group => {
      const groupPrimitives = getPrimitivesInGroup(
        group.uuid, 
        object.primitives,
        object.primitiveGroupAssignments || {}
      )
      console.log(`Group "${group.name}": ${groupPrimitives.length} primitives`)
    })
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
  uuid: string;         // 🆕 ОБЯЗАТЕЛЬНОЕ поле для поддержки групп
  name?: string;
  visible?: boolean;    // 🆕 Видимость примитива
  // Legacy material support (deprecated) / Устаревшая поддержка материалов
  material?: {
    color?: string;
    opacity?: number;
    emissive?: string;
    emissiveIntensity?: number;
  };
  // New material system / Новая система материалов
  objectMaterialUuid?: string;  // Reference to object material / Ссылка на материал объекта
  globalMaterialUuid?: string;  // Reference to global material / Ссылка на глобальный материал
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

### GfxMaterial

Универсальная структура материала, используемая как глобально, так и на уровне объекта:

```typescript
interface GfxMaterial {
  uuid: string;          // Unique identifier / Уникальный идентификатор
  name: string;          // Display name / Отображаемое имя
  color?: string;        // Base color (hex) / Базовый цвет
  opacity?: number;      // Transparency (0-1) / Прозрачность
  emissive?: string;     // Emissive color (hex) / Цвет излучения
  emissiveIntensity?: number; // Emissive strength / Интенсивность излучения
}
```

#### Система ссылок на материалы

Примитивы могут ссылаться на материалы тремя способами (в порядке приоритета):

1. **Прямой материал** (`material`) - для обратной совместимости
2. **Материал объекта** (`objectMaterialUuid`) - материал из `GfxObject.materials`
3. **Глобальный материал** (`globalMaterialUuid`) - из глобального реестра

```typescript
// Пример использования материалов в примитиве
const primitiveWithMaterial: GfxPrimitive = {
  uuid: '456e7890-e12b-34d5-a678-901234567890', // Обязательное поле
  type: 'box',
  geometry: { width: 1, height: 1, depth: 1 },
  objectMaterialUuid: '123e4567-e89b-12d3-a456-426614174000',
  transform: { position: [0, 0, 0] }
}
```

### GfxPrimitiveGroup

Система группировки примитивов с поддержкой иерархической структуры:

```typescript
interface GfxPrimitiveGroup {
  uuid: string;                    // Уникальный идентификатор группы
  name: string;                    // Отображаемое имя группы
  visible?: boolean;               // Видимость группы (по умолчанию true)
  parentGroupUuid?: string;        // UUID родительской группы для иерархии
  sourceObjectUuid?: string;       // UUID исходного объекта при импорте
  transform?: {                    // Трансформация группы
    position?: Vector3;
    rotation?: Vector3;
    scale?: Vector3;
  };
}
```

#### Принципы работы с группами

1. **Иерархическая структура**: Группы могут содержать подгруппы через `parentGroupUuid`
2. **Привязка примитивов**: Примитивы привязываются к группам через `primitiveGroupAssignments`
3. **Наследование видимости**: Дочерние группы наследуют видимость родительских
4. **Импорт объектов**: При импорте сохраняется исходная структура групп

```typescript
// Пример создания иерархической структуры
const groups: Record<string, GfxPrimitiveGroup> = {
  'foundation-uuid': {
    uuid: 'foundation-uuid',
    name: 'Фундамент',
    visible: true
  },
  'walls-uuid': {
    uuid: 'walls-uuid', 
    name: 'Стены',
    visible: true,
    parentGroupUuid: 'foundation-uuid' // Дочерняя группа
  }
}

// Привязка примитивов к группам
const primitiveGroupAssignments: Record<string, string> = {
  'primitive-1-uuid': 'foundation-uuid',
  'primitive-2-uuid': 'walls-uuid'
}
```

### GfxObject с группами и материалами

```typescript
interface GfxObject {
  uuid: string;
  name: string;
  primitives: GfxPrimitive[];       // Примитивы с обязательными UUID
  
  // 🆕 Новые опциональные поля для группировки
  primitiveGroups?: Record<string, GfxPrimitiveGroup>;     // uuid -> группа
  primitiveGroupAssignments?: Record<string, string>;      // primitiveUuid -> groupUuid
  
  // Существующие поля
  materials?: GfxMaterial[];        // Object-specific materials / Материалы объекта
  boundingBox?: BoundingBox;
}
```

#### Работа с группами в объектах

```typescript
// Создание объекта с группами
const houseObject: GfxObject = {
  uuid: 'house-uuid',
  name: 'Дом',
  primitives: [
    { uuid: 'foundation-primitive', type: 'box', geometry: { width: 10, height: 1, depth: 10 } },
    { uuid: 'wall-primitive', type: 'box', geometry: { width: 10, height: 3, depth: 0.2 } }
  ],
  primitiveGroups: {
    'foundation-group': {
      uuid: 'foundation-group',
      name: 'Фундамент'
    },
    'walls-group': {
      uuid: 'walls-group', 
      name: 'Стены',
      parentGroupUuid: 'foundation-group'
    }
  },
  primitiveGroupAssignments: {
    'foundation-primitive': 'foundation-group',
    'wall-primitive': 'walls-group'
  }
}

// Утилиты для работы с группами (из @/entities/primitiveGroup)
import { buildGroupTree, findGroupChildren, getPrimitivesInGroup } from '@/entities/primitiveGroup'

// Построение дерева групп
const groupTree = buildGroupTree(houseObject.primitiveGroups || {})

// Получение дочерних групп
const childGroups = findGroupChildren('foundation-group', houseObject.primitiveGroups || {})

// Получение примитивов в группе
const groupPrimitives = getPrimitivesInGroup(
  'walls-group', 
  houseObject.primitives,
  houseObject.primitiveGroupAssignments || {}
)
```

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
