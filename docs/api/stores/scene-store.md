# Scene Store API Reference / Справочник API хранилища сцены

Detailed documentation for the Scene Store that manages 3D scene editor state.

Подробная документация для хранилища сцены, которое управляет состоянием редактора 3D сцен.

---

## Location / Местоположение

```typescript
import { useSceneStore } from '@/features/scene/store/sceneStore'
```

---

## State Interface / Интерфейс состояния

### Core Scene Data / Основные данные сцены

```typescript
interface SceneStoreState {
  // Scene objects / Объекты сцены
  objects: SceneObject[]                    // All objects in the scene
  objectInstances: SceneObjectInstance[]    // Object instances with transforms
  layers: SceneLayer[]                      // Scene organization layers
  lighting: LightingSettings               // Scene lighting configuration
  
  // Current scene metadata / Метаданные текущей сцены  
  currentScene: CurrentScene               // Scene info (name, uuid, status)
}
```

### View & Interaction State / Состояние вида и взаимодействия

```typescript
interface SceneStoreState {
  // Camera and rendering / Камера и рендеринг
  viewMode: ViewMode           // 'orbit' | 'walk' | 'fly'
  renderMode: RenderMode       // 'solid' | 'wireframe' | 'points'
  transformMode: TransformMode // 'translate' | 'rotate' | 'scale'
  gridVisible: boolean         // Show/hide grid
  
  // Object selection / Выбор объектов
  selectedObject: SelectedObject | null  // Currently selected object
  hoveredObject: HoveredObject | null   // Object under mouse cursor
}
```

### History Management / Управление историей

```typescript
interface SceneStoreState {
  history: string[]      // Serialized scene states for undo/redo
  historyIndex: number   // Current position in history stack
}
```

---

## Actions / Действия

### Scene Management / Управление сценой

#### `createNewScene(name: string): void`
Creates a new empty scene with the given name.

Создает новую пустую сцену с указанным именем.

```typescript
const { createNewScene } = useSceneStore()

const handleNewScene = () => {
  createNewScene('My New Scene')
}
```

#### `loadScene(sceneData: SceneData): void`
Loads an existing scene from saved data.

Загружает существующую сцену из сохраненных данных.

```typescript
const { loadScene } = useSceneStore()

const handleLoadScene = async (sceneId: string) => {
  const sceneData = await loadSceneFromDB(sceneId)
  loadScene(sceneData)
}
```

#### `saveScene(): Promise<void>`
Saves the current scene state to storage.

Сохраняет текущее состояние сцены в хранилище.

```typescript
const { saveScene } = useSceneStore()

const handleSave = async () => {
  await saveScene()
  showNotification('Scene saved successfully')
}
```

### Object Management / Управление объектами

#### `addObject(object: SceneObject): void`
Adds a new object to the scene.

Добавляет новый объект в сцену.

```typescript
const { addObject } = useSceneStore()

const handleAddCube = () => {
  const cube = createCubeObject({
    name: 'New Cube',
    position: [0, 0, 0]
  })
  addObject(cube)
}
```

#### `removeObject(objectId: string): void`
Removes an object from the scene.

Удаляет объект из сцены.

```typescript
const { removeObject, selectedObject } = useSceneStore()

const handleDeleteSelected = () => {
  if (selectedObject) {
    removeObject(selectedObject.objectUuid)
  }
}
```

#### `updateObject(objectId: string, updates: Partial<SceneObject>): void`
Updates properties of an existing object.

Обновляет свойства существующего объекта.

```typescript
const { updateObject } = useSceneStore()

const handleRenameObject = (objectId: string, newName: string) => {
  updateObject(objectId, { name: newName })
}
```

#### `duplicateObject(objectId: string): void`
Creates a copy of an existing object.

Создает копию существующего объекта.

```typescript
const { duplicateObject, selectedObject } = useSceneStore()

const handleDuplicate = () => {
  if (selectedObject) {
    duplicateObject(selectedObject.objectUuid)
  }
}
```

### Instance Management / Управление инстансами

#### `addObjectInstance(objectId: string, transform: Transform): void`
Adds a new instance of an existing object.

Добавляет новый инстанс существующего объекта.

```typescript
const { addObjectInstance } = useSceneStore()

const handleInstanceObject = (objectId: string) => {
  addObjectInstance(objectId, {
    position: [2, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1]
  })
}
```

#### `updateObjectInstance(instanceId: string, transform: Partial<Transform>): void`
Updates the transform of an object instance.

Обновляет трансформацию инстанса объекта.

**Note**: This method is automatically called by the `TransformGizmo` component when objects are modified via transform controls in the 3D viewport. Manual calls are typically not needed for user interactions.

**Примечание**: Этот метод автоматически вызывается компонентом `TransformGizmo` при модификации объектов через элементы управления трансформацией в 3D-области. Ручные вызовы обычно не требуются для пользовательских взаимодействий.

```typescript
const { updateObjectInstance } = useSceneStore()

const handleMoveInstance = (instanceId: string, newPosition: Vector3) => {
  updateObjectInstance(instanceId, { position: newPosition })
}
```

#### `removeObjectInstance(instanceId: string): void`
Removes an object instance from the scene.

Удаляет инстанс объекта из сцены.

```typescript
const { removeObjectInstance } = useSceneStore()

const handleRemoveInstance = (instanceId: string) => {
  removeObjectInstance(instanceId)
}
```

### Selection Management / Управление выбором

#### `selectObject(objectUuid: string, instanceId?: string): void`
Selects an object or object instance.

Выбирает объект или инстанс объекта.

```typescript
const { selectObject } = useSceneStore()

const handleObjectClick = (objectUuid: string, instanceId?: string) => {
  selectObject(objectUuid, instanceId)
}
```

#### `clearSelection(): void`
Clears the current selection.

Очищает текущий выбор.

```typescript
const { clearSelection } = useSceneStore()

const handleDeselectAll = () => {
  clearSelection()
}
```

#### `setHoveredObject(objectUuid?: string, instanceId?: string): void`
Sets or clears the hovered object.

Устанавливает или очищает объект под курсором.

```typescript
const { setHoveredObject } = useSceneStore()

const handleMouseEnter = (objectUuid: string) => {
  setHoveredObject(objectUuid)
}

const handleMouseLeave = () => {
  setHoveredObject()
}
```

### Layer Management / Управление слоями

#### `createLayer(name: string, visible: boolean = true): void`
Creates a new scene layer.

Создает новый слой сцены.

```typescript
const { createLayer } = useSceneStore()

const handleCreateLayer = () => {
  createLayer('Background Objects', true)
}
```

#### `toggleLayerVisibility(layerId: string): void`
Toggles the visibility of a layer.

Переключает видимость слоя.

```typescript
const { toggleLayerVisibility } = useSceneStore()

const handleToggleLayer = (layerId: string) => {
  toggleLayerVisibility(layerId)
}
```

#### `assignObjectToLayer(objectId: string, layerId: string): void`
Assigns an object to a specific layer.

Назначает объект определенному слою.

```typescript
const { assignObjectToLayer } = useSceneStore()

const handleMoveToLayer = (objectId: string, layerId: string) => {
  assignObjectToLayer(objectId, layerId)
}
```

### View Controls / Элементы управления видом

#### `setViewMode(mode: ViewMode): void`
Changes the camera control mode.

Изменяет режим управления камерой.

```typescript
const { setViewMode } = useSceneStore()

const handleViewModeChange = (mode: ViewMode) => {
  setViewMode(mode)
}
```

#### `setRenderMode(mode: RenderMode): void`
Changes the scene rendering mode.

Изменяет режим рендеринга сцены.

```typescript
const { setRenderMode } = useSceneStore()

const handleRenderModeChange = (mode: RenderMode) => {
  setRenderMode(mode)
}
```

#### `setTransformMode(mode: TransformMode): void`
Changes the active transformation tool.

Изменяет активный инструмент трансформации.

```typescript
const { setTransformMode } = useSceneStore()

const handleToolChange = (mode: TransformMode) => {
  setTransformMode(mode)
}
```

#### `toggleGrid(): void`
Toggles grid visibility.

Переключает видимость сетки.

```typescript
const { toggleGrid } = useSceneStore()

const handleToggleGrid = () => {
  toggleGrid()
}
```

### Lighting Controls / Элементы управления освещением

#### `updateLighting(settings: Partial<LightingSettings>): void`
Updates scene lighting configuration.

Обновляет конфигурацию освещения сцены.

```typescript
const { updateLighting } = useSceneStore()

const handleLightingChange = () => {
  updateLighting({
    ambientIntensity: 0.3,
    directionalLight: {
      intensity: 1.0,
      direction: [-1, -1, -1],
      color: '#ffffff'
    }
  })
}
```

### History Management / Управление историей

#### `undo(): void`
Reverts to the previous scene state.

Возвращается к предыдущему состоянию сцены.

```typescript
const { undo, canUndo } = useSceneStore()

const handleUndo = () => {
  if (canUndo()) {
    undo()
  }
}
```

#### `redo(): void`
Re-applies the next scene state.

Повторно применяет следующее состояние сцены.

```typescript
const { redo, canRedo } = useSceneStore()

const handleRedo = () => {
  if (canRedo()) {
    redo()
  }
}
```

#### `pushToHistory(): void`
Manually saves the current state to history.

Вручную сохраняет текущее состояние в историю.

```typescript
const { pushToHistory } = useSceneStore()

// Save state before major operation
pushToHistory()
performMajorSceneChange()
```

---

## Selectors / Селекторы

### Performance-Optimized Selectors / Оптимизированные селекторы

```typescript
// Get only selected object name (prevents re-renders)
const selectedObjectName = useSceneStore(state => 
  state.selectedObject?.name
)

// Get object count
const objectCount = useSceneStore(state => 
  state.objects.length
)

// Get visible layers
const visibleLayers = useSceneStore(state => 
  state.layers.filter(layer => layer.visible)
)

// Check if scene is modified
const isSceneModified = useSceneStore(state => 
  state.historyIndex > 0
)

// Get current scene status
const sceneStatus = useSceneStore(state => 
  state.currentScene.status
)
```

### Complex Selectors / Сложные селекторы

```typescript
// Get all objects in a specific layer
const getObjectsInLayer = (layerId: string) => 
  useSceneStore(state => 
    state.objects.filter(obj => obj.layerId === layerId)
  )

// Get selected object with full data
const getSelectedObjectFull = () => 
  useSceneStore(state => {
    if (!state.selectedObject) return null
    
    const object = state.objects.find(obj => 
      obj.uuid === state.selectedObject!.objectUuid
    )
    
    const instance = state.selectedObject.instanceId 
      ? state.objectInstances.find(inst => 
          inst.uuid === state.selectedObject!.instanceId
        )
      : null
    
    return { object, instance }
  })
```

---

## Usage Examples / Примеры использования

### Basic Scene Editor Component / Базовый компонент редактора сцены

```typescript
import React from 'react'
import { useSceneStore } from '@/features/scene/store'
import type { ViewMode, RenderMode } from '@/shared/types/ui'

const SceneEditor: React.FC = () => {
  const {
    objects,
    selectedObject,
    viewMode,
    renderMode,
    gridVisible,
    addObject,
    selectObject,
    setViewMode,
    setRenderMode,
    toggleGrid,
    undo,
    redo,
    canUndo,
    canRedo
  } = useSceneStore()

  const handleAddCube = () => {
    const cube = createCubeObject()
    addObject(cube)
  }

  return (
    <div className="scene-editor">
      {/* Toolbar */}
      <div className="toolbar">
        <button onClick={handleAddCube}>Add Cube</button>
        <button onClick={toggleGrid}>Toggle Grid</button>
        <button onClick={undo} disabled={!canUndo()}>Undo</button>
        <button onClick={redo} disabled={!canRedo()}>Redo</button>
        
        <select 
          value={viewMode} 
          onChange={e => setViewMode(e.target.value as ViewMode)}
        >
          <option value="orbit">Orbit</option>
          <option value="walk">Walk</option>
          <option value="fly">Fly</option>
        </select>

        <select 
          value={renderMode} 
          onChange={e => setRenderMode(e.target.value as RenderMode)}
        >
          <option value="solid">Solid</option>
          <option value="wireframe">Wireframe</option>
          <option value="points">Points</option>
        </select>
      </div>

      {/* Scene Info */}
      <div className="scene-info">
        <p>Objects: {objects.length}</p>
        <p>Selected: {selectedObject?.name || 'None'}</p>
        <p>Grid: {gridVisible ? 'Visible' : 'Hidden'}</p>
      </div>

      {/* 3D Viewport */}
      <div className="viewport">
        {/* 3D canvas component would go here */}
      </div>
    </div>
  )
}
```

### Scene Object List Component / Компонент списка объектов сцены

```typescript
const SceneObjectList: React.FC = () => {
  const {
    objects,
    selectedObject,
    selectObject,
    removeObject,
    duplicateObject
  } = useSceneStore()

  return (
    <div className="object-list">
      <h3>Scene Objects</h3>
      {objects.map(object => (
        <div 
          key={object.uuid}
          className={`object-item ${
            selectedObject?.objectUuid === object.uuid ? 'selected' : ''
          }`}
          onClick={() => selectObject(object.uuid)}
        >
          <span>{object.name}</span>
          <div className="object-actions">
            <button onClick={() => duplicateObject(object.uuid)}>
              Duplicate
            </button>
            <button onClick={() => removeObject(object.uuid)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## Integration with Other Stores / Интеграция с другими хранилищами

### Cross-Store Operations / Межхранилищные операции

```typescript
// Edit selected scene object in object editor
const editSelectedObject = () => {
  const sceneStore = useSceneStore.getState()
  const objectStore = useObjectStore.getState()
  
  if (sceneStore.selectedObject) {
    const object = sceneStore.objects.find(obj => 
      obj.uuid === sceneStore.selectedObject!.objectUuid
    )
    
    if (object) {
      // Load object into object editor
      objectStore.setPrimitives(object.primitives)
      objectStore.setObjectMetadata({
        name: object.name,
        uuid: object.uuid
      })
    }
  }
}

// Add library object to scene
const addLibraryObjectToScene = (libraryObject: LibraryObject) => {
  const sceneObject = convertLibraryObjectToSceneObject(libraryObject)
  useSceneStore.getState().addObject(sceneObject)
}
```

---

## Type Definitions / Определения типов

See [Type System Documentation](../types/README.md) for complete type definitions used in the scene store.

Смотрите [Документацию системы типов](../types/README.md) для полных определений типов, используемых в хранилище сцены.

---

## Testing / Тестирование

### Store Testing Examples / Примеры тестирования хранилища

```typescript
import { renderHook, act } from '@testing-library/react'
import { useSceneStore } from '@/features/scene/store'

describe('SceneStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSceneStore.getState().reset()
  })

  it('should add object to scene', () => {
    const { result } = renderHook(() => useSceneStore())
    const mockObject = createMockSceneObject()
    
    act(() => {
      result.current.addObject(mockObject)
    })
    
    expect(result.current.objects).toContain(mockObject)
  })

  it('should select object', () => {
    const { result } = renderHook(() => useSceneStore())
    const mockObject = createMockSceneObject()
    
    act(() => {
      result.current.addObject(mockObject)
      result.current.selectObject(mockObject.uuid)
    })
    
    expect(result.current.selectedObject?.objectUuid).toBe(mockObject.uuid)
  })

  it('should handle undo/redo', () => {
    const { result } = renderHook(() => useSceneStore())
    const mockObject = createMockSceneObject()
    
    act(() => {
      // Initial state - save to history
      result.current.pushToHistory()
      
      // Add object
      result.current.addObject(mockObject)
      
      // Undo
      result.current.undo()
    })
    
    expect(result.current.objects).not.toContain(mockObject)
    expect(result.current.canRedo()).toBe(true)
  })
})
```

---

## Performance Considerations / Соображения производительности

### Optimization Tips / Советы по оптимизации

1. **Use selective subscriptions** - Subscribe only to needed state slices
2. **Batch operations** - Group related state changes together
3. **Optimize selectors** - Use memoized selectors for complex computations
4. **Minimize re-renders** - Use specific selectors instead of full store state
5. **Debounce frequent updates** - Debounce operations like auto-save

```typescript
// ❌ Bad: Causes re-render on any state change
const sceneStore = useSceneStore()

// ✅ Good: Only re-renders when objects change
const objects = useSceneStore(state => state.objects)
const objectCount = useSceneStore(state => state.objects.length)
```

---

## Related Documentation / Связанная документация

- [Object Editor Store](object-editor-store.md) - Object editing state
- [Library Store](library-store.md) - Object library state  
- [Type System](../types/README.md) - Store type definitions
- [Scene Management Features](../../features/scene-management/README.md) - Scene features
- [Testing Guide](../../development/testing/README.md) - Store testing strategies