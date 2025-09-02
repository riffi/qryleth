# Feature-Sliced Design в Qryleth

Этот документ описывает структуру папок и основные сегменты проекта в соответствии с принципами Feature-Sliced Design (FSD).

---

## Принципы FSD

**Иерархия слоев** (от высшего к низшему):
```text
app/      ← Может импортировать все слои ниже
pages/    ← Может импортировать все слои ниже  
widgets/  ← Может импортировать все слои ниже
features/ ← Может импортировать entities, shared
entities/ ← Может импортировать shared (общие типы)
shared/   ← НЕ МОЖЕТ импортировать слои выше (самодостаточен)
```

**Основное правило**: слой может импортировать только из слоев, расположенных **ниже** в иерархии.

---

## Структура папок

```text
src/
├─ features/
│  ├─ editor/
│  │  ├─ scene/
│  │  │  ├─ model/     # Zustand‑store, типы, селекторы
│  │  │  ├─ ui/        # R3F‑композиция, объектный менеджер, чат, скриптинг
│  │  │  ├─ lib/       # Headless‑хуки, SceneAPI, terrain, AI‑tools
│  │  │  ├─ layout/    # Раскладка и панельное состояние (persist‑фасад)
│  │  │  ├─ toolbar/   # Тулбары (левый/правый/верхний)
│  │  │  ├─ config/    # Конфигурация террейна и прочее
│  │  │  ├─ constants.ts
│  │  │  └─ index.ts   # Публичный API editor/scene
│  │  └─ object/
│  │     ├─ model/
│  │     ├─ ui/
│  │     │  └─ ChatInterface/    # ObjectChatInterface для объектов
│  │     ├─ layout/               # Состояние раскладки и панелей
│  │     ├─ toolbar/              # Вертикальные тулбары (чат/свойства, менеджер)
│  │     ├─ lib/
│  │     │  └─ ai/                # AI инструменты редактирования объекта
│  │     │     └─ tools/
│  │     └─ index.ts
│  ├─ scene-persistence/  # Чистые операции сохранения + SaveModal
│  ├─ scene-play-mode/    # Play‑overlay и хоткеи Play (виджет подключает)
│  └─ widgets/
│     └─ SceneEditor/             # Виджет сценового редактора (композиция)
├─ shared/
│  ├─ entities/
│  │  └─ chat/             # Общая chat функциональность
│  │     ├─ types/         # ChatMessage, ChatConfig
│  │     ├─ ui/            # ChatContainer, ChatInput, ChatMessageItem
│  │     └─ lib/           # useChat, useChatScroll, chatUtils
│  └─ lib/
│     └─ langchain/
│        ├─ chatService.ts    # Базовый сервис (без зависимостей от features)
│        ├─ toolRegistry.ts   # Реестр инструментов
│        └─ types.ts          # Общие типы
```

Каждая фича изолирована. Она предоставляет функциональность через `index.ts`, скрывая внутренние модули.

---

## Редакторские подсистемы (features/editor/*)

В рамках FSD редакторские домены выделены в отдельный неймспейс `features/editor/*`:

- editor/scene: полный стек сценового редактора (model/ui/lib/layout/toolbar/config/constants). Публичные точки входа: `@/features/editor/scene/ui`, `@/features/editor/scene/model`, `@/features/editor/scene/lib`.
- editor/object: стек редактора объекта (model/ui/lib/layout/toolbar). Публичные точки входа аналогичны: `@/features/editor/object/*`.

Границы и зависимости:
- Запрещены кросс‑импорты между `editor/scene/*` и `editor/object/*`. Общие зависимости — только через `shared/*` (типы, утилиты, UI) или согласованные фасады (`editor/*/layout`).
- Виджеты (`widgets/*`) импортируют только публичные API фич (например, `@/features/editor/scene/ui`) и не залезают во внутренние пути.
- Общая инфраструктура сцены вне редактора (persist, play‑mode, сохранение) остаётся в своих фичах (`features/scene-persistence`, `features/scene-play-mode`) и подключается из виджета.
- Исторические фичи `scene-layout` и `scene-toolbar` переехали в `editor/scene/layout` и `editor/scene/toolbar`.

Примеры импортов:
```ts
import { SceneEditorR3F } from '@/features/editor/scene/ui'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { SceneAPI } from '@/features/editor/scene/lib/sceneAPI'
```

---

## Роли сегментов

- **model/** – zustand-хранилища, селекторы и бизнес-логика.
- **ui/** – React-компоненты, сгруппированные по назначению.
- **lib/** – чистые вспомогательные функции.
  - **lib/ai/** – AI инструменты, специфичные для данной feature.
- **api/** – функции для работы с сервером.

---

## Примеры соблюдения FSD для AI Tools

### ❌ Неправильно (до рефакторинга)

```typescript
// shared/lib/langchain/tools/sceneTools.ts - НАРУШЕНИЕ!
// shared слой импортирует из features
import { SceneAPI } from '@/features/scene/lib/sceneAPI'
import { useSceneStore } from '@/features/scene/model/sceneStore'
```

**Проблемы:**
- `shared` слой не может импортировать из `features`
- Нарушается принцип изоляции слоев FSD
- Создается циклическая зависимость

### ✅ Правильно (после рефакторинга)

```typescript
// features/scene/lib/ai/tools/sceneTools.ts - ПРАВИЛЬНО!
// features может импортировать из своей же feature и из shared/entities
import { SceneAPI } from '@/features/scene/lib/sceneAPI'
import { useSceneStore } from '@/features/scene/model/sceneStore'
import { toolRegistry } from '@/shared/lib/langchain/toolRegistry'

// features/scene/lib/ai/index.ts
export const sceneToolProvider: ToolProvider = {
  register: () => toolRegistry.registerTool('scene', sceneTools),
  unregister: () => toolRegistry.unregisterTool('scene')
}

// shared/lib/langchain/chatService.ts - ПРАВИЛЬНО!
// shared слой работает через абстракцию toolRegistry
import { toolRegistry } from './toolRegistry'
const tools = toolRegistry.getAllTools() // Без прямых импортов из features
```

### Принципы правильной архитектуры AI Tools

1. **Динамическая регистрация**: `shared` слой использует реестр вместо прямых импортов
2. **Feature-специфичные tools**: каждая feature управляет своими AI инструментами
3. **Автоматическая регистрация**: хуки автоматически регистрируют/отменяют инструменты при монтировании компонентов
4. **Изоляция**: изменения в одной feature не затрагивают другие

### Виджеты и композиция

- Сборка редактора сцены выполняется в `widgets/SceneEditor`: виджет импортирует фичи, фичи не импортируют друг друга и не знают о виджете.
- `SceneEditorR3F` получает презентационные компоненты/колбэки через пропсы:
  - тулбары, overlay Play, onSaveSceneRequest, onRequestEditObject.
  - Это гарантирует отсутствие кросс‑фича импортов внутри `features/scene`.

---

## Chat архитектура в FSD

### Принципы организации ChatInterface

После рефакторинга ChatInterface была перестроена в соответствии с принципами FSD:

1. **Shared entities** - базовая функциональность:
   ```
   shared/entities/chat/
   ├── types/           # ChatMessage, ChatConfig (расширенные типы)
   ├── ui/              # Переиспользуемые компоненты
   │   ├── ChatContainer/
   │   ├── ChatInput/
   │   └── ChatMessageItem/
   └── lib/             # Базовые хуки и утилиты
       ├── hooks/       # useChat, useChatScroll
       └── utils/       # chatUtils
   ```

2. **Feature-специфичные ChatInterface**:
   - `features/scene/ui/ChatInterface/SceneChatInterface` - для работы со сценами
   - `features/editor/object/ui/ChatInterface/ObjectChatInterface` - для редактирования объектов

### Миграция от монолитного подхода

**До рефакторинга** (нарушение FSD):
```typescript
// widgets/ChatInterface.tsx - монолитный компонент 480 строк
// - Содержал как общую логику чата, так и специфичную для scene
// - Не переиспользовался в object-editor
// - Нарушал принципы FSD (widgets содержал бизнес-логику)
```

**После рефакторинга** (соответствие FSD):
```typescript
// shared/entities/chat - базовая функциональность
// features/scene/ui/ChatInterface - специфично для сцен
// features/editor/object/ui/ChatInterface - специфично для объектов
```

### Особенности реализации ChatInterface

1. **SceneChatInterface**:
   - Debug-панель с JSON выводом
   - Интеграция с addNewObjectTool
   - Полноэкранный режим

2. **ObjectChatInterface**:
   - Система переключаемых панелей (чат ⟷ свойства)
   - Контекстная помощь на основе редактируемого объекта
   - Специализированные AI tools (getObjectData, addPrimitives)
   - Поддержка режимов страницы и модального окна

3. **Shared chat entities**:
   - Расширенный тип ChatMessage с поддержкой toolCalls и id
   - Переиспользуемые UI компоненты
   - Общие хуки для управления состоянием чата

---

> Соблюдение FSD делает кодовую базу модульной и поддерживаемой. Правильная архитектура AI Tools и ChatInterface гарантирует возможность независимого развития различных функций редактора.

