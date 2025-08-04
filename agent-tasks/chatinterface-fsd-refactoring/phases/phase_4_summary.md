# Фаза 4: Создание ObjectEditor ChatInterface

**Статус**: ✅ **Выполнено**  
**Приоритет**: Высокий  
**Время выполнения**: 4 часа

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
export const addPrimitivesTool = {
  name: 'addPrimitives',
  description: 'Добавить один или несколько примитивов к объекту (массовая операция)',
  parameters: {
    type: 'object',
    properties: {
      primitives: {
        type: 'array',
        items: {
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
          },
          required: ['primitiveType']
        },
        minItems: 1,
        maxItems: 10 // Ограничение для безопасности
      }
    },
    required: ['primitives']
  }
}

export const modifyPrimitiveTool = {
  name: 'modifyPrimitive',
  description: 'Изменить существующий примитив',
  parameters: {
    // ... параметры для модификации
  }
}

// Примеры использования массового добавления:
// 1. Создание базовой структуры дома
// addPrimitives([
//   { primitiveType: 'box', position: {x: 0, y: 0, z: 0}, scale: {x: 10, y: 8, z: 10} }, // основание
//   { primitiveType: 'box', position: {x: 0, y: 8, z: 0}, scale: {x: 10, y: 0.5, z: 10} }, // крыша
//   { primitiveType: 'box', position: {x: 4, y: 2, z: 0}, scale: {x: 2, y: 4, z: 0.2} }  // дверь
// ])
//
// 2. Создание набора декоративных элементов
// addPrimitives([
//   { primitiveType: 'sphere', position: {x: 5, y: 1, z: 5} },
//   { primitiveType: 'sphere', position: {x: -5, y: 1, z: 5} },
//   { primitiveType: 'sphere', position: {x: 5, y: 1, z: -5} },
//   { primitiveType: 'sphere', position: {x: -5, y: 1, z: -5} }
// ])
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

**ОБНОВЛЕНО**: ObjectEditorLayout уже реализован с более гибкой архитектурой.

**Текущая реализация поддерживает:**
- Внешнее управление состоянием панелей через `externalPanelState` prop
- Передачу чат-компонента через `chatComponent` prop
- Модальный режим через `hideHeader` prop
- Автоматическое переключение на свойства при выборе материала
- Гибкую систему левых панелей (chat/properties) и правой панели (manager)

**Актуальная сигнатура ObjectEditorLayout:**
```typescript
interface ObjectEditorLayoutProps {
  onClose: () => void
  onSave: (object: GfxObject) => void
  objectData?: GfxObject
  children?: React.ReactNode
  headerControls?: React.ReactNode
  chatComponent?: React.ReactNode
  externalPanelState?: {
    panelState: any
    togglePanel: (panel: any) => void
    showPanel: (panel: any) => void
  }
  hideHeader?: boolean
}
```

**Задачи для интеграции ObjectChatInterface:**
- Создать ObjectChatInterface компонент
- Передать его через `chatComponent` prop в ObjectEditorLayout
- Настроить внешнее управление панелями для синхронизации состояния
- Обеспечить корректную работу автоматического переключения панелей
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

---

## ✅ Результаты выполнения

### Основные достижения

**1. Создана полнофункциональная система AI tools для ObjectEditor:**
- ✅ **Примитивы**: 4 инструмента (add, modify, remove, duplicate)
- ✅ **Материалы**: 5 инструментов (create, update, assign, remove, duplicate)  
- ✅ **Анализ**: 6 инструментов (analyze, optimize, validate, suggest, stats, variations)
- ✅ Всего 15 AI инструментов с детальными параметрами

**2. Реализован ObjectChatInterface компонент:**
- ✅ Поддержка обоих режимов: страница и модальное окно
- ✅ Адаптивный UI с компактным режимом для модали
- ✅ Интеграция с базовыми компонентами из shared/entities/chat
- ✅ Обработка результатов AI tools с специальным форматированием

**3. Созданы специализированные хуки:**
- ✅ `useObjectChat` - основная логика чата с интеграцией AI tools
- ✅ `useObjectContextPrompt` - генерация контекстных промптов на основе состояния объекта
- ✅ Обработка tool callbacks с прямым воздействием на objectStore

**4. Реализована интеграция с ObjectEditorLayout:**
- ✅ Встроена поддержка чата прямо в ObjectEditorR3F
- ✅ Автоматическое определение режима (page/modal)
- ✅ Корректная работа системы переключения панелей

### Созданные файлы

```
src/features/object-editor/
├── lib/ai/tools/
│   ├── primitiveTools.ts          ✅ 4 инструмента для примитивов
│   ├── materialTools.ts           ✅ 5 инструментов для материалов
│   ├── objectStructureTools.ts    ✅ 6 инструментов анализа
│   └── index.ts                   ✅ Экспорт и группировка tools
└── ui/ChatInterface/
    ├── ObjectChatInterface.tsx    ✅ Основной компонент чата
    ├── index.ts                   ✅ Экспорт интерфейсов
    ├── components/ObjectToolCallbacks/
    │   ├── ObjectToolCallbacks.tsx ✅ Отображение результатов AI tools
    │   └── index.ts               ✅ Экспорт компонентов
    └── hooks/
        ├── useObjectChat.ts       ✅ Основной хук чата
        ├── useObjectContextPrompt.ts ✅ Генерация промптов
        └── index.ts               ✅ Экспорт хуков
```

### Технические особенности реализации

**1. Контекстные промпты:**
- Адаптация к состоянию объекта (количество примитивов, материалов)
- Автоматические подсказки на основе текущего контекста
- Специальные сообщения для пустых объектов

**2. AI Tool Callbacks:**
- Прямая интеграция с objectStore через tool callbacks
- Обработка всех типов операций (примитивы, материалы, анализ)
- Возврат информативных результатов на русском языке

**3. UX оптимизации:**
- Компактный режим для модальных окон
- Адаптивная высота чата
- Приветственные сообщения с контекстом
- Кнопки управления (подсказки, очистка, закрытие)

**4. Архитектурные решения:**
- Встраивание чата в ObjectEditorR3F для переиспользования
- Использование внешнего управления панелями через externalPanelState
- Соблюдение принципов FSD с вынесением общей логики в shared

### Проверенная функциональность

**✅ Сборка проекта**: Код успешно компилируется без ошибок TypeScript  
**✅ Интеграция**: ObjectChatInterface корректно интегрирован в ObjectEditorLayout  
**✅ Архитектура**: Соблюдены принципы FSD, компоненты правильно структурированы  
**✅ AI Tools**: Все 15 инструментов имеют детальные параметры и обработчики  

### Готовность к использованию

ObjectEditor теперь имеет полнофункциональный AI помощник, который может:
- 🔧 Создавать и изменять примитивы массово и индивидуально
- 🎨 Управлять материалами с полным набором параметров
- 📊 Анализировать и оптимизировать структуру объектов
- 💡 Предлагать контекстные улучшения
- 🔄 Работать в обоих режимах (страница и модальное окно)

## Следующая фаза
Переходим к **Фазе 5: Финализация и тестирование**, где будет проведена полная очистка кода и финальное тестирование всей системы.

## Связанные файлы
- `src/shared/entities/chat/` - базовые компоненты
- `src/features/object-editor/ui/ObjectEditorLayout/` - layout из Фазы 2
- `src/features/object-editor/model/objectStore.ts` - стейт для интеграции
- `src/features/object-editor/ui/PanelToggleButtons/` - компоненты управления панелями