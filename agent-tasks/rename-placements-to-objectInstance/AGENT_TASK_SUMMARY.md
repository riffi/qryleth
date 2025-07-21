# Агентская задача: Переименование "placement" в "objectInstance"

## Описание задачи
Необходимо переименовать термин "placement" в "objectInstance" во всей кодовой базе для обеспечения единообразной терминологии. Термин "placement" используется для обозначения экземпляров объектов в сцене, что должно соответствовать термину "objectInstance".

При выполнении каждой фазы следует сверяться с требованиями [AGENT_TASKS.md](../../docs/AGENT_TASKS.md).

## Анализ использований термина "placement"

### Файлы спецификации (2 файла):
1. **spec/store.md:8** - `placements: SceneObjectInstance[]` → `objectInstances: SceneObjectInstance[]`
2. **spec/sceneeditor.md:24** - `placements` → `objectInstances`

### Код (18 файлов):

#### Основные типы и интерфейсы:
1. **src/entities/r3f/types.ts** (7 вхождений):
   - `placementIndex?: number` → `objectInstanceIndex?: number` (в интерфейсах SelectedObject, HoveredObject, SceneClickEvent, SceneHoverEvent, TransformEvent)
   - `placements: SceneObjectInstance[]` → `objectInstances: SceneObjectInstance[]`
   - `setPlacements: (placements: ScenePlacement[]) => void` → `setObjectInstances: (objectInstances: ScenePlacement[]) => void`
   - `addPlacement: (placement: ScenePlacement) => void` → `addObjectInstance: (objectInstance: ScenePlacement) => void`

2. **src/entities/scene/types.ts:7** - комментарий `Controls visibility of all placements` → `Controls visibility of all object instances`

#### Основной стор:
3. **src/features/scene/store/sceneStore.ts** (множественные вхождения):
   - Поле `placements` → `objectInstances`
   - Все связанные методы: `setPlacements`, `addPlacement`, `updatePlacement`, `removePlacement`
   - Все ссылки на `state.placements`

4. **src/features/scene/store/optimizedSelectors.ts**:
   - `useScenePlacementsOptimized` → `useSceneObjectInstancesOptimized`
   - Все селекторы, работающие с placements

#### Хуки и логика:
5. **src/hooks/r3f/useKeyboardShortcuts.ts** (множественные вхождения):
   - `placements` переменная → `objectInstances`
   - `placement` локальная переменная → `objectInstance`
   - `newPlacement` → `newObjectInstance`
   - `selectedObject.placementIndex` → `selectedObject.objectInstanceIndex`
   - `updatePlacement` → `updateObjectInstance`

6. **src/hooks/r3f/useUISync.ts** (6 вхождений):
   - `placements` переменная → `objectInstances`
   - `placementCount` → `objectInstanceCount`

7. **src/hooks/r3f/useObjectSelection.ts** (2 вхождения):
   - `placementUuid` → `objectInstanceUuid`

8. **src/hooks/r3f/useSceneEvents.ts** (4 вхождения):
   - `placementUuid` → `objectInstanceUuid`
   - `placementIndex` → `objectInstanceIndex`

#### UI компоненты:
9. **src/features/scene/ui/SceneEditorR3F.tsx**
10. **src/features/scene/ui/ObjectManager.tsx**
11. **src/features/object-editor/r3f/controls/ObjectTransformGizmo.tsx**
12. **src/features/scene/controls/TransformGizmo.tsx**
13. **src/features/scene/objects/CompositeObject.tsx**
14. **src/features/scene/objects/SceneObjects.tsx**
15. **src/features/scene/optimization/OptimizedComponents.tsx**

#### Утилиты:
16. **src/shared/r3f/optimization/InstancedObjects.tsx**
17. **src/shared/lib/openAIAPI.ts**
18. **src/shared/lib/systemPrompt.ts**

## План выполнения

### Этап 1: Базовые типы и интерфейсы
1. Обновить `src/entities/r3f/types.ts`:
   - `placementIndex` → `objectInstanceIndex`
   - `placements` → `objectInstances` 
   - Методы `setPlacements`, `addPlacement` и т.д.

2. Обновить `src/entities/scene/types.ts`:
   - Комментарий о placements

### Этап 2: Основной стор
3. Обновить `src/features/scene/store/sceneStore.ts`:
   - Поле `placements` → `objectInstances`
   - Все методы работы с размещениями
   - Все внутренние ссылки

4. Обновить `src/features/scene/store/optimizedSelectors.ts`:
   - Селекторы и хуки

### Этап 3: Хуки – Выполнено
5. Обновить `src/hooks/r3f/useKeyboardShortcuts.ts`
6. Обновить `src/hooks/r3f/useUISync.ts`
7. Обновить `src/hooks/r3f/useObjectSelection.ts`
8. Обновить `src/hooks/r3f/useSceneEvents.ts`
Подробности см. в [phases/phase_3_summary.md](phases/phase_3_summary.md).

### Этап 4: UI компоненты – Выполнено
9. Обновить все компоненты в `src/features/scene/ui/`
10. Обновить все компоненты в `src/features/object-editor/`
11. Обновить все компоненты в `src/features/scene/controls/`
12. Обновить все компоненты в `src/features/scene/objects/`
13. Обновить оптимизационные компоненты
Подробности см. в [phases/phase_4_summary.md](phases/phase_4_summary.md).

### Этап 5: Утилиты и API
14. Обновить `src/shared/r3f/optimization/InstancedObjects.tsx`
15. Обновить `src/shared/lib/openAIAPI.ts`
16. Обновить `src/shared/lib/systemPrompt.ts`

### Этап 6: Документация
17. Обновить `spec/store.md`
18. Обновить `spec/sceneeditor.md`

## Критерии готовности
- [ ] Все вхождения "placement" заменены на "objectInstance"
- [ ] Код компилируется без ошибок
- [ ] Все типы корректно обновлены
- [ ] Документация обновлена
- [ ] Проведено тестирование основных сценариев

## Риски и предостережения
1. **Совместимость**: Убедиться, что не сломана существующая функциональность
2. **Типизация**: Следить за корректностью TypeScript типов
3. **Сохраненные данные**: Проверить, не влияет ли переименование на формат сохраненных сцен
4. **Последовательность**: Переименования должны быть согласованными во всей кодовой базе

## Примечания
- В некоторых местах могут использоваться сокращения типа `placementIdx` → `objectInstanceIdx`
- Нужно учесть множественное число: `placements` → `objectInstances`
- В camelCase: `placementIndex` → `objectInstanceIndex`
- В интерфейсах: `addPlacement` → `addObjectInstance`

## Ход выполнения

### Этап 1: Базовые типы и интерфейсы – Выполнено
- Переименованы ключевые поля и методы в `src/entities/r3f/types.ts`.
- Обновлён комментарий в `src/entities/scene/types.ts`.
- Для совместимости на время миграции сохранены устаревшие поля и методы.
- Подробности см. в [phases/phase_1_summary.md](phases/phase_1_summary.md).

### Этап 2: Основной стор – Выполнено
- Добавлено поле `objectInstances` и методы работы с ним в сторе сцены.
- Устаревшие `placements` и связанные функции сохраняют совместимость.
- Обновлены селекторы и оптимизированные хуки.
- Подробности см. в [phases/phase_2_summary.md](phases/phase_2_summary.md).
