# Обзор управления сценой


Документация для редактора 3D сцен и его составных частей.


## Обзор архитектуры

Редактор сцен является основным компонентом, который обеспечивает возможности создания и редактирования 3D сцен в Qryleth. Он интегрирует интерфейс чата с ИИ, канвас Three.js и инструменты управления объектами в единый интерфейс редактирования.


## Структура папок

```text
src/features/editor/scene/
├─ model/     # state / бизнес-логика
├─ ui/        # UI-компоненты (R3F, менеджер, чат, скриптинг)
├─ lib/       # headless-хуки, SceneAPI, terrain, ai-tools
├─ layout/    # логика раскладки панелей
├─ toolbar/   # тулбары редактора сцены
├─ config/    # конфигурация террейна и прочее
├─ constants.ts
└─ index.ts   # публичный API editor/scene
```

See [Feature-Sliced Design](../../architecture/feature-sliced-design.md) for details.

## Основные компоненты

### 🎬 SceneEditorR3F
**Location**: `src/features/editor/scene/ui/SceneEditorR3F.tsx`

Основной компонент редактора сцен, который координирует всю функциональность редактирования сцен.

**Основные обязанности:**
- Интегрирует интерфейс чата с ИИ агентом
- Управляет канвасом Three.js и 3D рендерингом  
- Координирует панель управления объектами
- Обрабатывает загрузку и сохранение сцен
- Предоставляет функциональность отмены/повтора

### 🎨 Scene3D
**Location**: `src/features/editor/scene/ui/renderer/Scene3D.tsx`

Компонент канваса Three.js, ответственный за 3D рендеринг и визуализацию.

**Функции:**
- Рендерит объекты сцены и их инстансы
- Обрабатывает управление камерой и освещением
- Обеспечивает выбор объектов и взаимодействие
- Поддерживает множественные режимы просмотра

### 🗂️ SceneObjectManager
**Location**: `src/features/editor/scene/ui/objectManager/SceneObjectManager.tsx`

Панель для управления слоями сцены, объектами и настройками освещения. Построена по паттерну compound-components и использует контекст `SceneObjectManagerContext` для обмена данными между вложенными элементами.

**Возможности:**
- Создание и управление слоями
- Визуализация иерархии объектов
- Конфигурация освещения
- Доступ к редактированию объектов

### 💬 SceneChatInterface  
**Location**: `src/features/editor/scene/ui/ChatInterface/SceneChatInterface.tsx`

Специализированный чат для работы со сценами с интеграцией AI агента (после рефакторинга FSD).

**Функции:**
- Обработка команд на естественном языке
- Генерация сцен из описаний
- Создание и модификация объектов  
- Интеграция вызовов инструментов
- Debug-панель с JSON выводом для разработчиков
- Автоматическая регистрация scene-специфичных AI tools

**Особенности реализации:**
- Использует shared компоненты из `shared/entities/chat`
- Scene-специфичная логика изолирована в feature
- Поддержка полноэкранного режима
- Debug режим для анализа AI responses
### 📜 ScriptingPanel
**Location**: `src/features/scene/ui/ScriptingPanel/ScriptingPanel.tsx`

Панель для написания и выполнения пользовательских скриптов.

**Возможности:**
- Редактирование кода с подсветкой и автодополнением
- Сохранение и загрузка скриптов
- Выполнение скрипта в редакторе сцены
- Поддержка JavaScript и TypeScript
---



## Функциональный поток

### Инициализация сцены

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

### Поток интеграции ИИ

1. **Пользовательский ввод** → Сообщение чата отправлено ИИ агенту
2. **Обработка ИИ** → Естественный язык интерпретирован и сгенерированы вызовы инструментов
3. **Выполнение инструментов** → Модификации сцены применены через обработчики
4. **Обновление состояния** → Хранилище сцены обновлено новыми данными
5. **Обновление UI** → 3D канвас и панели отражают изменения

### Обработчики событий

#### `handleSceneGenerated(sceneResponse: SceneResponse)`

Обрабатывает полную генерацию сцены от ИИ агента.(Пока не реализовано)

```typescript
const handleSceneGenerated = (sceneResponse: SceneResponse) => {
  // Update scene store with generated content
  updateSceneFromResponse(sceneResponse)
  
  // Save to history for undo functionality
  pushToHistory()
}
```

#### `handleObjectAdded(object: SceneObject)`

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


## Интеграция типов данных

Редактор сцен работает с типами из [Системы типов](../../api/types/README.md):

### Основные типы сцены

```typescript
// Scene content types / Типы содержимого сцены
import type { 
  SceneObject,          // Определения объектов
  SceneObjectInstance,  // Инстансы объектов с трансформациями
  SceneData,        // Данные сцены, сгенерированные ИИ
  SceneLayer,        // Определения слоёв
  LightingSettings     // Конфигурация освещения сцены
} from '@/entities'

// Scene state types / Типы состояния сцены  
import type {
  SceneStatus,         // Статус загрузки/сохранения сцены
  SceneMetadata        // Метаданные текущей сцены
} from '@/features/scene/model'
```

### Типы управления UI

```typescript
// Типы вида и взаимодействия
import type {
  ViewMode,            // Режим управления камерой
  RenderMode,          // RСтиль рендеринга
  TransformMode,       // Активный инструмент трансформации
  SelectedObject,      // Текущий выбранный объект
  HoveredObject        // Объект под курсором
} from '@/shared/types/ui'
```


## Интеграция хранилища

Данные редактора сцен поступают из `sceneStore` (см. [Документацию хранилища](../../api/stores/README.md)):

### Данные содержимого сцены

```typescript
const {
  objects,           // All scene objects / Все объекты сцены
  objectInstances,   // Object instances / Инстансы объектов
  layers,           // Scene layers / Слои сцены
  lighting          // Lighting settings / Настройки освещения
} = useSceneStore()
```

### Состояние управления видом

```typescript
const {
  viewMode,         // Режим управления камерой
  renderMode,       // Режим рендеринга
  transformMode,    // Инструмент трансформации
  gridVisible       // Видимость сетки
} = useSceneStore()
```

### Состояние выбора

```typescript
const {
  selectedObject,   // Информация о выбранном объекте
  hoveredObject     // Информация об объекте под курсором
} = useSceneStore()
```

### Метаданные сцены

```typescript
const {
  sceneMetaData      // Scene name, status, uuid / Имя сцены, статус, uuid
} = useSceneStore()
```

### Управление историей изменений

```typescript
const {
  history,          // История состояний для отмены/повтора
  historyIndex,     // Текущая позиция в истории
  undo,            // Отменить последнее действие
  redo             // Повторить следующее действие
} = useSceneStore()
```


## 🎯 Иерархия компонентов

```
SceneEditorR3F
├── SceneChatInterface              # AI agent communication (FSD)
│   ├── ChatContainer               # Chat history (shared)
│   ├── ChatInput                   # User input (shared)
│   ├── SceneDebugPanel             # JSON debug output
│   └── SceneToolCallbacks          # Scene AI tool execution
├── Scene3D                         # Three.js canvas
│   ├── SceneContent                # 3D scene rendering
│   ├── CameraControls              # Camera manipulation
│   ├── ObjectRenderer              # Object visualization
│   └── PostProcessing              # Visual effects
├── SceneObjectManager              # Scene management panel
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
    └── ObjectEditor             # Object editing component
```

### 🔧 Детали компонентов

#### **SceneChatInterface**
- Возвращает полные сцены через `onSceneGenerated`
- Возвращает отдельные объекты через `onObjectAdded`
- Интегрируется с системой вызова инструментов ИИ
- Использует shared chat компоненты для базовой функциональности
- Debug-панель для анализа AI responses и tool calls

#### **Scene3D**
- Рендерит `SceneContent` с освещением, управлением и объектами
- Включает управление камерой и пост-обработку
- Обрабатывает взаимодействие с объектами и их выбор

#### **SceneObjectManager**
- Обеспечивает создание и управление слоями
- Показывает иерархию объектов и их свойства
- Открывает `ObjectEditor` для детального редактирования объекта

#### **OpenAISettingsModal**
- Настраивает параметры подключения к LLM
- Управляет API ключами и параметрами модели

#### **ObjectEditor (widget)**
- Встроенный редактор объектов в режиме `embedded` внутри `SceneEditor`.
- Синхронизирован с глобальным состоянием панелей (чат/свойства/менеджер).
- Под капотом использует `ObjectEditorR3F` и `ObjectEditorLayout`.

#### **SaveSceneModal**
- Локальный модал для сохранения сцены
- Захватывает ввод имени и описания
- Сохраняет сцену в библиотеку через `db.saveScene`/`db.updateScene`


## Пользовательские процессы

### Создание новой сцены

1. **Navigate to Scene Editor** without UUID parameter
2. **Initialize empty scene** with default settings
3. **Add objects** via AI chat or manual tools
4. **Configure lighting** and camera settings
5. **Organize objects** into layers
6. **Save scene** to library for future use

### Редактирование существующей сцены

1. **Load scene** from library or direct UUID link
2. **Modify objects** using AI commands or manual tools
3. **Adjust lighting** and visual settings
4. **Use undo/redo** to manage changes
5. **Save updates** to preserve modifications

### Создание сцены с помощью ИИ(не реализовано)

1. **Describe scene** in natural language
2. **AI generates objects** and scene structure
3. **Refine with additional commands** ("add more lighting", "move objects")
4. **Manual fine-tuning** using visual tools
5. **Export or save** final scene


## Соображения производительности

### Стратегии оптимизации

1. **Selective Rendering** - Рендерить только видимые объекты
2. **State Management** - Использовать оптимизированные селекторы хранилища
3. **Memory Management** - Очищать ресурсы Three.js
4. **Debounced Operations** - Ограничивать частые обновления
5. **Instanced Rendering** - Автоматическое использование InstancedMesh для повышения производительности

#### Система Instanced Mesh

**Автоматическое переключение на оптимизацию**

Система автоматически оптимизирует рендеринг, когда обнаруживает 3 или более экземпляров одинакового типа объекта на сцене:

```typescript
// Оптимизация активируется автоматически
const instances = [
  { uuid: "obj1", objectUuid: "cube", position: [0, 0, 0] },
  { uuid: "obj2", objectUuid: "cube", position: [2, 0, 0] },
  { uuid: "obj3", objectUuid: "cube", position: [4, 0, 0] }  // >= 3 экземпляров
]
// → Автоматически переключается на InstancedMesh
```

**Ключевые компоненты оптимизации:**
- `InstancedObjects` - основной компонент управления оптимизацией
- `CompositeInstancedGroup` - для объектов с несколькими примитивами
- `PrimitiveInstancedGroup` - для отдельных примитивов
- `PrimitiveMaterial` - рендеринг материалов в инстансах
- `useInstanceOptimization` - хук для проверки необходимости оптимизации

**Поддерживаемые возможности:**
- ✅ Составные объекты с несколькими примитивами
- ✅ Материалы на уровне примитива и объекта
- ✅ Выбор и трансформация отдельных экземпляров
- ✅ Интеграция с TransformControls (gizmo)
- ✅ Обработка событий на уровне инстансов
- ✅ Интеграция с системой слоев и видимости
 - ✅ Realtime-трансформации для InstancedMesh: визуальный отклик во время перетаскивания gizmo без записи в глобальный store (фиксация по завершении)

**Ограничения:**
- Минимальное количество экземпляров для оптимизации: 3
- Максимальное количество экземпляров: 1000
- TransformControls работает через helper object
- Требуется совместимость с существующей структурой данных

**Детали реализации трансформаций:**
- Во время перетаскивания `TransformControls` применяется локальное переопределение трансформации для выбранного инстанса (контекст `InstancedTransformProvider`).
- Рендер инстансов читает эти временные значения и показывает изменения в реальном времени.
- После отпускания мыши итоговая трансформация записывается в Zustand store, а временное переопределение очищается.
- Композиция трансформаций скорректирована для верного центра вращения: примитивы инстанса вращаются вокруг центра инстанса.

### Лучшие практики

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


## Связанная документация

- [Scene Store API](../../api/stores/scene-store.md) - Scene state management
- [Object Editing](../object-editing/README.md) - Object editor features  
- [AI Integration](../ai-integration/llm-integration.md) - AI assistant capabilities и SceneChatInterface
- [Chat Components](../../api/components/chat-components.md) - Документация по chat компонентам
- [Feature-Sliced Design](../../architecture/feature-sliced-design.md) - Архитектурные принципы FSD
- [Type System](../../api/types/README.md) - Scene-related types
- [Component Patterns](../../architecture/patterns/component-patterns.md) - React patterns
- [Keyboard Shortcuts](keyboard-shortcuts.md) - Клавиатурное управление сценой


## Точки расширения

Редактор сцен спроектирован для расширяемости:

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

 
> 🎬 **Редактор сцен - это сердце Qryleth, предоставляющий мощные возможности создания 3D сцен с помощью ИИ и интуитивно понятных визуальных инструментов.**
