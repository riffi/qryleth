# Фаза 4: Создание ObjectEditor ChatInterface

**Статус**: ⏳ Планируется  
**Приоритет**: Высокий  
**Предполагаемое время**: 3-4 часа

## Цель фазы
Создание полнофункционального ChatInterface для ObjectEditor с интеграцией в созданный в Фазе 2 layout и реализацией специфичных для object-editor AI tools.

## Контекст
ObjectEditor требует chat функциональности для помощи в редактировании объектов. В отличие от SceneEditor, который работает с полными объектами и сценами, ObjectEditor фокусируется на отдельных примитивах, материалах и структуре объекта.

## Подзадачи

### 4.1 Создание ObjectChatInterface
**Время**: 1.5-2 часа

**Файлы для создания:**
```
src/features/object-editor/ui/ChatInterface/
├── ObjectChatInterface.tsx
├── index.ts
├── components/
│   └── ObjectToolCallbacks/
│       ├── ObjectToolCallbacks.tsx
│       └── index.ts
└── hooks/
    └── useObjectChat.ts
```

**ObjectChatInterface.tsx - основные требования:**

```typescript
interface ObjectChatInterfaceProps {
  isVisible: boolean
  onVisibilityChange?: (visible: boolean) => void
  currentObject?: ObjectInfo
  mode: 'page' | 'modal'
}
```

**Функциональность:**
- Использование базовых компонентов из `shared/entities/chat`
- Интеграция с object-editor специфичными AI tools
- Контекстная помощь на основе текущего редактируемого объекта
- Поддержка обоих режимов работы (страница/модаль)
- Компактный режим для модального окна

**useObjectChat.ts:**
```typescript
export const useObjectChat = (currentObject?: ObjectInfo) => {
  const { updateObject, addPrimitive, updateMaterial } = useObjectStore()
  
  // Конфигурация чата для object-editor
  const chatConfig: ChatConfig = {
    feature: 'object-editor',
    tools: objectEditorAITools,
    systemPrompt: generateObjectEditorPrompt(currentObject),
    debugMode: false, // Менее verbose чем scene
    maxMessages: 50 // Ограничение для производительности
  }
  
  // Object-editor специфичные callbacks
  const handlePrimitiveAdded = useCallback((primitiveData: any) => {
    addPrimitive(primitiveData)
  }, [addPrimitive])
  
  const handleMaterialUpdated = useCallback((materialData: any) => {
    updateMaterial(materialData)
  }, [updateMaterial])
  
  const handleObjectModified = useCallback((modifications: any) => {
    updateObject(modifications)
  }, [updateObject])
  
  const chatState = useChat(chatConfig)
  
  return {
    ...chatState,
    onPrimitiveAdded: handlePrimitiveAdded,
    onMaterialUpdated: handleMaterialUpdated,
    onObjectModified: handleObjectModified,
  }
}
```

### 4.2 Создание AI tools для ObjectEditor
**Время**: 1-1.5 часа

**Файлы для создания:**
```
src/features/object-editor/lib/ai/tools/
├── index.ts
├── primitiveTools.ts
├── materialTools.ts
└── objectStructureTools.ts
```

**primitiveTools.ts - инструменты для работы с примитивами:**
```typescript
export const addPrimitiveTool = {
  name: 'addPrimitive',
  description: 'Добавить новый примитив к объекту',
  parameters: {
    type: 'object',
    properties: {
      primitiveType: { 
        type: 'string',
        enum: ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane']
      },
      position: { type: 'object' }, // Vector3
      rotation: { type: 'object' }, // Vector3
      scale: { type: 'object' },    // Vector3
      material: { type: 'string' }  // UUID материала
    }
  }
}

export const modifyPrimitiveTool = {
  name: 'modifyPrimitive',
  description: 'Изменить существующий примитив',
  parameters: {
    // ... параметры для модификации
  }
}
```

**materialTools.ts - инструменты для работы с материалами:**
```typescript
export const createMaterialTool = {
  name: 'createMaterial',
  description: 'Создать новый материал для объекта',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      color: { type: 'string' },
      metalness: { type: 'number', minimum: 0, maximum: 1 },
      roughness: { type: 'number', minimum: 0, maximum: 1 },
      opacity: { type: 'number', minimum: 0, maximum: 1 }
    }
  }
}

export const assignMaterialTool = {
  name: 'assignMaterial',
  description: 'Назначить материал примитиву',
  parameters: {
    // ... параметры назначения
  }
}
```

**objectStructureTools.ts - инструменты для работы со структурой:**
```typescript
export const analyzeObjectTool = {
  name: 'analyzeObject',
  description: 'Проанализировать структуру объекта и предложить улучшения',
  parameters: {
    type: 'object',
    properties: {
      analysisType: {
        type: 'string',
        enum: ['structure', 'materials', 'performance', 'aesthetics']
      }
    }
  }
}

export const optimizeObjectTool = {
  name: 'optimizeObject', 
  description: 'Оптимизировать объект для лучшей производительности',
  parameters: {
    // ... параметры оптимизации
  }
}
```

### 4.3 Интеграция с ObjectEditorLayout
**Время**: 1 час

**Задачи интеграции:**
- Подключение ObjectChatInterface к созданному в Фазе 2 layout
- Реализация логики переключения панелей
- Обеспечение корректной работы в обоих режимах (страница/модаль)
- Синхронизация состояния чата с общим состоянием панелей

**Обновление ObjectEditorLayout.tsx:**
```typescript
const ObjectEditorLayout: React.FC<ObjectEditorLayoutProps> = ({ 
  mode, 
  children, 
  onClose 
}) => {
  const { panelState, setPanelState } = usePanelState()
  const currentObject = useObjectStore(state => state.currentObject)
  
  // Рендер левой панели на основе состояния
  const renderLeftPanel = () => {
    switch (panelState.leftPanel) {
      case 'chat':
        return (
          <ObjectChatInterface
            isVisible={true}
            currentObject={currentObject}
            mode={mode}
            onVisibilityChange={(visible) => {
              if (!visible) setPanelState(prev => ({ ...prev, leftPanel: null }))
            }}
          />
        )
      case 'properties':
        return panelState.propertiesType === 'primitive' 
          ? <PrimitiveControlPanel />
          : <MaterialControlPanel />
      default:
        return null
    }
  }
  
  return (
    <div className="object-editor-layout">
      <HeaderControls
        mode={mode}
        panelState={panelState}
        onPanelToggle={setPanelState}
        onClose={onClose}
      />
      
      <div className="object-editor-layout__main-content">
        <PanelContainer side="left" isVisible={!!panelState.leftPanel}>
          {renderLeftPanel()}
        </PanelContainer>
        
        <div className="viewport-container">
          {children}
        </div>
        
        <PanelContainer side="right" isVisible={panelState.rightPanel === 'manager'}>
          <ObjectManagementPanel />
        </PanelContainer>
      </div>
    </div>
  )
}
```

### 4.4 Создание контекстных промптов
**Время**: 30 минут

**Генерация системного промпта на основе текущего объекта:**
```typescript
const generateObjectEditorPrompt = (currentObject?: ObjectInfo): string => {
  const basePrompt = `
Ты помощник для редактирования 3D объектов. Ты можешь:
- Добавлять и изменять примитивы (box, sphere, cylinder, cone, torus, plane)
- Создавать и настраивать материалы
- Анализировать структуру объектов
- Предлагать оптимизации

Всегда отвечай на русском языке и будь конкретен в рекомендациях.
  `
  
  if (!currentObject) return basePrompt
  
  const contextPrompt = `
Текущий объект: "${currentObject.name}"
Количество примитивов: ${currentObject.instances?.length || 0}
${currentObject.instances?.length ? 
  `Примитивы: ${currentObject.instances.map(i => i.primitiveType).join(', ')}` : 
  'Объект пустой'
}

Предлагай изменения с учетом существующей структуры объекта.
  `
  
  return basePrompt + contextPrompt
}
```

## Критерии готовности

### Функциональные критерии
- [ ] ObjectChatInterface корректно отображается в обоих режимах
- [ ] AI tools для object-editor работают и изменяют объекты
- [ ] Интеграция с ObjectEditorLayout функционирует
- [ ] Переключение панелей работает согласно логике
- [ ] Контекстные промпты адаптируются к текущему объекту

### Технические критерии
- [ ] TypeScript компилируется без ошибок
- [ ] Нет memory leaks при переключении панелей
- [ ] Производительность: чат не замедляет редактор
- [ ] Корректная работа в модальном режиме
- [ ] Состояние чата сохраняется при переключениях

### Критерии качества
- [ ] UX интуитивен и не мешает основной работе
- [ ] AI tools дают полезные и точные результаты
- [ ] Код хорошо структурирован и документирован
- [ ] Соблюдаются принципы FSD архитектуры

## Технические детали реализации

### Обработка контекста объекта
```typescript
// Отслеживание изменений текущего объекта
useEffect(() => {
  if (currentObject) {
    // Обновление системного промпта
    updateChatConfig({
      systemPrompt: generateObjectEditorPrompt(currentObject)
    })
    
    // Добавление контекстного сообщения в чат
    addSystemMessage(`Переключились на редактирование объекта "${currentObject.name}"`)
  }
}, [currentObject])
```

### Оптимизация для модального режима
```typescript
const ObjectChatInterface: React.FC<ObjectChatInterfaceProps> = ({ mode, ...props }) => {
  // Компактный режим для модального окна
  const isCompact = mode === 'modal'
  
  return (
    <ChatContainer 
      className={classNames('object-chat', {
        'object-chat--compact': isCompact
      })}
      maxHeight={isCompact ? '300px' : '100%'}
      showTimestamps={!isCompact}
    >
      {/* ... остальной контент */}
    </ChatContainer>
  )
}
```

### Интеграция с существующими stores
```typescript
// Подписка на изменения в object store
const { 
  currentObject, 
  selectedPrimitive, 
  selectedMaterial,
  updateObject,
  addPrimitive 
} = useObjectStore()

// Автоматические уведомления о изменениях
useEffect(() => {
  if (selectedPrimitive) {
    addSystemMessage(`Выбран примитив: ${selectedPrimitive.type}`)
  }
}, [selectedPrimitive])
```

## Потенциальные проблемы и решения

**Проблема**: Производительность при частых обновлениях объекта  
**Решение**: Использовать debounce для обновления контекста, React.memo для оптимизации рендера

**Проблема**: Сложность AI tools для object-editor  
**Решение**: Начать с простых tools, постепенно добавлять сложность на основе пользовательского опыта

**Проблема**: Конфликт состояния панелей с существующей логикой  
**Решение**: Использовать middleware в zustand store для синхронизации состояний

**Проблема**: UX в модальном режиме  
**Решение**: Создать адаптивный дизайн с возможностью временного разворачивания чата

## Тестирование

### Ручное тестирование
1. Протестировать в режиме страницы и модального окна
2. Проверить все AI tools на различных объектах
3. Убедиться в корректности переключения панелей
4. Проверить контекстные промпты
5. Протестировать производительность на сложных объектах

### Автоматическое тестирование
- Unit тесты для useObjectChat хука
- Тесты для AI tools
- Integration тесты для взаимодействия с ObjectEditorLayout

## Следующая фаза
После завершения переходим к **Фазе 5: Финализация и тестирование**, где будет проведена полная очистка кода и финальное тестирование всей системы.

## Связанные файлы
- `src/shared/entities/chat/` - базовые компоненты
- `src/features/object-editor/ui/ObjectEditorLayout/` - layout из Фазы 2
- `src/features/object-editor/model/objectStore.ts` - стейт для интеграции
- `src/features/object-editor/ui/PanelToggleButtons/` - компоненты управления панелями