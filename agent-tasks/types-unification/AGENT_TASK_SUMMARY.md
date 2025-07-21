# Агентская задача: Унификация системы типов данных

> ⚠️ **ОБЯЗАТЕЛЬНО**: При выполнении каждой фазы необходимо сверяться с требованиями из [../../docs/AGENT_TASKS.md](../../docs/AGENT_TASKS.md) и [../../docs/qryleth_architecture_guidelines.md](../../docs/qryleth_architecture_guidelines.md)

## Описание задачи

В приложении основные типы данных раскиданы по коду хаотично: некоторые правильно лежат в `/entities/[название сущности]`, некоторые лежат группой в файлах, например, `entities/r3f/types`, `entities/scene/types` и `/shared/lib/database`. Необходимо создать унифицированное хранение типов для удобного использования.

### Контекст

#### Текущие проблемы организации типов
1. **🚨 Критическая**: Монолитный файл `entities/r3f/types.ts` (187 строк) содержит несвязанные типы:
   - Store интерфейсы (должны быть в features)
   - Hook return types (должны быть в features/shared)  
   - UI state типы перемешаны с domain entities
   - R3F-специфичные типы смешаны с генерик scene типами

2. **🚨 Критическая**: Нарушения архитектурных принципов:
   - `/entities/r3f/` не является доменной сущностью (нарушение FSD)
   - Store типы находятся в entities вместо features
   - Database типы импортируют из entities (нарушение иерархии FSD)

3. **⚠️ Средняя**: Отсутствие барельных экспортов и дублирование типов

#### Текущее состояние типов

**✅ Хорошо организованные:**
- Domain entities: `/entities/{primitive,object,layer,objectInstance,lighting}/model/types.ts`
- Utility types: `/shared/types/{vector3,transform}.ts`  
- API types: `/shared/lib/{database,openAISettings,openAIAPI}.ts`

**❌ Требуют рефакторинга:**
- **Монолит**: `/entities/r3f/types.ts` (187 строк) - mix of store, UI, events
- **Неправильно размещенные**: Store types в entities вместо features
- **Циклические зависимости**: Взаимные импорты между entities и shared

#### Архитектурные требования
Согласно `qryleth_architecture_guidelines.md`:
- **Правило доступа слоев**: импорт только "вниз" или на том же уровне
- **entities**: Только доменные типы, алгоритмы, схемы (не React, не stores)
- **shared**: UI атомы, общие хуки/утилиты (зависимости: entities)
- **features**: Бизнес-логика, slice-store, UI молекулы (зависимости: entities, shared)
- **Барельные экспорты**: Использовать index.ts для чистых импортов

## План выполнения по фазам

### Фаза 1: Анализ зависимостей и подготовка к миграции ⏳ Запланировано
**Задача**: Провести детальный анализ всех типов и их использования для безопасной миграции

**Файлы для анализа**: Все TypeScript файлы проекта

**Детали анализа**:
1. **Mapping usage**: Найти все места импорта каждого типа из проблемных файлов
2. **Dependency graph**: Построить граф зависимостей между типами  
3. **Migration plan**: Определить порядок безопасной миграции без breaking changes
4. **Breaking changes assessment**: Выявить типы, которые могут сломать существующий код

**Критический анализ**:
- Все импорты из `/entities/r3f/types.ts` (187 строк)
- Циклические зависимости между слоями
- Использование store типов в компонентах

**Deliverables**:
- Детальная карта всех импортов и зависимостей
- План миграции без нарушения функциональности
- Список потенциальных breaking changes

**Ожидаемый результат**: Готовый план безопасной миграции всех типов

### Фаза 2: Создание новой структуры типов ⏳ Запланировано  
**Задача**: Создать правильную FSD-структуру для типов без нарушения существующего кода

**Файлы для создания**:
```
/shared/
  /types/
    /core/
      - index.ts (Vector3, Transform, базовые утилитарные типы)
    /ui/  
      - index.ts (ViewMode, RenderMode, Selection-типы)
      - events.ts (SceneClickEvent, ObjectTransformEvent)
/entities/
  - index.ts (экспорт всех доменных entities)
/features/
  /scene/
    /model/
      - store-types.ts (SceneStoreState, SceneStoreActions, SceneStore)
      - view-types.ts (Scene-специфичные UI типы)
/shared/
  /api/
    - types.ts (Database, OpenAI типы)
  /lib/
    /r3f/
      - types.ts (R3F-специфичные технические типы)
```

**Детали реализации**:
1. **Создание структуры**: Новые директории и файлы
2. **Duplication strategy**: Дублировать типы в новых местах с алиасами
3. **Barrel exports**: Создать index.ts файлы для всех категорий
4. **Type organization**: Разделить типы по ответственности и слоям

**Архитектурные принципы**:
- entities: Только доменные типы (GfxPrimitive, GfxObject, etc.)
- shared/types/core: Утилитарные типы (Vector3, Transform)  
- shared/types/ui: Общие UI типы (ViewMode, Selection)
- features/*/model: Feature-специфичные типы (Store, бизнес-логика)

**Ожидаемый результат**: Правильная FSD-структура типов с барельными экспортами

### Фаза 3: Миграция Store и Feature типов ⏳ Запланировано
**Задача**: Перенести все store и feature-специфичные типы из entities в соответствующие features

**Файлы для миграции**:
- `/entities/r3f/types.ts` → `/features/scene/model/` (типы stores)
- Store interfaces → соответствующие features
- Hook return types → features/shared

**Типы для перемещения**:
```typescript
// Из entities/r3f/types.ts в features/scene/model/store-types.ts:
- SceneStoreState, SceneStoreActions, SceneStore
- UseSceneEventsReturn, UseObjectSelectionReturn, etc.

// Из entities/r3f/types.ts в features/scene/model/view-types.ts:  
- ViewMode, RenderMode, TransformMode
- SelectedObject, HoveredObject
- SceneMetaData, SceneStatus

// Из entities/r3f/types.ts в shared/types/ui/events.ts:
- SceneClickEvent, SceneHoverEvent
- ObjectTransformEvent, PrimitiveTransformEvent
```

**Стратегия миграции**:
1. **Создать новые файлы** с правильной структурой
2. **Установить алиасы** в старых местах: `export type { SceneStore } from '@/features/scene/model'`
3. **Обновить импорты** постепенно в небольших батчах
4. **Сохранить обратную совместимость** через re-exports

**Критерии успеха**:
- Все store типы в features слое  
- Нет типов в entities/r3f/
- Все тесты проходят
- Приложение работает без изменений

**Ожидаемый результат**: Store и feature типы корректно размещены в features слое

### Фаза 4: Миграция общих UI и утилитарных типов ⏳ Запланировано
**Задача**: Перенести общие UI типы и утилиты в shared слой с правильной категоризацией

**Файлы для миграции**:
- UI типы → `/shared/types/ui/`
- R3F типы → `/shared/lib/r3f/`  
- Database типы → `/shared/api/`

**Детали миграции**:
1. **Общие UI типы в shared/types/ui/**:
   ```typescript
   // ViewMode, RenderMode - используются в разных features
   // Selection типы - универсальные для UI
   // Event типы - кроссфичевые
   ```

2. **R3F технические типы в shared/lib/r3f/**:
   ```typescript  
   // R3F-специфичные типы (Three.js integrations)
   // Canvas, Scene technical types
   // Renderer configuration types
   ```

3. **API типы в shared/api/**:
   ```typescript
   // Database record types
   // Network/API interfaces  
   // External service types
   ```

**Стратегия безопасной миграции**:
1. Создать новую структуру с дублированием
2. Добавить барельные экспорты  
3. Обновить импорты батчами (по 10-15 файлов)
4. Удалить старые типы после полной миграции

**Ожидаемый результат**: Все общие типы правильно размещены в shared слое

### Фаза 5: Обновление импортов и удаление дубликатов ⏳ Запланировано  
**Задача**: Заменить все импорты на новые пути и удалить старые дублированные типы

**Файлы для обновления**: Все TypeScript файлы с импортами типов

**Стратегия обновления импортов**:
1. **Batch updates**: Обновлять импорты группами по feature/domain
2. **Automated scripts**: Использовать find-replace с validation
3. **Test-driven**: Прогонять тесты после каждого batch'а
4. **Standardized paths**: Унифицировать все импорты

**Целевые паттерны импортов**:
```typescript
// Domain entities
import type { GfxPrimitive, GfxObject } from '@/entities'

// Core utilities  
import type { Vector3, Transform } from '@/shared/types/core'

// UI types
import type { ViewMode, SelectionState } from '@/shared/types/ui'

// Feature types
import type { SceneStore } from '@/features/scene/model'

// API types
import type { SceneRecord, ObjectRecord } from '@/shared/api'
```

**Удаление дубликатов**:
1. Удалить `/entities/r3f/` полностью
2. Очистить старые групповые файлы типов
3. Удалить re-export алиасы
4. Обновить все index.ts файлы

**Критерии завершения**:
- Все импорты используют новые пути
- Нет дублированных типов
- Все тесты проходят
- TypeScript компиляция без ошибок

**Ожидаемый результат**: Чистая унифицированная система типов

### Фаза 6: Создание барельных экспортов и документации ⏳ Запланировано
**Задача**: Создать удобную систему экспортов и документацию по использованию типов

**Файлы для создания/обновления**:
- Все `index.ts` файлы в type-директориях
- `spec/TYPES_GUIDE.md` - руководство по типам
- Обновить imports в примерах документации

**Барельные экспорты по уровням**:
```typescript
// /shared/types/index.ts - корневой экспорт shared типов
export * from './core'
export * from './ui'

// /shared/api/index.ts - API types
export * from './types'
export * from './database' 

// /entities/index.ts - все domain entities
export * from './primitive'
export * from './object'
export * from './layer'
export * from './scene'

// /features/scene/model/index.ts - scene feature types
export * from './store-types'
export * from './view-types'
```

**Документация**:
В папке /spec
1. **TYPES_GUIDE.md**: Где найти какие типы
2. **Import examples**: Примеры правильных импортов
3. **Architecture rationale**: Почему типы размещены именно так
4. **Migration guide**: Как обновлять код при изменениях типов

**TypeScript configuration**:
- Обновить `paths` в tsconfig.json для удобных импортов
- Настроить type-only imports где возможно
- Добавить lint rules для консистентности импортов

**Ожидаемый результат**: Удобная и документированная система типов

## Статус выполнения фаз
- [ ] **Фаза 1**: Анализ зависимостей и подготовка к миграции - Запланировано
- [ ] **Фаза 2**: Создание новой структуры типов - Запланировано  
- [ ] **Фаза 3**: Миграция Store и Feature типов - Запланировано
- [ ] **Фаза 4**: Миграция общих UI и утилитарных типов - Запланировано
- [ ] **Фаза 5**: Обновление импортов и удаление дубликатов - Запланировано
- [ ] **Фаза 6**: Создание барельных экспортов и документации - Запланировано

## Ссылки на выполненные фазы
*Будут добавлены по мере выполнения*

## Критические риски и меры предосторожности

### 🚨 Breaking Changes Risks
1. **Store types migration**: Может сломать существующие features
   - **Митigation**: Использовать алиасы и постепенную миграцию
2. **Circular dependencies**: При неправильном перемещении типов
   - **Митigation**: Детальный анализ зависимостей в Фазе 1
3. **Build failures**: TypeScript compilation errors
   - **Митigation**: Batch updates с тестированием после каждого batch'а

### 🛡️ Safety Measures  
1. **Gradual migration**: Никогда не удалять старые типы до полной миграции
2. **Re-exports**: Поддерживать обратную совместимость через алиасы
3. **Test coverage**: Прогонять все тесты после каждой фазы
4. **Rollback plan**: Возможность быстро откатиться к предыдущему состоянию

## Примечания для агентов

1. **Архитектурная чистота**: Строго следовать FSD принципам из guidelines
2. **Безопасность**: Никогда не ломать существующий код - только улучшать структуру
3. **Тестирование**: После каждой фазы убеждаться, что приложение работает
4. **Консистентность**: Использовать единые паттерны именования и организации
5. **Документирование**: Обновлять документацию при изменении публичных API

### Ключевые принципы для агентов
- **entities**: Только business domain типы (GfxPrimitive, GfxObject, etc.)
- **shared**: Общие типы, не привязанные к конкретным features  
- **features**: Feature-специфичные типы (stores, business logic)
- **Импорты**: Всегда использовать типизированные импорты (`import type`)
- **Барельные экспорты**: Предпочитать импорт из index.ts файлов
