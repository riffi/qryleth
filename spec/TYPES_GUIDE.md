# Руководство по унифицированной системе типов Qryleth

## Обзор архитектуры

После миграции (фазы 1-5) все типы в проекте организованы согласно принципам **Feature-Sliced Design (FSD)**:

```
src/
├── entities/           # Доменные сущности
│   ├── primitive/
│   ├── object/ 
│   ├── scene/
│   └── index.ts       # Barrel export всех entities
├── shared/             # Переиспользуемые типы
│   ├── types/
│   │   ├── core/      # Базовые утилиты (Vector3, Transform)
│   │   ├── ui/        # UI типы (ViewMode, Selection)
│   │   └── index.ts   # Barrel export shared types
│   ├── api/           # Database и API типы
│   └── lib/r3f/       # R3F технические типы
└── features/           # Бизнес-логика
    └── scene/
        └── model/     # Scene store и view типы
```

## Категории типов и использование

### 1. 🏗️ Domain Entities (`@/entities`)

**Назначение**: Бизнес-доменные сущности приложения  
**Импорт**: `import type { ... } from '@/entities'`

```typescript
// Основные доменные типы
import type { 
  GfxPrimitive,    // 3D примитивы (box, sphere, cylinder, etc.)
  GfxObject,       // Композитные 3D объекты
  GfxLayer,        // Слои сцены
  LightingSettings // Настройки освещения
} from '@/entities'

// Специфичные entity типы
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxObject } from '@/entities/object'
import type { SceneObjectInstance } from '@/entities/scene/types'
```

**Примеры использования**:
```typescript
// Создание примитива
const createBox = (): GfxPrimitive => ({
  type: 'box',
  width: 2,
  height: 2,
  depth: 2,
  position: [0, 0, 0],
  // ...
})

// Работа с композитным объектом
const processObject = (object: GfxObject) => {
  object.primitives.forEach(primitive => {
    console.log(`Primitive type: ${primitive.type}`)
  })
}
```

### 2. 🔧 Core Utilities (`@/shared/types/core`)

**Назначение**: Базовые утилитарные типы для всего приложения  
**Импорт**: `import type { ... } from '@/shared/types/core'`

```typescript
// Математические типы
import type { 
  Vector3,        // [x, y, z] координаты
  Transform       // Position, rotation, scale
} from '@/shared/types/core'

// Использование
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
// UI состояние и события
import type { 
  ViewMode,              // 'orbit' | 'walk' | 'fly'
  RenderMode,            // 'solid' | 'wireframe'
  TransformMode,         // 'translate' | 'rotate' | 'scale'
  SelectedObject,        // Выбранный объект
  HoveredObject,         // Объект под курсором
  SceneClickEvent,       // Клик по сцене
  ObjectTransformEvent   // Трансформация объекта
} from '@/shared/types/ui'

// Примеры использования
const ViewModeSelector: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('orbit')
  
  return (
    <select value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
      <option value="orbit">Orbit</option>
      <option value="walk">Walk</option>
      <option value="fly">Fly</option>
    </select>
  )
}

const handleObjectSelection = (selection: SelectedObject) => {
  console.log(`Selected object: ${selection.objectUuid}`)
  if (selection.instanceId) {
    console.log(`Instance: ${selection.instanceId}`)
  }
}
```

### 4. 📊 Store Types (`@/features/scene/model`)

**Назначение**: Типы для Zustand stores и бизнес-логики  
**Импорт**: `import type { ... } from '@/features/scene/model'`

```typescript
// Store типы
import type { 
  SceneStore,           // Главный store интерфейс
  SceneStoreState,      // Состояние store
  SceneStoreActions,    // Действия store
  SceneMetaData,        // Метаданные сцены
  SceneStatus          // Статус сцены
} from '@/features/scene/model'

// Использование в store
const useSceneStore = create<SceneStore>((set, get) => ({
  // State
  objects: [],
  selectedObject: null,
  viewMode: 'orbit',
  
  // Actions
  addObject: (object: GfxObject) => {
    set((state) => ({
      objects: [...state.objects, object]
    }))
  },
  
  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode })
  }
}))
```

### 5. 🌐 API Types (`@/shared/api`)

**Назначение**: Типы для работы с базой данных и API  
**Импорт**: `import type { ... } from '@/shared/api'`

```typescript
// Database records
import type { 
  SceneRecord,     // Запись сцены в DB
  ObjectRecord,    // Запись объекта в DB
  BaseDbRecord     // Базовый тип записи
} from '@/shared/api'

// Использование
const saveScene = async (scene: Omit<SceneRecord, 'id'>) => {
  const savedScene = await db.scenes.add(scene)
  return savedScene
}

const loadObjects = async (): Promise<ObjectRecord[]> => {
  return await db.objects.toArray()
}
```

### 6. ⚛️ Hook Return Types (`@/features/scene/model/view-types`)

**Назначение**: Возвращаемые типы пользовательских хуков  

```typescript
import type { 
  UseSceneEventsReturn,      // Результат useSceneEvents
  UseObjectSelectionReturn,  // Результат useObjectSelection
  UseSceneHistoryReturn      // Результат useSceneHistory
} from '@/features/scene/model/view-types'

// Использование
const SceneController: React.FC = () => {
  const sceneEvents: UseSceneEventsReturn = useSceneEvents()
  const selection: UseObjectSelectionReturn = useObjectSelection()
  const history: UseSceneHistoryReturn = useSceneHistory()
  
  return (
    <div>
      <button onClick={sceneEvents.resetView}>Reset View</button>
      <button onClick={selection.clearSelection}>Clear Selection</button>
      <button onClick={history.undo}>Undo</button>
    </div>
  )
}
```

## Паттерны импортов

### ✅ Рекомендуемые паттерны

```typescript
// 1. Barrel exports (предпочтительно)
import type { GfxPrimitive, GfxObject } from '@/entities'
import type { ViewMode, SelectedObject } from '@/shared/types/ui'
import type { SceneStore } from '@/features/scene/model'

// 2. Специфичные импорты (когда нужна точность)
import type { GfxPrimitive } from '@/entities/primitive'
import type { SceneRecord } from '@/shared/api'

// 3. Type-only импорты (всегда для типов)
import type { ... } from '...'  // ✅ Правильно
import { type ... } from '...'  // ✅ Также правильно
```

### ❌ Избегайте

```typescript
// 1. Относительные пути
import type { GfxPrimitive } from '../../../entities/primitive'  // ❌

// 2. Смешанные импорты типов и значений без type keyword
import { GfxPrimitive } from '@/entities'  // ❌ (если только тип)

// 3. Импорты из недоступных слоев
import type { SceneStore } from '@/features/scene/model'  // ❌ в entities слое
```

## Архитектурные правила

### 📋 Правила доступа слоев

```
entities/    ← самодостаточны, ни от кого не зависят
   ↑
shared/      ← может импортировать из entities
   ↑  
features/    ← может импортировать из shared и entities
   ↑
app/         ← может импортировать из всех слоев
```

### 🚫 Запрещенные импорты

- **entities** → features ❌
- **entities** → shared ❌  
- **shared** → features ❌
- Циклические зависимости ❌

### ✅ Разрешенные импорты

- **features** → entities ✅
- **features** → shared ✅
- **shared** → entities ✅
- **app** → любой слой ✅

## Примеры интеграции

### Создание нового компонента

```typescript
// src/features/objectEditor/ui/ObjectTransformPanel.tsx
import React from 'react'
import type { GfxObject } from '@/entities'              // Domain entity
import type { TransformMode } from '@/shared/types/ui'   // UI state
import type { SceneStore } from '@/features/scene/model' // Store
import { useSceneStore } from '@/features/scene/store'   // Store hook

interface ObjectTransformPanelProps {
  object: GfxObject
}

export const ObjectTransformPanel: React.FC<ObjectTransformPanelProps> = ({ object }) => {
  const { transformMode, setTransformMode } = useSceneStore()
  
  const handleModeChange = (mode: TransformMode) => {
    setTransformMode(mode)
  }
  
  return (
    <div>
      <h3>Transform: {object.name}</h3>
      {/* Transform controls */}
    </div>
  )
}
```

### Создание нового хука

```typescript
// src/features/objectEditor/model/useObjectValidation.ts
import { useMemo } from 'react'
import type { GfxObject } from '@/entities'
import type { ValidationResult } from '@/shared/types/ui'

export const useObjectValidation = (object: GfxObject) => {
  const validation = useMemo((): ValidationResult => {
    const errors: string[] = []
    
    if (!object.name) {
      errors.push('Object name is required')
    }
    
    if (object.primitives.length === 0) {
      errors.push('Object must contain at least one primitive')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }, [object])
  
  return validation
}

// Export return type for reuse
export type UseObjectValidationReturn = ReturnType<typeof useObjectValidation>
```

## Миграционное руководство

### При добавлении новых типов

1. **Определите слой** согласно FSD:
   - Доменная логика → `entities/`
   - Переиспользуемые утилиты → `shared/`
   - Бизнес-логика → `features/`

2. **Создайте тип в правильном месте**:
   ```typescript
   // entities/newEntity/model/types.ts
   export interface NewEntity {
     id: string
     // ...
   }
   ```

3. **Добавьте в barrel export**:
   ```typescript
   // entities/newEntity/index.ts
   export type { NewEntity } from './model/types'
   
   // entities/index.ts
   export * from './newEntity'
   ```

4. **Обновите документацию** при необходимости

### При рефакторинге существующих типов

1. **Не ломайте обратную совместимость**
2. **Используйте временные алиасы** при миграции
3. **Обновляйте импорты пошагово**
4. **Тестируйте TypeScript компиляцию** после каждого изменения

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

## Заключение

Унифицированная система типов обеспечивает:

- 🏗️ **Архитектурную чистоту** - соблюдение принципов FSD
- 📦 **Удобство использования** - понятные barrel exports  
- 🔄 **Maintainability** - легко найти и обновить типы
- ⚡ **Производительность** - type-only импорты
- 🛡️ **Безопасность** - предотвращение архитектурных нарушений

При возникновении вопросов обращайтесь к этому руководству или к архитектурным принципам проекта в `docs/qryleth_architecture_guidelines.md`.