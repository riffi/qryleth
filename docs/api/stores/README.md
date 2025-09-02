# Обзор управления состоянием

Документ описывает Zustand‑хранилища, используемые для управления состоянием в Qryleth, организованные по функциональным модулям (features).

---

## Архитектура

Qryleth использует **Zustанд** как основное решение для управления состоянием, следуя принципам Feature‑Sliced Design. Каждая фича имеет собственное хранилище для поддержания разделения обязанностей.

```
src/features/
├── editor/
│   ├── scene/
│   │   └── model/
│   │       └── sceneStore.ts       # Scene editor state
│   └── object/
│       └── model/
│           └── objectStore.ts      # Состояние редактора объекта  
└── object-library/
    └── model/
        └── libraryStore.ts         # Состояние библиотеки
```

---

## Хранилище сцены

**Местоположение**: `src/features/editor/scene/model/sceneStore.ts`  
**Назначение**: Управляет состоянием редактора 3D‑сцены

### Свойства состояния

#### 🎭 Объекты сцены
```typescript
interface SceneStoreState {
  // Содержимое сцены
  objects: SceneObject[]                    // Описанные в сцене объекты
  objectInstances: SceneObjectInstance[]    // Инстансы объектов с позицией
  layers: SceneLayer[]                      // Слои сцены и их видимость
  lighting: LightingSettings                // Настройки освещения
}
```

#### 🎮 Элементы управления видом
```typescript
interface SceneStoreState {
  viewMode: ViewMode           // Режим перемещения камеры
  renderMode: RenderMode       // Способ отображения сцены
  transformMode: TransformMode // Активный инструмент трансформации
  gridVisible: boolean         // Отображается ли сетка
}
```

#### 🎯 Выбор и взаимодействие
```typescript
interface SceneStoreState {
  selectedObject: SelectedObject | null  // Текущий выбранный объект
  hoveredObject: HoveredObject | null   // Объект под курсором
}
```

#### 📝 Метаданные сцены
```typescript
interface SceneStoreState {
  currentScene: CurrentScene  // Имя, uuid и статус текущей сцены
}
```

#### ↩️ Управление историей
```typescript
interface SceneStoreState {
  history: string[]      // Записи истории для undo/redo
  historyIndex: number   // Индекс текущей записи в истории
}
```

### Пример использования

```typescript
import { useSceneStore } from '@/features/editor/scene/model'

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
      <button onClick={handleAddCube}>Добавить куб</button>
      <ViewModeSelector 
        value={viewMode} 
        onChange={handleViewModeChange} 
      />
    </div>
  )
}
```

---

## Хранилище редактора объектов

**Местоположение**: `src/features/editor/object/model/objectStore.ts`
**Назначение**: Отвечает за редактирование объектов

### Свойства состояния

#### 🔧 Содержимое объекта
```typescript
interface ObjectStoreState {
  primitives: GfxPrimitive[]  // Примитивы в текущем объекте
}
```

#### 🎨 Среда редактора
```typescript
interface ObjectStoreState {
  lighting: LightingSettings    // Локальное освещение
  viewMode: ViewMode           // Режим камеры в редакторе
  renderMode: RenderMode       // Отображение примитивов
  transformMode: TransformMode // Действующий инструмент трансформирования
  gridVisible: boolean         // Отображается ли сетка
}
```

#### 🎯 Выбор примитивов
```typescript
interface ObjectStoreState {
  selectedPrimitiveIds: number[]      // Выделенные примитивы
  hoveredPrimitiveId: number | null   // Примитив под курсором
}
```

### Пример использования

```typescript
import { useObjectStore } from '@/features/editor/object'

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
      <button onClick={handleAddSphere}>Добавить сферу</button>
      <TransformTools 
        mode={transformMode}
        onChange={setTransformMode}
      />
    </div>
  )
}
```

---

## Хранилище библиотеки

**Местоположение**: `src/features/library/store/libraryStore.ts`  
**Назначение**: Управляет состоянием библиотеки объектов

### State Properties / Свойства состояния

```typescript
interface LibraryStoreState {
  // Содержимое библиотеки
  localObjects: LibraryObject[]     // Локальные объекты пользователя
  publicObjects: LibraryObject[]    // Публичные общие объекты
  
  // Состояние UI
  searchQuery: string               // Поисковый фильтр
  selectedCategory: string          // Выбранная категория объектов
  viewMode: 'grid' | 'list'        // Режим отображения
  
  // Состояние загрузки
  isLoading: boolean               // Индикатор загрузки
  error: string | null             // Сообщение об ошибке
}
```

---

## Паттерны интеграции хранилищ

### Связь между хранилищами

```typescript
// Пример: добавление объекта из библиотеки в сцену
const addLibraryObjectToScene = async (libraryObject: LibraryObject) => {
  const result = await SceneAPI.addObjectFromLibrary(libraryObject.uuid, 'objects')
  if (!result.success) {
    console.error(result.error)
  }
}

// Пример: открытие объекта сцены в редакторе объекта
const editSceneObject = (sceneObject: SceneObject) => {
  const primitives = sceneObject.primitives
  useObjectStore.getState().setPrimitives(primitives)
  
  // Navigate to object editor
  router.push('/object-editor')
}
```

### Селекторы хранилищ

```typescript
// Оптимизированные селекторы для предотвращения лишних перерисовок
const selectedObjectName = useSceneStore(state => state.selectedObject?.name)
const primitiveCount = useObjectStore(state => state.primitives.length)
const isSceneModified = useSceneStore(state => state.historyIndex > 0)
```

### Сохранение состояния

```typescript
// Паттерн автосохранения сцены
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

## Тестирование хранилищ

### Юнит‑тестирование хранилищ

```typescript
import { renderHook, act } from '@testing-library/react'
import { useSceneStore } from '@/features/editor/scene/model'

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

## Оптимизация производительности

### Селективные подписки

```typescript
// ❌ Плохо: повторный рендер при любом изменении состояния
const sceneData = useSceneStore()

// ✅ Хорошо: повторный рендер только при изменении objects
const objects = useSceneStore(state => state.objects)
const selectedObject = useSceneStore(state => state.selectedObject)
```

### Нормализация состояния

```typescript
// Нормализованное хранение для эффективного доступа
interface OptimizedSceneState {
  objects: Record<string, SceneObject>      // Objects by ID
  objectIds: string[]                       // Ordered list of IDs
  selectedObjectId: string | null           // Reference by ID
}
```

### Интеграция middleware

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

## Связанная документация

- [Принципы проектирования](../../architecture/design-principles.md)
- [Система типов](../types/README.md)
- [Управление сценой](../../features/scene-management/README.md)
- [Редактирование объектов](../../features/object-editing/README.md)

---

## Лучшие практики

### Организация хранилищ

1. **Единственная ответственность** — одно хранилище на одну предметную область
2. **Иммутабельные обновления** — используйте Immer или spread‑операторы  
3. **Типобезопасность** — описывайте состояние через интерфейсы TypeScript
4. **Селективные подписки** — подписывайтесь на конкретные срезы состояния
5. **Тестирование** — пишите юнит‑тесты для действий и селекторов

### Проектирование состояния

1. **Нормализация данных** — избегайте глубоко вложенных структур
2. **Разделение обязанностей** — отделяйте UI‑состояние от доменных данных
3. **Асинхронность** — используйте индикаторы загрузки и обработку ошибок
4. **История** — реализуйте undo/redo для пользовательских действий
5. **Персистентность** — автосохраняйте важные пользовательские данные

---

> 📝 Примечание: все хранилища следуют архитектуре Feature‑Sliced Design и поддерживают строгое разделение обязанностей. См. [Принципы проектирования](../../architecture/design-principles.md).

