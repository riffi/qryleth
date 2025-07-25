# Руководство по созданию сцен

Подробное руководство по созданию и управлению 3D сценами в Qryleth.

---

## Обзор

Создание сцен в Qryleth сочетает традиционные инструменты 3D редактирования с помощью ИИ для обеспечения интуитивного и мощного опыта создания контента.

Код управления сценой находится в `src/features/scene` с сегментами `model` и `ui` согласно FSD.

---

## Начало работы

### Создание новой сцены

1. **Перейти в редактор сцен**
   ```
   /scene-editor (without UUID parameter)
   ```

2. **Инициализировать пустую сцену**
   - Scene automatically initializes with default settings
   - Empty object list and default lighting
   - Grid visible for reference

3. **Установить свойства сцены**
   ```typescript
   // Scene is automatically named "Untitled Scene"
   // Can be renamed when saving
   const sceneMetadata = {
     name: 'My New Scene',
     description: 'Scene description',
     tags: ['architecture', 'interior']
   }
   ```

### Загрузка существующей сцены

```typescript
// URL with scene UUID
/scene-editor/550e8400-e29b-41d4-a716-446655440000

// Programmatic loading
const loadScene = async (sceneUuid: string) => {
  const sceneData = await db.scenes.get(sceneUuid)
  if (sceneData) {
    loadSceneFromData(sceneData)
  }
}
```

---

## Ручное создание сцены

### Ручное добавление объектов

#### Использование библиотеки объектов

1. **Открыть панель библиотеки объектов**
2. **Просмотреть доступные объекты**
   - Local objects (created by user)
   - Public objects (shared community objects)
3. **Выбрать и разместить**
   ```typescript
   const handleAddObjectToScene = (object: ObjectRecord, layerId: string) => {
     const { addObject, addObjectInstance } = useSceneStore.getState()

     const newObject = {
       uuid: generateUUID(),
       name: object.name,
       primitives: object.objectData.primitives,
       visible: true,
       layerId
     }

     addObject(newObject)
     addObjectInstance({
       uuid: generateUUID(),
       objectUuid: newObject.uuid,
       transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
       visible: true
     })
   }
   ```



### Манипулирование объектами

#### Элементы управления трансформацией

```typescript
// Transform modes
type TransformMode = 'translate' | 'rotate' | 'scale'

const TransformToolbar = () => {
  const { transformMode, setTransformMode } = useSceneStore()
  
  return (
    <div className="transform-toolbar">
      <button 
        className={transformMode === 'translate' ? 'active' : ''}
        onClick={() => setTransformMode('translate')}
      >
        Move (G)
      </button>
      <button 
        className={transformMode === 'rotate' ? 'active' : ''}
        onClick={() => setTransformMode('rotate')}
      >
        Rotate (R)
      </button>
      <button 
        className={transformMode === 'scale' ? 'active' : ''}
        onClick={() => setTransformMode('scale')}
      >
        Scale (S)
      </button>
    </div>
  )
}
```

#### Precision Editing / Точное редактирование

```typescript
// Direct property editing
const updateObjectTransform = (objectId: string, transform: Partial<Transform>) => {
  updateObject(objectId, {
    transform: {
      ...existingTransform,
      ...transform
    }
  })
}

// Example: Set exact position
updateObjectTransform(selectedObjectId, {
  position: [2.5, 1.0, -3.2]
})
```

### Layer Management / Управление слоями

#### Creating Layers / Создание слоев

```typescript
const addLayer = (name: string, visible: boolean = true) => {
  const { createLayer, layers } = useSceneStore.getState()

  createLayer({
    name,
    visible,
    position: layers.length
  })
}

// Пример использования
addLayer('Background Objects', true)
addLayer('Interactive Elements', true)
addLayer('Lighting', false) // Initially hidden
```

#### Organizing Objects / Организация объектов

```typescript
// Assign object to layer
const organizeObjects = () => {
  // Group by type
  objects.forEach(object => {
    if (object.type === 'furniture') {
      assignObjectToLayer(object.uuid, 'furniture-layer')
    } else if (object.type === 'lighting') {
      assignObjectToLayer(object.uuid, 'lighting-layer')
    }
  })
}

// Toggle layer visibility
const toggleBackgroundObjects = () => {
  const bgLayer = layers.find(layer => layer.name === 'Background Objects')
  if (bgLayer) {
    toggleLayerVisibility(bgLayer.uuid)
  }
}
```

---

## AI-Assisted Scene Creation / Создание сцены с помощью ИИ

### Natural Language Commands / Команды на естественном языке

#### Basic Object Creation / Базовое создание объектов

```
"Add a red cube to the center of the scene"
"Create a wooden table with four chairs around it"
"Place a sphere above the ground plane"
"Generate a simple room with walls and a floor"
```

#### Scene Composition / Композиция сцены

```
"Create a living room scene with a sofa, coffee table, and TV"
"Build a product photography setup with proper lighting"
"Generate an outdoor garden scene with trees and flowers"
"Set up a minimalist bedroom with modern furniture"
```

#### Lighting and Atmosphere / Освещение и атмосфера

```
"Add warm lighting for a cozy atmosphere"
"Set up three-point lighting for product photography"
"Create dramatic shadows with directional lighting"
"Add ambient lighting to brighten the scene"
```


## Lighting Configuration / Конфигурация освещения

### Basic Lighting Setup / Базовая настройка освещения

```typescript
// Default lighting configuration
const defaultLighting: LightingSettings = {
  ambientLight: {
    intensity: 0.3,
    color: '#ffffff'
  },
  directionalLight: {
    intensity: 1.0,
    position: [10, 10, 5],
    direction: [-1, -1, -1],
    color: '#ffffff',
    castShadow: true
  },
  pointLights: [],
  spotLights: [],
  environmentMap: null
}

// Update lighting
const configureLighting = () => {
  updateLighting({
    ambientLight: {
      intensity: 0.4,
      color: '#f0f0f0'
    },
    directionalLight: {
      intensity: 0.8,
      direction: [-0.5, -1, -0.5],
      color: '#fff8e1'
    }
  })
}
```

### Advanced Lighting Scenarios / Продвинутые сценарии освещения

#### Product Photography Lighting / Освещение для предметной съемки

```typescript
const setupProductLighting = () => {
  updateLighting({
    ambientLight: { intensity: 0.2, color: '#ffffff' },
    directionalLight: {
      intensity: 1.2,
      direction: [-0.3, -1, -0.3],
      color: '#ffffff',
      castShadow: true
    },
    pointLights: [
      {
        position: [5, 3, 2],
        intensity: 0.8,
        color: '#ffffff',
        distance: 10
      },
      {
        position: [-3, 2, 4],
        intensity: 0.6,
        color: '#f8f8ff',
        distance: 8
      }
    ]
  })
}
```

#### Architectural Interior Lighting / Архитектурное внутреннее освещение

```typescript
const setupInteriorLighting = () => {
  updateLighting({
    ambientLight: { intensity: 0.4, color: '#f5f5f0' },
    directionalLight: {
      intensity: 0.6,
      direction: [0.2, -1, 0.3],
      color: '#fff8dc',
      castShadow: true
    },
    spotLights: [
      {
        position: [0, 4, 0],
        direction: [0, -1, 0],
        intensity: 1.0,
        angle: Math.PI / 6,
        penumbra: 0.2,
        color: '#fffaf0'
      }
    ]
  })
}
```

---

## Related Documentation / Связанная документация

- [Object Management](object-placement.md) - Detailed object manipulation
- [Lighting System](lighting-system.md) - Advanced lighting configuration
- [Layer System](layer-system.md) - Layer management and organization
- [Scene Store API](../../api/stores/scene-store.md) - Scene state management
- [AI Integration](../ai-integration/README.md) - AI-assisted scene creation

---

> 🎬 **Scene creation in Qryleth combines the power of traditional 3D tools with AI assistance, making it easy to create stunning 3D environments for any purpose.**
> 
> 🎬 **Создание сцен в Qryleth сочетает мощь традиционных 3D инструментов с помощью ИИ, упрощая создание потрясающих 3D окружений для любых целей.**
