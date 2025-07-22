# Scene Creation Guide / Руководство по созданию сцен

Comprehensive guide for creating and managing 3D scenes in Qryleth.

Подробное руководство по созданию и управлению 3D сценами в Qryleth.

---

## Overview / Обзор

Scene creation in Qryleth combines traditional 3D editing tools with AI assistance to provide an intuitive and powerful content creation experience.

Создание сцен в Qryleth сочетает традиционные инструменты 3D редактирования с помощью ИИ для обеспечения интуитивного и мощного опыта создания контента.

Scene management code resides in `src/features/scene` with `model` and `ui` segments following FSD.

Код управления сценой находится в `src/features/scene` с сегментами `model` и `ui` согласно FSD.

---

## Getting Started / Начало работы

### Creating a New Scene / Создание новой сцены

1. **Navigate to Scene Editor** / **Перейти в редактор сцен**
   ```
   /scene-editor (without UUID parameter)
   ```

2. **Initialize Empty Scene** / **Инициализировать пустую сцену**
   - Scene automatically initializes with default settings
   - Empty object list and default lighting
   - Grid visible for reference

3. **Set Scene Properties** / **Установить свойства сцены**
   ```typescript
   // Scene is automatically named "Untitled Scene"
   // Can be renamed when saving
   const sceneMetadata = {
     name: 'My New Scene',
     description: 'Scene description',
     tags: ['architecture', 'interior']
   }
   ```

### Loading Existing Scene / Загрузка существующей сцены

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

## Manual Scene Creation / Ручное создание сцены

### Adding Objects Manually / Ручное добавление объектов

#### Using the Object Library / Использование библиотеки объектов

1. **Open Object Library Panel** / **Открыть панель библиотеки объектов**
2. **Browse Available Objects** / **Просмотреть доступные объекты**
   - Local objects (created by user)
   - Public objects (shared community objects)
3. **Select and Place** / **Выбрать и разместить**
   ```typescript
   const addLibraryObjectToScene = (libraryObject: LibraryObject) => {
     const sceneObject = convertLibraryObjectToSceneObject(libraryObject)
     addObject(sceneObject)
     selectObject(sceneObject.uuid)
   }
   ```

#### Creating Primitive Objects / Создание примитивных объектов

```typescript
// Add basic primitives directly
const addPrimitive = (type: PrimitiveType) => {
  const primitive = createPrimitive(type, {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1]
  })
  
  const object = createObjectFromPrimitive(primitive)
  addObject(object)
}

// Available primitive types
type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'plane' | 'cone'
```

### Object Manipulation / Манипулирование объектами

#### Transform Controls / Элементы управления трансформацией

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
const createSceneLayer = (name: string, visible: boolean = true) => {
  const layer: SceneLayer = {
    uuid: generateUUID(),
    name,
    visible,
    objectIds: [],
    order: layers.length
  }
  
  createLayer(layer)
}

// Example usage
createSceneLayer('Background Objects', true)
createSceneLayer('Interactive Elements', true)
createSceneLayer('Lighting', false) // Initially hidden
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

### AI Tool Integration / Интеграция инструментов ИИ

#### Handling AI Responses / Обработка ответов ИИ

```typescript
const handleSceneGenerated = (sceneResponse: SceneResponse) => {
  // Save current state for undo
  pushToHistory()
  
  // Update scene with AI-generated content
  if (sceneResponse.objects) {
    sceneResponse.objects.forEach(object => {
      addObject(object)
    })
  }
  
  if (sceneResponse.lighting) {
    updateLighting(sceneResponse.lighting)
  }
  
  if (sceneResponse.layers) {
    sceneResponse.layers.forEach(layer => {
      createLayer(layer)
    })
  }
  
  // Notify user of completion
  showNotification('Scene generated successfully')
}

const handleObjectAdded = (object: SceneObject) => {
  // Add individual object from AI
  addObject(object)
  selectObject(object.uuid)
  pushToHistory()
}
```

#### Tool Call Processing / Обработка вызовов инструментов

```typescript
// Available AI tools for scene manipulation
const SCENE_TOOLS = [
  {
    name: 'add_object',
    description: 'Add a new object to the scene',
    parameters: {
      type: 'object',
      properties: {
        objectType: { type: 'string' },
        position: { type: 'array' },
        properties: { type: 'object' }
      }
    }
  },
  {
    name: 'modify_lighting',
    description: 'Modify scene lighting',
    parameters: {
      type: 'object',
      properties: {
        lightingType: { type: 'string' },
        intensity: { type: 'number' },
        color: { type: 'string' }
      }
    }
  },
  {
    name: 'create_layer',
    description: 'Create a new scene layer',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        visible: { type: 'boolean' }
      }
    }
  }
]
```

---

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

## Scene Optimization / Оптимизация сцены

### Performance Best Practices / Лучшие практики производительности

#### Object Instancing / Инстансирование объектов

```typescript
// Use instances for repeated objects
const createInstancedObjects = (baseObject: SceneObject, positions: Vector3[]) => {
  positions.forEach((position, index) => {
    const instance: SceneObjectInstance = {
      uuid: generateUUID(),
      objectUuid: baseObject.uuid,
      transform: {
        position,
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      },
      visible: true
    }
    addObjectInstance(instance)
  })
}

// Example: Create a row of trees
const treePositions: Vector3[] = [
  [-10, 0, 0], [-5, 0, 0], [0, 0, 0], [5, 0, 0], [10, 0, 0]
]
createInstancedObjects(treeObject, treePositions)
```

#### Level of Detail (LOD) / Уровень детализации

```typescript
// Configure LOD for complex objects
const configureLOD = (object: SceneObject) => {
  object.lodLevels = [
    { distance: 0, primitives: object.primitives }, // Full detail
    { distance: 50, primitives: simplifiedPrimitives }, // Medium detail
    { distance: 100, primitives: lowDetailPrimitives } // Low detail
  ]
}
```

#### Culling and Occlusion / Отсечение и окклюзия

```typescript
// Enable frustum culling
const optimizeRendering = () => {
  updateRenderSettings({
    frustumCulling: true,
    occlusionCulling: true,
    maxRenderDistance: 1000,
    shadowMapSize: 2048
  })
}
```

---

## Scene Validation / Валидация сцены

### Scene Health Checks / Проверки работоспособности сцены

```typescript
const validateScene = (): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check for empty scene
  if (objects.length === 0) {
    warnings.push('Scene contains no objects')
  }
  
  // Check for invalid objects
  objects.forEach(object => {
    if (!object.name || object.name.trim() === '') {
      errors.push(`Object ${object.uuid} has no name`)
    }
    
    if (object.primitives.length === 0) {
      errors.push(`Object ${object.name} contains no primitives`)
    }
  })
  
  // Check lighting
  if (!lighting.ambientLight && !lighting.directionalLight) {
    warnings.push('Scene has no lighting configured')
  }
  
  // Check performance
  const totalPrimitives = objects.reduce((count, obj) => 
    count + obj.primitives.length, 0)
  
  if (totalPrimitives > 10000) {
    warnings.push('Scene may have performance issues (>10k primitives)')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
```

### Automated Fixes / Автоматические исправления

```typescript
const autoFixScene = () => {
  // Add default lighting if none exists
  if (!lighting.ambientLight && !lighting.directionalLight) {
    updateLighting(defaultLighting)
  }
  
  // Name unnamed objects
  objects.forEach(object => {
    if (!object.name || object.name.trim() === '') {
      updateObject(object.uuid, {
        name: `Object ${object.uuid.slice(-8)}`
      })
    }
  })
  
  // Remove empty objects
  objects.forEach(object => {
    if (object.primitives.length === 0) {
      removeObject(object.uuid)
    }
  })
}
```

---

## Scene Export and Import / Экспорт и импорт сцены

### Export Formats / Форматы экспорта

```typescript
// Export scene as JSON
const exportSceneJSON = (): SceneExport => {
  return {
    metadata: {
      name: currentScene.name,
      version: '1.0',
      created: new Date().toISOString(),
      qrylethVersion: APP_VERSION
    },
    objects,
    objectInstances,
    layers,
    lighting,
    camera: getCurrentCameraState()
  }
}

// Export for external 3D software (GLTF preparation)
const prepareGLTFExport = () => {
  return {
    scene: convertToGLTFScene(),
    materials: extractMaterials(),
    geometries: extractGeometries(),
    animations: extractAnimations()
  }
}
```

### Import Validation / Валидация импорта

```typescript
const validateImportedScene = (sceneData: any): boolean => {
  // Check required fields
  if (!sceneData.objects || !Array.isArray(sceneData.objects)) {
    throw new Error('Invalid scene data: missing objects array')
  }
  
  // Validate object structure
  sceneData.objects.forEach((object: any, index: number) => {
    if (!object.uuid || !object.name || !object.primitives) {
      throw new Error(`Invalid object at index ${index}`)
    }
  })
  
  // Check version compatibility
  if (sceneData.metadata?.qrylethVersion) {
    const importVersion = sceneData.metadata.qrylethVersion
    if (!isVersionCompatible(importVersion, APP_VERSION)) {
      console.warn(`Scene created with version ${importVersion}, current version ${APP_VERSION}`)
    }
  }
  
  return true
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

## Examples and Templates / Примеры и шаблоны

### Scene Templates / Шаблоны сцен

```typescript
// Basic room template
const createRoomTemplate = (): SceneTemplate => ({
  name: 'Basic Room',
  description: 'Simple room with walls, floor, and basic lighting',
  objects: [
    createWallObject('North Wall', [0, 2, -5]),
    createWallObject('South Wall', [0, 2, 5]),
    createWallObject('East Wall', [5, 2, 0]),
    createWallObject('West Wall', [-5, 2, 0]),
    createFloorObject('Floor', [0, 0, 0])
  ],
  lighting: {
    ambientLight: { intensity: 0.3, color: '#ffffff' },
    directionalLight: {
      intensity: 0.8,
      direction: [-0.5, -1, -0.5],
      color: '#fff8e1'
    }
  }
})

// Product showcase template
const createProductShowcaseTemplate = (): SceneTemplate => ({
  name: 'Product Showcase',
  description: 'Professional product photography setup',
  objects: [
    createPedestalObject('Display Pedestal', [0, 0, 0]),
    createBackdropObject('White Backdrop', [0, 2, -2])
  ],
  lighting: setupProductLighting()
})
```

---

> 🎬 **Scene creation in Qryleth combines the power of traditional 3D tools with AI assistance, making it easy to create stunning 3D environments for any purpose.**
> 
> 🎬 **Создание сцен в Qryleth сочетает мощь традиционных 3D инструментов с помощью ИИ, упрощая создание потрясающих 3D окружений для любых целей.**
