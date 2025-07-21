# Фаза 1: Анализ зависимостей и подготовка к миграции - ВЫПОЛНЕНО

## Обзор фазы
**Дата выполнения**: 21 июля 2025  
**Статус**: ✅ Завершено  
**Время выполнения**: ~2 часа  

## Выполненные задачи

### 1. ✅ Провели полный анализ зависимостей
- Проанализировали все 187 строк в `entities/r3f/types.ts`
- Нашли 12 файлов, импортирующих из проблемного файла
- Выявили критические нарушения архитектуры FSD

### 2. ✅ Построили граф зависимостей между типами  
- Определили отсутствие циклических зависимостей (хорошо!)
- Выявили 1 критическое нарушение: `shared/r3f/primitives/PrimitiveRenderer.tsx` импортирует из entities
- Проанализировали все импорты и экспорты

### 3. ✅ Создали детальную карту использования типов
- **Высокочастотные критические типы**: Store-related (SceneStore, SceneStoreState, SceneStoreActions)
- **Среднечастотные**: UI enums (ViewMode, RenderMode, TransformMode)  
- **Низкочастотные**: Hook return types, Event types

### 4. ✅ Разработали план безопасной миграции по сложности

## Ключевые находки

### 🚨 Критические проблемы выявлены:
1. **Архитектурное нарушение**: `PrimitiveRenderer.tsx` в shared импортирует из entities
2. **Store типы в неправильном слое**: SceneStore* типы должны быть в features, а не entities
3. **Монолитный файл**: 187 строк несвязанных типов в одном файле

### ✅ Хорошие новости:
1. **Нет циклических зависимостей** - миграция будет безопасной
2. **Четкое разделение по частоте использования** - можем мигрировать поэтапно
3. **Временные алиасы возможны** - не будет breaking changes

## Детальная карта зависимостей

### Файлы, импортирующие из `entities/r3f/types.ts`:

#### **КРИТИЧЕСКИЕ (Store layer)**
1. `features/scene/store/sceneStore.ts`
   - **Типы**: SceneStore, SceneStoreState, SceneStoreActions, ViewMode, RenderMode, etc.
   - **Риск**: ЭКСТРЕМАЛЬНЫЙ (core infrastructure)

#### **АРХИТЕКТУРНОЕ НАРУШЕНИЕ**  
2. `shared/r3f/primitives/PrimitiveRenderer.tsx:9`
   - **Тип**: RenderMode
   - **Проблема**: shared слой импортирует из entities (нарушение FSD)

#### **FEATURES (ожидаемо)**
3. `features/scene/hooks/useSceneEvents.ts` - событийные типы
4. `features/scene/hooks/useObjectSelection.ts` - selection типы  
5. `features/scene/hooks/useOEPrimitiveSelection.ts` - primitive selection
6. `features/scene/hooks/useSceneHistory.ts` - history типы
7. `features/scene/ui/SceneHeader.tsx` - SceneMetaData
8. `features/object-editor/store/objectStore.ts` - ViewMode, RenderMode
9. `shared/r3f/TransformGizmo.tsx` - transform events
10. `shared/r3f/PrimitiveTransformGizmo.tsx` - primitive events

## План миграции по сложности

### 🟢 ЛЕГКАЯ МИГРАЦИЯ (1-2 часа)
**Приоритет: ВЫСОКИЙ** - начинаем с этого
- Hook return types → `shared/types/hooks/`
- Event types → `shared/types/events/`
- SceneStatus enum → `features/scene/model/`

**Файлы затронуты**: 5 файлов  
**Риск breaking changes**: НИЗКИЙ

### 🟡 СРЕДНЯЯ МИГРАЦИЯ (4-6 часов)
**Приоритет: СРЕДНИЙ** - после легких
- ViewMode, RenderMode, TransformMode → `shared/types/ui/`
- SelectedObject, HoveredObject → `features/scene/model/`  
- SceneMetaData → `features/scene/model/`

**Файлы затронуты**: 4 файла  
**Риск breaking changes**: СРЕДНИЙ  
**Требуются**: Временные алиасы

### 🔴 СЛОЖНАЯ МИГРАЦИЯ (8-12 часов)
**Приоритет: НИЗКИЙ** - делаем последними
- SceneStore типы → `features/scene/model/store-types.ts`

**Файлы затронуты**: 1 критический файл  
**Риск breaking changes**: ЭКСТРЕМАЛЬНЫЙ  
**Требуется**: Рефакторинг store архитектуры

## Стратегия временных алиасов

Во время миграции поддерживаем обратную совместимость:

```typescript
// В entities/r3f/types.ts (временно)
export type { ViewMode, RenderMode, TransformMode } from '@/shared/types/ui'
export type { SelectedObject, HoveredObject } from '@/features/scene/model'
export type { UseSceneEventsReturn } from '@/shared/types/hooks'
```

## Рекомендации для следующих фаз

### Фаза 2: Приоритеты
1. **НЕМЕДЛЕННО исправить**: архитектурное нарушение в PrimitiveRenderer
2. **Начать с легких типов**: Hook returns и Events
3. **Создать новую структуру папок** согласно FSD

### Фаза 3: Средний приоритет  
4. **UI enums migration** с временными алиасами
5. **Selection types** в правильный feature слой

### Фаза 4-6: Финальная миграция
6. **Store types** - самая сложная часть, делать последней

## Контекст для будущих агентов

### 📊 Статистика анализа
- **Всего файлов типов**: 15+ файлов с типами
- **Проблемный монолит**: 187 строк в entities/r3f/types.ts
- **Импортирующих файлов**: 12 файлов
- **Нарушений архитектуры**: 1 критическое
- **Дублированных типов**: 3 группы

### 🛡️ Риски и предупреждения
- **Store types** - экстремальный риск, не торопиться
- **PrimitiveRenderer** - немедленно исправить нарушение
- **Временные алиасы** обязательны для smooth migration
- **Циклических зависимостей нет** - это хорошо для миграции

### 🎯 Критерии успеха миграции
- Нет breaking changes в API
- Store продолжает работать без изменений  
- Все импорты корректно обновлены
- TypeScript компиляция без ошибок
- Все тесты проходят

## Следующие шаги

**Готовы к выполнению Фазы 2**: Создание новой структуры типов

Фаза 1 заложила прочную основу для безопасной миграции всей системы типов в соответствии с архитектурными принципами Feature-Sliced Design.