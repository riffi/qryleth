# Агентская задача: Исправление нарушений FSD в LangChain tools

## Описание задачи

Исправить критические нарушения Feature-Sliced Design архитектуры в `shared/lib/langchain/tools`, где shared слой неправомерно импортирует и использует код из features слоя. Реорганизовать архитектуру так, чтобы базовая функциональность LangChain осталась в shared слое, а feature-специфичные tools переместить в соответствующие features (scene-editor, object-editor и др.).

## Ссылка на документацию

**ВАЖНО**: При выполнении каждой фазы обязательно сверяться с требованиями из [agent-tasks.md](../../docs/development/workflows/agent-tasks.md)

## Контекст задачи

### Текущие критические нарушения FSD

#### 1. sceneTools.ts
```typescript
// Нарушение: shared импортирует features
import { SceneAPI } from '@/features/scene/lib/sceneAPI'
```

#### 2. instanceTools.ts
```typescript  
// Критические нарушения: множественные импорты из features
import { SceneAPI } from '@/features/scene/lib/sceneAPI'
import { placeInstance } from '@/features/scene/lib/placement/ObjectPlacementUtils'
import { useSceneStore } from '@/features/scene/model/sceneStore'
```

#### 3. objectTools.ts
```typescript
// Нарушения: прямые обращения к entities
import type { GFXObjectWithTransform } from '@/entities/object/model/types'
import { generatePrimitiveName } from '@/entities/primitive'
```

### Иерархия FSD
```
app/ (высший)
pages/
widgets/ 
features/  ← НЕ ДОЛЖЕН импортироваться в shared
entities/
shared/    ← НЕ МОЖЕТ импортировать features
```

### Будущие требования
ИИ агент планируется использовать в нескольких features:
- **SceneEditor** - текущее использование, инструменты работы со сценой
- **ObjectEditor** - планируется, инструменты редактирования объектов  
- **Другие features** - возможные будущие интеграции

### Дополнительные нарушения
- `shared/lib/hooks/useUISync.ts` - импорт `useSceneStore` из features
- `shared/r3f/environment/GridHelper.tsx` - импорт `useGridVisible` из features  
- `shared/r3f/optimization/InstancedObjects.tsx` - импорт из features

## План выполнения (фазы)

### Фаза 1: Рефакторинг chatService для динамической регистрации tools
**Цель**: Модифицировать shared/lib/langchain/chatService для поддержки динамической регистрации tools из features

**Задачи**:
- Убрать хардкод импорт getAllSceneTools из chatService
- Создать систему регистрации tools через callback/события
- Обеспечить возможность подключения tools из разных features
- Создать интерфейсы для типизации tools

**Файлы для изменения**:
- `src/shared/lib/langchain/chatService.ts`
- `src/shared/lib/langchain/types.ts` (создать/обновить)

### Фаза 2: Создание scene-editor tools
**Цель**: Переместить scene-специфичные tools в features/scene-editor

**Задачи**:
- Создать `src/features/scene-editor/lib/ai/` для AI инструментов
- Переместить `sceneTools.ts` в `features/scene-editor/lib/ai/tools/`
- Переместить `instanceTools.ts` в `features/scene-editor/lib/ai/tools/`
- Создать функцию регистрации tools для scene-editor
- Обновить импорты в перемещенных файлах

**Файлы для перемещения/создания**:
- `src/shared/lib/langchain/tools/sceneTools.ts` → `src/features/scene-editor/lib/ai/tools/sceneTools.ts`
- `src/shared/lib/langchain/tools/instanceTools.ts` → `src/features/scene-editor/lib/ai/tools/instanceTools.ts`
- `src/features/scene-editor/lib/ai/tools/index.ts` (создать)
- `src/features/scene-editor/lib/ai/index.ts` (создать)

### Фаза 3: Создание object-editor tools
**Цель**: Создать инфраструктуру для object-editor AI tools

**Задачи**:
- Переместить `objectTools.ts` в `features/object-editor/lib/ai/tools/`
- Создать функцию регистрации tools для object-editor
- Подготовить структуру для будущих object-editor tools
- Обновить импорты в перемещенном файле

**Файлы для перемещения/создания**:
- `src/shared/lib/langchain/tools/objectTools.ts` → `src/features/object-editor/lib/ai/tools/objectTools.ts`
- `src/features/object-editor/lib/ai/tools/index.ts` (создать)
- `src/features/object-editor/lib/ai/index.ts` (создать)

### Фаза 4: Интеграция tools в features
**Цель**: Настроить регистрацию tools в соответствующих features

**Задачи**:
- Обновить scene-editor для регистрации своих tools при инициализации
- Обновить object-editor для регистрации своих tools при инициализации  
- Создать систему автоматической регистрации tools при загрузке features
- Обеспечить изоляцию tools между разными features

**Файлы для изменения**:
- `src/features/scene-editor/index.ts`
- `src/features/object-editor/index.ts`
- Компоненты, инициализирующие features

### Фаза 5: Исправление других нарушений FSD в shared
**Цель**: Исправить оставшиеся нарушения FSD в shared слое

**Задачи**:
- Исправить `useUISync.ts` - убрать прямой импорт из features
- Исправить `GridHelper.tsx` - получать данные через props
- Исправить `InstancedObjects.tsx` - убрать зависимость от features
- Создать адаптеры или события для связи shared-features при необходимости

**Файлы для изменения**:
- `src/shared/lib/hooks/useUISync.ts`
- `src/shared/r3f/environment/GridHelper.tsx`
- `src/shared/r3f/optimization/InstancedObjects.tsx`

### Фаза 6: Очистка и тестирование
**Цель**: Очистить старые файлы и протестировать исправления

**Задачи**:
- Удалить пустую папку `src/shared/lib/langchain/tools/`
- Обновить ChatInterface для работы с новой системой регистрации tools
- Запустить сборку проекта и убедиться в отсутствии ошибок
- Протестировать работу AI Assistant в SceneEditor и ObjectEditor
- Проверить отсутствие нарушений FSD архитектуры

**Файлы для удаления/изменения**:
- `src/shared/lib/langchain/tools/` (папка целиком)
- `src/widgets/ChatInterface.tsx` (обновить при необходимости)

## Архитектурные принципы

### До исправления (НЕВЕРНО)
```
shared/lib/langchain/tools/ ❌ tools в shared импортируют features
├── sceneTools.ts ❌ импортирует features/scene
├── instanceTools.ts ❌ импортирует features/scene  
└── objectTools.ts ❌ импортирует entities напрямую
```

### После исправления (ПРАВИЛЬНО)
```
shared/lib/langchain/
├── chatService.ts ✅ базовая функциональность, динамическая регистрация tools
└── types.ts ✅ общие типы для AI

features/scene-editor/lib/ai/tools/
├── sceneTools.ts ✅ может импортировать features
└── instanceTools.ts ✅ может импортировать features

features/object-editor/lib/ai/tools/
└── objectTools.ts ✅ может импортировать entities и features
```

## Связанные файлы

- [Design Principles](../../docs/architecture/design-principles.md) - Архитектурные принципы
- [LLM Integration](../../docs/features/ai-integration/llm-integration.md) - Интеграция AI агента

## Статус выполнения

- ✅ **Фаза 1**: **Выполнено** - Создана система динамической регистрации tools, убрана зависимость chatService от конкретных features. [Подробности](phases/phase_1_summary.md)
- ⏳ **Фаза 2**: Ожидает выполнения  
- ⏳ **Фаза 3**: Ожидает выполнения
- ⏳ **Фаза 4**: Ожидает выполнения
- ⏳ **Фаза 5**: Ожидает выполнения
- ⏳ **Фаза 6**: Ожидает выполнения

## Контекст выполнения

### Фаза 1 - Результаты выполнения
- Создана динамическая система регистрации tools через `ToolRegistry`
- Расширена типизация с интерфейсами `ToolProvider`, `ToolRegistrationEvent`, `ToolRegistry`
- Модифицирован `chatService.ts` для работы с реестром вместо хардкод импортов
- **Критическое достижение**: shared слой больше не импортирует напрямую из features

**Новые файлы**: 
- `src/shared/lib/langchain/toolRegistry.ts` - реестр инструментов

**Измененные файлы**:
- `src/shared/lib/langchain/types.ts` - добавлены интерфейсы
- `src/shared/lib/langchain/chatService.ts` - динамическая регистрация tools