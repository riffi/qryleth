# Рефакторинг ChatInterface для соответствия архитектуре FSD

**Ссылка на правила**: [agent-tasks.md](../../docs/development/workflows/agent-tasks.md)

> ⚠️ **ВАЖНО**: При выполнении каждой фазы обязательно сверяйтесь с требованиями из документа правил агентских задач.

## Контекст задачи

В настоящее время ChatInterface, который является частью фичи sceneEditor, находится в папке widgets, что не соответствует архитектуре Feature-Sliced Design (FSD). 

### Текущие проблемы

1. **Нарушение принципов FSD** - ChatInterface находится в widgets вместо соответствующей фичи
2. **Отсутствие переиспользования** - аналогичная функциональность нужна для objectEditor
3. **Монолитная структура** - общая и специфичная логика смешаны в одном компоненте
4. **Отсутствие системы управления панелями** в objectEditor для размещения нового чата

### Текущая архитектура

**Проблемный компонент:**
- `src/widgets/ChatInterface.tsx` (480 строк) - содержит как общую логику чата, так и специфичные для sceneEditor интеграции

**Ключевые зависимости:**
- LangChain сервисы для AI интеграции
- `addNewObjectTool` и `createAddNewObjectTool` (специфично для scene)
- UI компоненты для отображения сообщений и ввода
- Debug-панель с JSON выводом

**Текущие фичи, использующие ChatInterface:**
- `features/scene` - SceneEditor с полной интеграцией чата
- `features/object-editor` - требует добавления аналогичной функциональности

## План выполнения по фазам

### Фаза 1: Создание базовой инфраструктуры
**Цель:** Создание общих компонентов и типов для chat-функциональности

**Задачи:**
1. Создать `shared/entities/chat` с базовой функциональностью
2. Создать `features/object-editor/ui/PanelToggleButtons` для управления панелями ObjectEditor  
3. Создать типы для состояния панелей (`PanelState`, `PanelType`)

**Критерии готовности:**
- [ ] Базовые типы ChatMessage, ChatConfig созданы в shared/entities/chat/types/
- [ ] UI компоненты ChatContainer, ChatMessageItem, ChatInput созданы в shared/entities/chat/ui/
- [ ] Хуки useChat, useChatScroll созданы в shared/entities/chat/lib/hooks/
- [ ] PanelToggleButtons компонент создан в features/object-editor/ui/
- [ ] Типы для управления состоянием панелей определены

### Фаза 2: Рефакторинг ObjectEditor layout
**Цель:** Подготовка UI ObjectEditor для интеграции системы переключаемых панелей

**Задачи:**
1. Создать `ObjectEditorLayout` компонент для управления панелями
2. Интегрировать toggle buttons в header (страница) и modal header  
3. Реализовать логику взаимоисключающего отображения левых панелей

**Критерии готовности:**
- [ ] ObjectEditorLayout компонент создан с поддержкой переключаемых панелей
- [ ] Toggle buttons интегрированы в header страницы редактирования объекта
- [ ] Toggle buttons интегрированы в header модального окна редактирования
- [ ] Реализована логика: чат и свойства взаимоисключающие (левая панель), менеджер независимый (правая панель)
- [ ] Автоматическое скрытие чата при выборе примитива/материала работает корректно

### Фаза 3: Миграция SceneEditor ChatInterface  
**Цель:** Перенос существующего ChatInterface в соответствующую фичу scene

**Задачи:**
1. Перенести специфичную логику в `features/scene/ui/ChatInterface`
2. Обновить все импорты ChatInterface в sceneEditor
3. Провести тестирование обратной совместимости

**Критерии готовности:**
- [ ] SceneChatInterface создан в features/scene/ui/ChatInterface/
- [ ] Специфичная логика (addNewObjectTool, debug-панель) перенесена
- [ ] Все импорты в sceneEditor обновлены
- [ ] Функциональность sceneEditor работает без изменений
- [ ] Debug-панель с JSON выводом сохранена и работает

### Фаза 4: Создание ObjectEditor ChatInterface
**Цель:** Реализация chat-функциональности для objectEditor с интеграцией в новый layout

**Задачи:**
1. Создать `features/object-editor/ui/ChatInterface/ObjectChatInterface`
2. Интегрировать чат в новый layout с toggle системой
3. Добавить специфичные для object-editor AI tools

**Критерии готовности:**
- [ ] ObjectChatInterface создан и интегрирован в ObjectEditorLayout
- [ ] Чат корректно отображается в левой панели при активации соответствующей toggle кнопки
- [ ] Система переключения панелей работает корректно (чат скрывается при выборе свойств)
- [ ] AI tools специфичные для object-editor интегрированы
- [ ] Чат функционирует в обоих режимах: страница редактирования и модальное окно

### Фаза 5: Финализация и тестирование
**Цель:** Завершение миграции и проверка всей системы

**Задачи:**
1. Удалить старый `widgets/ChatInterface.tsx`
2. Провести полное тестирование обеих фич
3. Проверить производительность и UX

**Критерии готовности:**
- [ ] Старый widgets/ChatInterface.tsx удален
- [ ] Scene editor полностью функционален с новым ChatInterface
- [ ] Object editor полностью функционален с новым ChatInterface и системой панелей
- [ ] Нет регрессий в производительности
- [ ] UX соответствует требованиям (плавные переходы, сохранение состояния панелей)
- [ ] Все импорты корректны, dead code удален

## Технические детали реализации

### Архитектурная схема (целевое состояние)

**1. Shared entities для chat:**
```
src/shared/entities/chat/
├── types/
│   ├── ChatMessage.ts          # Базовые типы сообщений
│   └── ChatConfig.ts           # Конфигурация чата
├── ui/
│   ├── ChatMessageItem/        # Компонент отдельного сообщения
│   ├── ChatInput/              # Поле ввода сообщения
│   └── ChatContainer/          # Контейнер для чата
└── lib/
    ├── hooks/
    │   ├── useChat.ts          # Основная логика чата
    │   └── useChatScroll.ts    # Автоскролл чата
    └── utils/
        └── chatUtils.ts        # Утилиты для работы с чатом
```

**2. Scene ChatInterface:**
```
src/features/scene/ui/ChatInterface/
├── SceneChatInterface.tsx      # Главный компонент чата для scene
├── components/
│   ├── SceneDebugPanel/        # Debug-панель с JSON выводом
│   └── SceneToolCallbacks/     # Callbacks для scene-специфичных действий
└── hooks/
    └── useSceneChat.ts         # Хук для scene-специфичной логики
```

**3. ObjectEditor ChatInterface и Layout:**
```
src/features/object-editor/ui/
├── ChatInterface/
│   ├── ObjectChatInterface.tsx # Главный компонент чата для object-editor
│   ├── components/
│   │   └── ObjectToolCallbacks/ # Callbacks для object-editor действий
│   └── hooks/
│       └── useObjectChat.ts    # Хук для object-editor логики
├── PanelToggleButtons/
│   ├── PanelToggleButtons.tsx  # Кнопки управления панелями
│   ├── types.ts               # Типы для состояния панелей
│   └── hooks/
│       └── usePanelState.ts   # Управление состоянием панелей
└── ObjectEditorLayout/
    ├── ObjectEditorLayout.tsx  # Layout с поддержкой панелей
    └── components/
        ├── HeaderControls/     # Контролы в header
        └── PanelContainer/     # Контейнер для панелей
```

### Ключевые интерфейсы

**Состояние панелей ObjectEditor:**
```typescript
interface PanelState {
  leftPanel: 'chat' | 'properties' | null
  rightPanel: 'manager' | null
  chatVisible: boolean
  propertiesVisible: boolean
  managerVisible: boolean
}

type PanelType = 'chat' | 'properties' | 'manager'
```

**Расширенные типы чата:**
```typescript
interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  toolCalls?: ToolCall[]
}

interface ChatConfig {
  feature: 'scene' | 'object-editor'
  tools: ToolDefinition[]
  systemPrompt: string
  debugMode?: boolean
}
```

### Логика переключения панелей

**Правила взаимодействия панелей:**
1. **Левая панель**: чат и свойства взаимоисключающие
2. **Правая панель**: менеджер работает независимо
3. **Автоматика**: при выборе примитива/материала в менеджере → скрыть чат, показать свойства
4. **Индикация**: активные панели визуально выделены в toggle buttons
5. **Режимы интеграции**:
   - Страница редактирования: кнопки в rightSection header
   - Модальное окно: кнопки в шапке рядом с крестиком закрытия

### Миграционные риски и решения

**Потенциальные проблемы:**
- Breaking changes при обновлении импортов
- Дублирование LangChain логики между фичами  
- Проблемы с hot reload при рефакторинге
- Синхронизация состояния чатов

**Решения:**
- Создать общий `useLangChainService` хук в shared
- Вынести tool registration в отдельные модули
- Использовать единую конфигурацию OpenAI подключений
- Поэтапная миграция с промежуточным тестированием

## Критерии успеха

1. **Архитектурные:**
   - [ ] ChatInterface соответствует принципам FSD
   - [ ] Общая функциональность вынесена в shared/entities
   - [ ] Специфичная логика находится в соответствующих фичах

2. **Функциональные:**
   - [ ] SceneEditor сохраняет всю текущую функциональность
   - [ ] ObjectEditor получает полнофункциональный чат
   - [ ] Система управления панелями работает интуитивно

3. **Качественные:**
   - [ ] Нет регрессий в производительности
   - [ ] UX остается плавным и отзывчивым
   - [ ] Код хорошо структурирован и читаем
   - [ ] Отсутствует дублирование логики

## Связанные документы

- [Обсуждение задачи](../../agent-discussion/chatinterface-fsd-refactoring/DISCUSSION_SUMMARY.md)
- [Принципы FSD](../../docs/architecture/feature-sliced-design.md)
- [Правила агентских задач](../../docs/development/workflows/agent-tasks.md)