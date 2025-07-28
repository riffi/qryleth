# State Management Overview / Обзор управления состоянием

This document describes the Zustand stores used for state management in Qryleth, organized by features.

Документ описывает Zustand хранилища, используемые для управления состоянием в Qryleth, организованные по функциям.

---

## Architecture / Архитектура

Qryleth uses **Zustand** as the primary state management solution, following Feature-Sliced Design principles. Each feature has its own store to maintain separation of concerns.

Qryleth использует **Zustand** как основное решение для управления состоянием, следуя принципам Feature-Sliced Design. Каждая функция имеет свое хранилище для поддержания разделения обязанностей.

```
src/features/
├── scene/
│   └── store/
│       └── sceneStore.ts      # Scene editor state
├── object-editor/
│   └── store/
│       └── objectStore.ts     # Object editor state  
└── library/
    └── store/
        └── libraryStore.ts    # Library state
```

---

## Scene Store / Хранилище сцены

**Location**: `src/features/scene/store/sceneStore.ts`  
**Purpose**: Manages the 3D scene editor state

**Местоположение**: `src/features/scene/store/sceneStore.ts`  
**Назначение**: Управляет состоянием редактора 3D сцены

### State Properties / Свойства состояния

#### 🎭 Scene Objects / Объекты сцены
```typescript
interface SceneStoreState {
  // Scene content / Содержимое сцены
  objects: SceneObject[]                    // Objects defined in scene / Описанные в сцене объекты
  objectInstances: SceneObjectInstance[]    // Object instances with position / Инстансы объектов с позицией
  layers: SceneLayer[]                      // Scene layers and visibility / Слои сцены и их видимость
  lighting: LightingSettings                // Lighting configuration / Настройки освещения
}
```

#### 🎮 View Controls / Элементы управления видом
```typescript
interface SceneStoreState {
  viewMode: ViewMode           // Camera movement mode / Режим перемещения камеры
  renderMode: RenderMode       // Scene display method / Способ отображения сцены
  transformMode: TransformMode // Active transformation tool / Активный инструмент трансформации
  gridVisible: boolean         // Grid visibility / Отображается ли сетка
}
```

#### 🎯 Selection & Interaction / Выбор и взаимодействие
```typescript
interface SceneStoreState {
  selectedObject: SelectedObject | null  // Currently selected object / Текущий выбранный объект
  hoveredObject: HoveredObject | null   // Object under cursor / Объект под курсором
}
```

#### 📝 Scene Metadata / Метаданные сцены
```typescript
interface SceneStoreState {
  currentScene: CurrentScene  // Scene name, uuid, and status / Имя, uuid и статус текущей сцены
}
```

#### ↩️ History Management / Управление историей
```typescript
interface SceneStoreState {
  history: string[]      // History records for undo/redo / Записи истории для undo/redo
  historyIndex: number   // Current record index in history / Индекс текущей записи в истории
}
```

### Usage Example / Пример использования

```typescript
import { useSceneStore } from '@/features/scene/store'

const SceneEditor: React.FC = () => {
  const {
    objects,
    selectedObject,
    viewMode,
    addObject,
    selectObject,
    setViewMode
  } = useSceneStore()

  const handleAddCube = () => {
    const cube = createCubeObject()
    addObject(cube)
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
  }

  return (
    <div>
      <button onClick={handleAddCube}>Add Cube</button>
      <ViewModeSelector 
        value={viewMode} 
        onChange={handleViewModeChange} 
      />
    </div>
  )
}
```

---

## Object Editor Store / Хранилище редактора объектов

**Location**: `src/features/object-editor/model/objectStore.ts`
**Purpose**: Manages object editing state

**Местоположение**: `src/features/object-editor/model/objectStore.ts`
**Назначение**: Отвечает за редактирование объектов

### State Properties / Свойства состояния

#### 🔧 Object Content / Содержимое объекта
```typescript
interface ObjectStoreState {
  primitives: GfxPrimitive[]  // Primitives in current object / Примитивы в текущем объекте
}
```

#### 🎨 Editor Environment / Среда редактора
```typescript
interface ObjectStoreState {
  lighting: LightingSettings    // Local lighting / Локальное освещение
  viewMode: ViewMode           // Camera mode in editor / Режим камеры в редакторе
  renderMode: RenderMode       // Primitive display / Отображение примитивов
  transformMode: TransformMode // Active transformation tool / Действующий инструмент трансформирования
}
```

#### 🎯 Primitive Selection / Выбор примитивов
```typescript
interface ObjectStoreState {
  selectedPrimitiveIds: number[]      // Selected primitives / Выделенные примитивы
  hoveredPrimitiveId: number | null   // Primitive under cursor / Примитив под курсором
}
```

### Usage Example / Пример использования

```typescript
import { useObjectStore } from '@/features/object-editor'

const ObjectEditor: React.FC = () => {
  const {
    primitives,
    selectedPrimitiveIds,
    transformMode,
    addPrimitive,
    setSelectedPrimitives,
    setTransformMode
  } = useObjectStore()

  const handleAddSphere = () => {
    const sphere = createSpherePrimitive()
    addPrimitive(sphere)
  }

  return (
    <div>
      <button onClick={handleAddSphere}>Add Sphere</button>
      <TransformTools 
        mode={transformMode}
        onChange={setTransformMode}
      />
    </div>
  )
}
```

---

## Library Store / Хранилище библиотеки

**Location**: `src/features/library/store/libraryStore.ts`  
**Purpose**: Manages object library state

**Местоположение**: `src/features/library/store/libraryStore.ts`  
**Назначение**: Управляет состоянием библиотеки объектов

### State Properties / Свойства состояния

```typescript
interface LibraryStoreState {
  // Library content / Содержимое библиотеки
  localObjects: LibraryObject[]     // User's local objects / Локальные объекты пользователя
  publicObjects: LibraryObject[]    // Public shared objects / Публичные общие объекты
  
  // UI state / Состояние UI
  searchQuery: string               // Search filter / Поисковый фильтр
  selectedCategory: string          // Selected object category / Выбранная категория объектов
  viewMode: 'grid' | 'list'        // Display mode / Режим отображения
  
  // Loading state / Состояние загрузки
  isLoading: boolean               // Loading indicator / Индикатор загрузки
  error: string | null             // Error message / Сообщение об ошибке
}
```

---

## Store Integration Patterns / Паттерны интеграции хранилищ

### Cross-Store Communication / Связь между хранилищами

```typescript
// Example: Adding object from library to scene
const addLibraryObjectToScene = async (libraryObject: LibraryObject) => {
  const result = await SceneAPI.addObjectFromLibrary(libraryObject.uuid, 'objects')
  if (!result.success) {
    console.error(result.error)
  }
}

// Example: Editing scene object in object editor
const editSceneObject = (sceneObject: SceneObject) => {
  const primitives = sceneObject.primitives
  useObjectStore.getState().setPrimitives(primitives)
  
  // Navigate to object editor
  router.push('/object-editor')
}
```

### Store Selectors / Селекторы хранилищ

```typescript
// Optimized selectors to prevent unnecessary re-renders
const selectedObjectName = useSceneStore(state => state.selectedObject?.name)
const primitiveCount = useObjectStore(state => state.primitives.length)
const isSceneModified = useSceneStore(state => state.historyIndex > 0)
```

### State Persistence / Сохранение состояния

```typescript
// Scene auto-save pattern
useEffect(() => {
  const unsubscribe = useSceneStore.subscribe(
    state => state.objects,
    objects => {
      // Auto-save scene when objects change
      debouncedSaveScene(objects)
    }
  )
  
  return unsubscribe
}, [])
```

---

## Store Testing / Тестирование хранилищ

### Unit Testing Stores / Юнит-тестирование хранилищ

```typescript
import { renderHook, act } from '@testing-library/react'
import { useSceneStore } from '@/features/scene/store'

describe('SceneStore', () => {
  beforeEach(() => {
    useSceneStore.getState().reset()
  })

  it('should add object to scene', () => {
    const { result } = renderHook(() => useSceneStore())
    
    act(() => {
      result.current.addObject(mockObject)
    })
    
    expect(result.current.objects).toContain(mockObject)
  })

  it('should select object', () => {
    const { result } = renderHook(() => useSceneStore())
    
    act(() => {
      result.current.selectObject(mockObject.id)
    })
    
    expect(result.current.selectedObject?.id).toBe(mockObject.id)
  })
})
```

---

## Performance Optimization / Оптимизация производительности

### Selective Subscriptions / Селективные подписки

```typescript
// ❌ Bad: Re-renders on any state change
const sceneData = useSceneStore()

// ✅ Good: Re-renders only when objects change
const objects = useSceneStore(state => state.objects)
const selectedObject = useSceneStore(state => state.selectedObject)
```

### State Normalization / Нормализация состояния

```typescript
// Normalized object storage for efficient lookups
interface OptimizedSceneState {
  objects: Record<string, SceneObject>      // Objects by ID
  objectIds: string[]                       // Ordered list of IDs
  selectedObjectId: string | null           // Reference by ID
}
```

### Middleware Integration / Интеграция middleware

```typescript
import { subscribeWithSelector } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'

export const useSceneStore = create<SceneStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Store implementation
    })),
    { name: 'scene-store' }
  )
)
```

---

## Related Documentation / Связанная документация

- [Design Principles](../../architecture/design-principles.md) - Architecture guidelines
- [Type System](../types/README.md) - Store type definitions
- [Scene Management](../../features/scene-management/README.md) - Scene feature documentation
- [Object Editing](../../features/object-editing/README.md) - Object editor features

---

## Best Practices / Лучшие практики

### Store Organization / Организация хранилищ

1. **Single Responsibility** - Each store manages one feature area
2. **Immutable Updates** - Use Immer or spread operators for updates  
3. **Type Safety** - Always use TypeScript interfaces for state
4. **Selective Subscriptions** - Subscribe to specific state slices
5. **Testing** - Write unit tests for store actions and selectors

### State Design / Проектирование состояния

1. **Normalize Data** - Avoid nested objects for better performance
2. **Separate Concerns** - Keep UI state separate from domain data
3. **Async Handling** - Use loading states and error handling
4. **History Management** - Implement undo/redo for user actions
5. **Persistence** - Auto-save important user data

---

> 📝 **Note**: All stores follow the Feature-Sliced Design architecture and maintain strict separation of concerns. See [Design Principles](../../architecture/design-principles.md) for more information.
> 
> 📝 **Примечание**: Все хранилища следуют архитектуре Feature-Sliced Design и поддерживают строгое разделение обязанностей. См. [Принципы проектирования](../../architecture/design-principles.md) для получения дополнительной информации.
