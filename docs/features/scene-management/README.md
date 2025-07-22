# Scene Management Overview / Обзор управления сценой

Documentation for the 3D scene editor and its component parts.

Документация для редактора 3D сцен и его составных частей.

---

## Architecture Overview / Обзор архитектуры

The Scene Editor is the core component that provides 3D scene creation and editing capabilities in Qryleth. It integrates AI chat interface, Three.js canvas, and object management tools into a cohesive editing experience.

Редактор сцен является основным компонентом, который обеспечивает возможности создания и редактирования 3D сцен в Qryleth. Он интегрирует интерфейс чата с ИИ, канвас Three.js и инструменты управления объектами в единый интерфейс редактирования.

---

## Core Components / Основные компоненты

### 🎬 SceneEditorR3F
**Location**: `src/pages/SceneEditor/SceneEditorR3F.tsx`

The main scene editor component that orchestrates all scene editing functionality.

Основной компонент редактора сцен, который координирует всю функциональность редактирования сцен.

**Key Responsibilities / Основные обязанности:**
- Integrates chat interface with AI agent / Интегрирует интерфейс чата с ИИ агентом
- Manages Three.js canvas and 3D rendering / Управляет канвасом Three.js и 3D рендерингом  
- Coordinates object management panel / Координирует панель управления объектами
- Handles scene loading and saving / Обрабатывает загрузку и сохранение сцен
- Provides undo/redo functionality / Предоставляет функциональность отмены/повтора

### 🎨 Scene3D
**Location**: `src/features/scene/ui/Scene3D.tsx`

Three.js canvas component responsible for 3D rendering and visualization.

Компонент канваса Three.js, ответственный за 3D рендеринг и визуализацию.

**Features / Функции:**
- Renders scene objects and instances / Рендерит объекты сцены и их инстансы
- Handles camera controls and lighting / Обрабатывает управление камерой и освещением
- Provides object selection and interaction / Обеспечивает выбор объектов и взаимодействие
- Supports multiple view modes / Поддерживает множественные режимы просмотра

### 🗂️ ObjectManager
**Location**: `src/features/scene/ui/ObjectManager.tsx`

Panel for managing scene layers, objects, and lighting settings.

Панель для управления слоями сцены, объектами и настройками освещения.

**Capabilities / Возможности:**
- Layer creation and management / Создание и управление слоями
- Object hierarchy visualization / Визуализация иерархии объектов
- Lighting configuration / Конфигурация освещения
- Object editing access / Доступ к редактированию объектов

### 💬 ChatInterface
**Location**: `src/features/ai-assistant/ui/ChatInterface.tsx`

AI agent communication widget for natural language scene manipulation.

Виджет общения с ИИ агентом для манипулирования сценой на естественном языке.

**Functions / Функции:**
- Natural language command processing / Обработка команд на естественном языке
- Scene generation from descriptions / Генерация сцен из описаний
- Object creation and modification / Создание и модификация объектов
- Tool calls integration / Интеграция вызовов инструментов

---

## Functional Flow / Функциональный поток

### Scene Initialization / Инициализация сцены

```typescript
// On page load / При загрузке страницы
useEffect(() => {
  if (sceneUuid) {
    // Load existing scene from IndexedDB / Загрузить существующую сцену из IndexedDB
    loadSceneFromDB(sceneUuid)
  } else {
    // Initialize new scene / Инициализировать новую сцену
    clearSceneState()
  }
}, [sceneUuid])
```

### AI Integration Flow / Поток интеграции ИИ

1. **User Input** → Chat message sent to AI agent
2. **AI Processing** → Natural language interpreted and tool calls generated
3. **Tool Execution** → Scene modifications applied through handlers
4. **State Update** → Scene store updated with new data
5. **UI Refresh** → 3D canvas and panels reflect changes

**Russian:**
1. **Пользовательский ввод** → Сообщение чата отправлено ИИ агенту
2. **Обработка ИИ** → Естественный язык интерпретирован и сгенерированы вызовы инструментов
3. **Выполнение инструментов** → Модификации сцены применены через обработчики
4. **Обновление состояния** → Хранилище сцены обновлено новыми данными
5. **Обновление UI** → 3D канвас и панели отражают изменения

### Event Handlers / Обработчики событий

#### `handleSceneGenerated(sceneResponse: SceneResponse)`
Processes complete scene generation from AI agent.

Обрабатывает полную генерацию сцены от ИИ агента.

```typescript
const handleSceneGenerated = (sceneResponse: SceneResponse) => {
  // Update scene store with generated content
  updateSceneFromResponse(sceneResponse)
  
  // Save to history for undo functionality
  pushToHistory()
}
```

#### `handleObjectAdded(object: SceneObject)`
Handles individual object addition from AI or user interaction.

Обрабатывает добавление отдельных объектов от ИИ или пользовательского взаимодействия.

```typescript
const handleObjectAdded = (object: SceneObject) => {
  // Add object to scene
  addObject(object)
  
  // Update selection
  selectObject(object.uuid)
  
  // Save state for undo
  pushToHistory()
}
```

---

## Data Types Integration / Интеграция типов данных

The Scene Editor operates with types from the [Type System](../../api/types/README.md):

Редактор сцен работает с типами из [Системы типов](../../api/types/README.md):

### Core Scene Types / Основные типы сцены

```typescript
// Scene content types / Типы содержимого сцены
import type { 
  SceneObject,          // Object definitions / Определения объектов
  SceneObjectInstance,  // Object instances with transforms / Инстансы объектов с трансформациями
  SceneResponse,        // AI-generated scene data / Данные сцены, сгенерированные ИИ
  LightingSettings     // Scene lighting configuration / Конфигурация освещения сцены
} from '@/entities'

// Scene state types / Типы состояния сцены  
import type {
  SceneStatus,         // Scene loading/saving status / Статус загрузки/сохранения сцены
  CurrentScene         // Current scene metadata / Метаданные текущей сцены
} from '@/features/scene/model'
```

### UI Control Types / Типы управления UI

```typescript
// View and interaction types / Типы вида и взаимодействия
import type {
  ViewMode,            // Camera control mode / Режим управления камерой
  RenderMode,          // Rendering style / Стиль рендеринга
  TransformMode,       // Active transformation tool / Активный инструмент трансформации
  SelectedObject,      // Currently selected object / Текущий выбранный объект
  HoveredObject        // Object under cursor / Объект под курсором
} from '@/shared/types/ui'
```

---

## Store Integration / Интеграция хранилища

Scene Editor data comes from `sceneStore` (see [Store Documentation](../../api/stores/README.md)):

Данные редактора сцен поступают из `sceneStore` (см. [Документацию хранилища](../../api/stores/README.md)):

### Scene Content Data / Данные содержимого сцены

```typescript
const {
  objects,           // All scene objects / Все объекты сцены
  objectInstances,   // Object instances / Инстансы объектов
  layers,           // Scene layers / Слои сцены
  lighting          // Lighting settings / Настройки освещения
} = useSceneStore()
```

### View Control State / Состояние управления видом

```typescript
const {
  viewMode,         // Camera control mode / Режим управления камерой
  renderMode,       // Rendering mode / Режим рендеринга
  transformMode,    // Transform tool / Инструмент трансформации
  gridVisible       // Grid visibility / Видимость сетки
} = useSceneStore()
```

### Selection State / Состояние выбора

```typescript
const {
  selectedObject,   // Selected object info / Информация о выбранном объекте
  hoveredObject     // Hovered object info / Информация об объекте под курсором
} = useSceneStore()
```

### Scene Metadata / Метаданные сцены

```typescript
const {
  currentScene      // Scene name, status, uuid / Имя сцены, статус, uuid
} = useSceneStore()
```

### History Management / Управление историей

```typescript
const {
  history,          // State history for undo/redo / История состояний для отмены/повтора
  historyIndex,     // Current position in history / Текущая позиция в истории
  undo,            // Undo last action / Отменить последнее действие
  redo             // Redo next action / Повторить следующее действие
} = useSceneStore()
```

---

## Nested Components / Вложенные компоненты

### 🎯 Component Hierarchy / Иерархия компонентов

```
SceneEditorR3F
├── ChatInterface                    # AI agent communication
│   ├── MessageList                 # Chat history
│   ├── MessageInput                # User input
│   └── ToolCallHandler             # AI tool execution
├── Scene3D                         # Three.js canvas
│   ├── SceneContent                # 3D scene rendering
│   ├── CameraControls              # Camera manipulation
│   ├── ObjectRenderer              # Object visualization
│   └── PostProcessing              # Visual effects
├── ObjectManager                   # Scene management panel
│   ├── LayerPanel                  # Layer management
│   ├── ObjectTree                  # Object hierarchy
│   ├── LightingPanel              # Lighting controls
│   └── ObjectEditorLauncher        # Edit object access
├── Toolbar                         # Top toolbar
│   ├── ViewModeSelector            # Camera mode controls
│   ├── RenderModeSelector          # Render style controls
│   ├── TransformModeSelector       # Transform tool controls
│   └── HistoryControls             # Undo/redo buttons
└── Modals                          # Dialog windows
    ├── OpenAISettingsModal         # LLM configuration
    ├── SaveSceneModal              # Scene saving dialog
    └── ObjectEditorR3F             # Object editing modal
```

### 🔧 Component Details / Детали компонентов

#### **ChatInterface**
- Returns complete scenes via `onSceneGenerated` / Возвращает полные сцены через `onSceneGenerated`
- Returns individual objects via `onObjectAdded` / Возвращает отдельные объекты через `onObjectAdded`
- Integrates with AI tool calling system / Интегрируется с системой вызова инструментов ИИ

#### **Scene3D**
- Renders `SceneContent` with lighting, controls, and objects / Рендерит `SceneContent` с освещением, управлением и объектами
- Includes camera controls and post-processing / Включает управление камерой и пост-обработку
- Handles object interaction and selection / Обрабатывает взаимодействие с объектами и их выбор

#### **ObjectManager**
- Provides layer creation and management / Обеспечивает создание и управление слоями
- Shows object hierarchy and properties / Показывает иерархию объектов и их свойства
- Opens `ObjectEditorR3F` for detailed editing / Открывает `ObjectEditorR3F` для детального редактирования

#### **OpenAISettingsModal**
- Configures LLM connection settings / Настраивает параметры подключения к LLM
- Manages API keys and model parameters / Управляет API ключами и параметрами модели

#### **ObjectEditorR3F**
- Modal editor for selected objects / Модальный редактор для выбранных объектов
- Edits primitives and saves changes to store / Редактирует примитивы и сохраняет изменения в хранилище
- Integrated with object editing workflow / Интегрирован с рабочим процессом редактирования объектов

#### **SaveSceneModal**
- Local modal for scene saving / Локальный модал для сохранения сцены
- Captures name and description input / Захватывает ввод имени и описания
- Saves scene to library via `db.saveScene`/`db.updateScene` / Сохраняет сцену в библиотеку через `db.saveScene`/`db.updateScene`

---

## User Workflows / Пользовательские процессы

### Creating a New Scene / Создание новой сцены

1. **Navigate to Scene Editor** without UUID parameter
2. **Initialize empty scene** with default settings
3. **Add objects** via AI chat or manual tools
4. **Configure lighting** and camera settings
5. **Organize objects** into layers
6. **Save scene** to library for future use

### Editing Existing Scene / Редактирование существующей сцены

1. **Load scene** from library or direct UUID link
2. **Modify objects** using AI commands or manual tools
3. **Adjust lighting** and visual settings
4. **Use undo/redo** to manage changes
5. **Save updates** to preserve modifications

### AI-Assisted Scene Creation / Создание сцены с помощью ИИ

1. **Describe scene** in natural language
2. **AI generates objects** and scene structure
3. **Refine with additional commands** ("add more lighting", "move objects")
4. **Manual fine-tuning** using visual tools
5. **Export or save** final scene

---

## Performance Considerations / Соображения производительности

### Optimization Strategies / Стратегии оптимизации

1. **Selective Rendering** - Only render visible objects / Рендерить только видимые объекты
2. **State Management** - Use optimized store selectors / Использовать оптимизированные селекторы хранилища
3. **Memory Management** - Clean up Three.js resources / Очищать ресурсы Three.js
4. **Debounced Operations** - Throttle frequent updates / Ограничивать частые обновления

### Best Practices / Лучшие практики

```typescript
// ✅ Good: Selective store subscription
const objects = useSceneStore(state => state.objects)
const selectedObject = useSceneStore(state => state.selectedObject)

// ❌ Bad: Full store subscription
const sceneStore = useSceneStore()

// ✅ Good: Debounced auto-save
const debouncedSave = useMemo(
  () => debounce(saveScene, 2000),
  []
)

// ✅ Good: Three.js resource cleanup
useEffect(() => {
  return () => {
    // Cleanup geometries, materials, textures
    cleanupThreeJSResources()
  }
}, [])
```

---

## Related Documentation / Связанная документация

- [Scene Store API](../../api/stores/scene-store.md) - Scene state management
- [Object Editing](../object-editing/README.md) - Object editor features
- [AI Integration](../ai-integration/README.md) - AI assistant capabilities
- [Type System](../../api/types/README.md) - Scene-related types
- [Component Patterns](../../architecture/patterns/component-patterns.md) - React patterns

---

## Extension Points / Точки расширения

The Scene Editor is designed for extensibility:

Редактор сцен спроектирован для расширяемости:

### Adding New Tools / Добавление новых инструментов

```typescript
// Extend transform modes
type ExtendedTransformMode = TransformMode | 'custom-tool'

// Add new toolbar button
const CustomToolButton = () => {
  const { setTransformMode } = useSceneStore()
  
  return (
    <button onClick={() => setTransformMode('custom-tool')}>
      Custom Tool
    </button>
  )
}
```

### Adding New Object Types / Добавление новых типов объектов

```typescript
// Extend primitive types
interface CustomPrimitive extends GfxPrimitive {
  type: 'custom-shape'
  customProperties: CustomProps
}

// Register in object factory
const createCustomObject = (props: CustomProps): CustomPrimitive => ({
  type: 'custom-shape',
  customProperties: props,
  // ... standard primitive properties
})
```

### Adding New AI Tools / Добавление новых инструментов ИИ

```typescript
// Extend available tools for AI
const EXTENDED_TOOLS = [
  ...AVAILABLE_TOOLS,
  {
    name: 'custom_scene_operation',
    description: 'Performs custom scene operation',
    parameters: {
      // Parameter schema
    }
  }
]
```

---

> 🎬 **The Scene Editor is the heart of Qryleth, providing powerful 3D scene creation capabilities with AI assistance and intuitive visual tools.**
> 
> 🎬 **Редактор сцен - это сердце Qryleth, предоставляющий мощные возможности создания 3D сцен с помощью ИИ и интуитивно понятных визуальных инструментов.**