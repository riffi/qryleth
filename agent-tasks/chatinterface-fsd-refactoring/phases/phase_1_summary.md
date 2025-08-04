# Фаза 1: Создание базовой инфраструктуры

**Статус**: ✅ Выполнено  
**Приоритет**: Высокий  
**Фактическое время**: ~2 часа

## Цель фазы
Создание общих компонентов и типов для chat-функциональности, а также базовых компонентов для управления панелями ObjectEditor.

## Подзадачи

### 1.1 Создание shared/entities/chat структуры
**Время**: 2-3 часа

**Файлы для создания:**
```
src/shared/entities/chat/
├── types/
│   ├── ChatMessage.ts
│   └── ChatConfig.ts
├── ui/
│   ├── ChatMessageItem/
│   │   ├── ChatMessageItem.tsx
│   │   └── index.ts
│   ├── ChatInput/
│   │   ├── ChatInput.tsx
│   │   └── index.ts
│   └── ChatContainer/
│       ├── ChatContainer.tsx
│       └── index.ts
├── lib/
│   ├── hooks/
│   │   ├── useChat.ts
│   │   └── useChatScroll.ts
│   └── utils/
│       └── chatUtils.ts
└── index.ts
```

**Технические требования:**

**ChatMessage.ts:**
```typescript
export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  toolCalls?: ToolCall[]
  metadata?: Record<string, any>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
  result?: any
}
```

**ChatConfig.ts:**
```typescript
export interface ChatConfig {
  feature: 'scene' | 'object-editor'
  tools: ToolDefinition[]
  systemPrompt: string
  debugMode?: boolean
  maxMessages?: number
  autoScroll?: boolean
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, any>
}
```

**useChat.ts - основная логика:**
- Управление массивом сообщений
- Отправка сообщений к LangChain сервису
- Обработка tool calls
- Управление состоянием загрузки

**useChatScroll.ts - автоскролл:**
- Автоматический скролл к новым сообщениям
- Определение необходимости скролла
- Плавная анимация скролла

### 1.2 Создание PanelToggleButtons для ObjectEditor
**Время**: 1-2 часа

**Файлы для создания:**
```
src/features/object-editor/ui/PanelToggleButtons/
├── PanelToggleButtons.tsx
├── types.ts
├── index.ts
└── hooks/
    └── usePanelState.ts
```

**types.ts:**
```typescript
export interface PanelState {
  leftPanel: 'chat' | 'properties' | null
  rightPanel: 'manager' | null
  chatVisible: boolean
  propertiesVisible: boolean
  managerVisible: boolean
}

export type PanelType = 'chat' | 'properties' | 'manager'

export interface PanelToggleProps {
  activePanel: PanelType | null
  onToggle: (panel: PanelType) => void
  disabled?: boolean
}
```

**PanelToggleButtons.tsx - основные требования:**
- 3 кнопки: чат, свойства, менеджер
- Визуальная индикация активного состояния
- Иконки для каждого типа панели
- Поддержка disabled состояния
- Tooltip с описанием функциональности

**usePanelState.ts:**
- Zustand store или React context для состояния панелей
- Логика взаимоисключающих панелей (чат vs свойства)
- Сохранение предпочтений пользователя в localStorage
- Методы для программного управления панелями

### 1.3 Интеграция с существующим кодом
**Время**: 1 час

**Задачи:**
- Добавить экспорты в `src/shared/entities/index.ts`
- Добавить экспорты в `src/features/object-editor/index.ts`
- Создать базовые CSS стили для новых компонентов
- Подготовить типы для TypeScript

## Критерии готовности

### Функциональные критерии
- [ ] Все базовые UI компоненты чата созданы и экспортируются
- [ ] Хуки useChat и useChatScroll работают изолированно
- [ ] PanelToggleButtons отображается корректно
- [ ] usePanelState управляет состоянием панелей
- [ ] Типы корректно определены и экспортируются

### Технические критерии  
- [ ] TypeScript компилируется без ошибок
- [ ] Все компоненты имеют корректные PropTypes/типы
- [ ] CSS стили не конфликтуют с существующими
- [ ] Нет console.error или предупреждений
- [ ] Код соответствует существующим конвенциям проекта

### Критерии качества
- [ ] Компоненты переиспользуемы и не зависят от конкретных фич
- [ ] Код хорошо документирован (JSDoc комментарии)
- [ ] Используются существующие UI паттерны проекта
- [ ] Производительность: нет ненужных ре-рендеров

## Потенциальные проблемы и решения

**Проблема**: Конфликт стилей с существующими компонентами  
**Решение**: Использовать CSS modules или styled-components, следовать BEM методологии

**Проблема**: Сложность интеграции с существующим LangChain сервисом  
**Решение**: Создать абстракцию в виде хука, не изменяя существующий сервис

**Проблема**: Производительность при частых обновлениях состояния панелей  
**Решение**: Использовать React.memo и useMemo для оптимизации

## Следующая фаза
После завершения этой фазы переходим к **Фазе 2: Рефакторинг ObjectEditor layout**, где будет создан ObjectEditorLayout компонент, использующий созданные в этой фазе PanelToggleButtons.

## Выполненные задачи

### ✅ Создана структура shared/entities/chat
- **ChatMessage.ts** - расширенный тип сообщения с id и toolCalls
- **ChatConfig.ts** - конфигурация чата для разных фич
- **ChatContainer** - компонент контейнера для сообщений
- **ChatMessageItem** - компонент отдельного сообщения  
- **ChatInput** - компонент ввода сообщений
- **useChat** - основной хук для управления чатом
- **useChatScroll** - хук для автоскролла
- **chatUtils** - утилиты для работы с сообщениями

### ✅ Создана система управления панелями ObjectEditor
- **PanelToggleButtons** - компонент кнопок переключения панелей
- **usePanelState** - хук для управления состоянием панелей
- **types.ts** - типы для состояния панелей (PanelState, PanelType)
- Реализована логика взаимоисключающих левых панелей
- Добавлено сохранение состояния в localStorage

### ✅ Настроены экспорты
- Все компоненты правильно экспортируются
- Создана модульная архитектура согласно FSD

## Новый контекст для следующих фаз

### Созданные типы и интерфейсы
```typescript
// Расширенный ChatMessage с поддержкой tool calls
interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  toolCalls?: ToolCall[]
  metadata?: Record<string, any>
}

// Состояние панелей ObjectEditor
interface PanelState {
  leftPanel: 'chat' | 'properties' | null
  rightPanel: 'manager' | null
  chatVisible: boolean
  propertiesVisible: boolean
  managerVisible: boolean
}
```

### Готовые к использованию компоненты
- `ChatContainer` - для отображения списка сообщений
- `ChatInput` - для ввода сообщений
- `PanelToggleButtons` - для переключения панелей в ObjectEditor
- `usePanelState` - для управления состоянием панелей

### Архитектурная схема (реализовано)
```
src/shared/entities/chat/
├── types/           ✅ ChatMessage, ChatConfig
├── ui/              ✅ ChatContainer, ChatMessageItem, ChatInput  
└── lib/             ✅ useChat, useChatScroll, chatUtils

src/features/object-editor/ui/PanelToggleButtons/
├── PanelToggleButtons.tsx    ✅ Компонент кнопок
├── types.ts                  ✅ Типы панелей
└── hooks/usePanelState.ts    ✅ Хук управления состоянием
```

## Связанные файлы
- `src/widgets/ChatInterface.tsx` - исходный код для анализа
- `src/features/object-editor/ui/` - целевая папка для размещения новых компонентов
- `src/shared/lib/langchain/` - существующий LangChain сервис для интеграции