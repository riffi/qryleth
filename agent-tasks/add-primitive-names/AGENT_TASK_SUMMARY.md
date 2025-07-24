# Агентская задача: Добавление поля name в GfxPrimitive

## Описание задачи

Добавить в тип `GfxPrimitive` поле `name` и обеспечить его использование для:
1. Автоматического заполнения имен примитивов при создании объектов через LLM агента
2. Отображения осмысленных имен в выпадающем списке примитивов в `ObjectEditorR3F` вместо текущих "Примитив 1", "Примитив 2"

## Ссылка на документацию

**ВАЖНО**: При выполнении каждой фазы обязательно сверяться с требованиями из [agent-tasks.md](../../docs/development/workflows/agent-tasks.md)

## Контекст задачи

### Текущая структура GfxPrimitive
```typescript
// src/entities/primitive/model/types.ts
export interface GfxPrimitive {
  type: 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'plane';
  // Геометрические параметры
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  radialSegments?: number;
  baseSize?: number;
  // Материальные свойства
  color?: string;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  // Трансформации
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
}
```

### Текущее отображение в ObjectEditorR3F
В файле `src/features/object-editor/ui/ObjectEditorR3F.tsx` (строки 218-223):
```typescript
<MultiSelect
  value={selectedPrimitiveIds.map(i => i.toString())}
  onChange={(values) => handleSelectPrimitives(values.map(v => parseInt(v)))}
  data={primitives.map((_, i) => ({ value: i.toString(), label: `Примитив ${i + 1}` }))}
  size="sm"
/>
```

### Создание объектов через LLM агента
В файле `src/shared/lib/langchain/tools/objectTools.ts` определена схема валидации для примитивов, которую использует LLM агент при создании новых объектов.

## План выполнения (фазы)

### Фаза 1: Добавление поля name в GfxPrimitive
**Цель**: Расширить интерфейс `GfxPrimitive` полем `name` и обновить связанные типы

**Задачи**:
- Добавить поле `name?: string` в интерфейс `GfxPrimitive`
- Обновить схему валидации Zod в `objectTools.ts` для поддержки поля `name`
- Обновить функцию нормализации примитивов при необходимости

**Файлы для изменения**:
- `src/entities/primitive/model/types.ts`
- `src/shared/lib/langchain/tools/objectTools.ts`
- `src/entities/primitive/model/normalize.ts` (при необходимости)

### Фаза 2: Обновление генерации имен в LLM агенте
**Цель**: Настроить LLM агента для автоматического создания осмысленных имен примитивов

**Задачи**:
- Обновить промпт для LLM агента, чтобы он генерировал осмысленные имена для примитивов
- Добавить поле `name` в схему валидации с соответствующими правилами
- Обеспечить fallback-логику для генерации имен по умолчанию

**Файлы для изменения**:
- `src/shared/lib/langchain/tools/objectTools.ts` (промпт и схема валидации)

### Фаза 3: Обновление отображения примитивов в ObjectEditorR3F
**Цель**: Изменить отображение примитивов в выпадающем списке для показа имен вместо "Примитив N"

**Задачи**:
- Обновить логику формирования данных для MultiSelect
- Создать функцию для генерации fallback-имен для примитивов без имени
- Обеспечить отображение типа примитива в случае отсутствия имени

**Файлы для изменения**:
- `src/features/object-editor/ui/ObjectEditorR3F.tsx`
- Возможно создание утилитарной функции для генерации имен примитивов

Фаза выполнена. Итоги: [phases/phase_3_summary.md](phases/phase_3_summary.md)

### Фаза 4: Обновление существующих примитивов
**Цель**: Обеспечить корректную работу с существующими примитивами, у которых нет поля `name`

**Задачи**:
- Обновить функции создания и обработки примитивов для поддержки поля `name`
- Добавить миграционную логику для существующих примитивов
- Обновить тесты при их наличии

**Файлы для изменения**:
- `src/features/object-editor/model/objectStore.ts`
- Другие файлы, работающие с примитивами
- Тесты (при наличии)

Фаза выполнена. Итоги: [phases/phase_4_summary.md](phases/phase_4_summary.md)

### Фаза 5: Финальное тестирование и документация 
**Цель**: Протестировать функциональность и обновить документацию

**Задачи**:
- Протестировать создание объектов через LLM агента с автоматическими именами
- Протестировать отображение примитивов в ObjectEditorR3F
- Проверить совместимость с существующими объектами
- Обновить документацию API при необходимости

**Файлы для изменения**:
- Документация в `docs/` (при необходимости)

## Связанные файлы

- [Design Principles](../../docs/architecture/design-principles.md) - Архитектурные принципы
- [LLM Integration](../../docs/features/ai-integration/llm-integration.md) - Интеграция AI агента

## Статус выполнения

- ✅**Фаза 1**: Выполнена ([phases/phase_1_summary.md](phases/phase_1_summary.md))
- ✅**Фаза 2**: Выполнена ([phases/phase_2_summary.md](phases/phase_2_summary.md))
- ✅**Фаза 3**: Выполнена ([phases/phase_3_summary.md](phases/phase_3_summary.md))
- ✅**Фаза 4**: Выполнена ([phases/phase_4_summary.md](phases/phase_4_summary.md))
-  **Фаза 5**: Запланирована
