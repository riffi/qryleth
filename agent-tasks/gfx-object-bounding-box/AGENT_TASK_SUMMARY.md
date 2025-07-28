# Агентская задача: Добавление BoundingBox в GfxObject

## Инструкции для агентов
При выполнении каждой из фаз обязательно сверяйтесь с требованиями из [agent-tasks.md](../../docs/development/workflows/agent-tasks.md)

## Контекст задачи

Сейчас в GfxObject нет общего BoundingBox объекта. Необходимо добавить в GfxObject информацию о BoundingBox объекта, автоматически вычислять и обновлять его при создании и изменении объекта, а также обновить scene tools для работы с BoundingBox.

### Анализ текущего состояния кодовой базы

#### Структура GfxObject
Основные типы находятся в:
- `src/entities/object/model/types.ts` - содержит интерфейсы `GfxObject` и `GFXObjectWithTransform`
- `src/entities/primitive/model/types.ts` - содержит типы примитивов (`GfxPrimitive`)

```typescript
export interface GfxObject {
  uuid: string;
  name: string;
  primitives: GfxPrimitive[];
}

export interface GFXObjectWithTransform extends GfxObject {
  position?: Vector3,
  scale?: Vector3,
  rotation?: Vector3,
  libraryUuid?: string
}
```

#### Scene Tools и API
- `src/features/scene/lib/ai/tools/objectTools.ts` - инструменты для создания объектов
- `src/features/scene/lib/ai/tools/sceneTools.ts` - инструменты для работы со сценой
- `src/features/scene/lib/ai/tools/instanceTools.ts` - инструменты для работы с экземплярами
- `src/features/scene/lib/sceneAPI.ts` - API для работы со сценой

#### Существующие типы
- `Vector3` определен как `[number, number, number]` в `src/shared/types/vector3.ts`
- Примитивы поддерживают различные геометрии (box, sphere, cylinder, cone, pyramid, plane, torus)

#### Three.js интеграция
В файле `src/features/scene/lib/geometry/perlinGeometry.ts` видно использование Three.js BoundingBox:
```typescript
geometry.computeBoundingBox()
console.log('Final geometry bounding box:', geometry.boundingBox)
```

## План выполнения

### Фаза 1: Добавление типов BoundingBox
**Статус: Выполнено**

Добавлены интерфейсы и типы для BoundingBox в систему типов приложения:
1. ✅ Создан интерфейс `BoundingBox` в `src/shared/types/boundingBox.ts`
2. ✅ Обновлен `GfxObject` для включения поля `boundingBox?: BoundingBox`
3. ✅ Добавлен экспорт нового типа в `src/shared/types/index.ts`

**Результат:** Типы BoundingBox готовы к использованию, GfxObject теперь может содержать информацию о ограничивающем прямоугольнике. Поле опциональное для обратной совместимости.

**Фаза выполнена:** [phase_1_summary.md](phases/phase_1_summary.md)

### Фаза 2: Функции вычисления BoundingBox
**Статус: Выполнено**

Созданы утилиты для автоматического вычисления BoundingBox:
1. ✅ Создан `src/shared/lib/geometry/boundingBoxUtils.ts` с функциями:
   - `calculatePrimitiveBoundingBox(primitive: GfxPrimitive): BoundingBox`
   - `calculateObjectBoundingBox(object: GfxObject): BoundingBox`
   - `mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox`
2. ✅ Учтены трансформации примитивов при вычислении (position, rotation, scale)

**Результат:** Готовы к использованию утилиты для автоматического вычисления BoundingBox для всех типов примитивов с поддержкой трансформаций. Функции размещены в shared слое согласно принципам FSD.

**Фаза выполнена:** [phase_2_summary.md](phases/phase_2_summary.md)

### Фаза 3: Интеграция в создание объектов
**Статус: Выполнено**
[Подробности фазы 3](phases/phase_3_summary.md)

Обновить места создания объектов для автоматического вычисления BoundingBox:
1. Обновить `src/features/scene/lib/ai/tools/objectTools.ts` - функция `createAddNewObjectTool`
2. Обновить `SceneAPI.addObjectWithTransform` в `src/features/scene/lib/sceneAPI.ts`
3. Обновить другие места создания объектов в системе

### Фаза 4: Интеграция в редактор объектов
**Статус: Выполнено**
[Подробности фазы 4](phases/phase_4_summary.md)

Редактор объектов пересчитывает BoundingBox при любом изменении примитивов и передает его в стор сцены и библиотеку.

### Фаза 5: Обновление Scene Tools для работы с BoundingBox
**Статус: Выполнено**
[Подробности фазы 5](phases/phase_5_summary.md)

Обновить AI инструменты для учета BoundingBox при размещении объектов:
1. Обновить `addObjectInstanceTool` в `src/features/scene/lib/ai/tools/instanceTools.ts`
2. Обновить `addObjectFromLibraryTool` в `src/features/scene/lib/ai/tools/objectTools.ts`
3. Обновить описания инструментов для агентов

### Фаза 6: Обновление SceneAPI и обзора сцены
**Статус: Выполнено**
[Подробности фазы 6](phases/phase_6_summary.md)

Добавить информацию о BoundingBox в API сцены:
1. Обновить `SceneObjectInfo` в `src/features/scene/lib/sceneAPI.ts` для включения BoundingBox информации
2. Обновить `getSceneOverview()` для передачи BoundingBox данных агентам

### Фаза 7: Дополнительно
**Статус: Не выполнено**

1. Добавить методы для пространственных запросов (поиск объектов в области)
2. В постобработке добавить проверки коллизий и оптимальное размещение объектов на основе BoundingBox

### Фаза 8: документация
**Статус: Не выполнено**

Обновить документацию:
1. Обновить документацию API в `docs/api/types/README.md`
2. Добавить в документацию информацию о хранении и пересчете BoundingBox объекта

## Примечания по реализации

- Следовать принципам архитектуры Feature-Sliced Design
- BoundingBox должен пересчитываться автоматически и не требовать ручного вмешательства
- Учесть производительность при частых пересчетах BoundingBox 
- Сохранить обратную совместимость с существующим кодом
- BoundingBox должен учитывать все трансформации объекта и его примитивов

## Связанные файлы

- [Design Principles](../../docs/architecture/design-principles.md) - Архитектурные принципы
- [LLM Integration](../../docs/features/ai-integration/llm-integration.md) - Интеграция AI агента
