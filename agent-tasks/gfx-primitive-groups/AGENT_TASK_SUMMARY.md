# Агентская задача: Группировка примитивов GfxObject

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../docs/development/workflows/agent-tasks.md)
**ВАЖНО**: При выполнении каждой из фаз необходимо обязательно сверяться с требованиями и принципами из указанного файла.

## Контекст задачи

В настоящее время в GfxObject примитивы хранятся в обычном массиве `primitives: GfxPrimitive[]`. Это создает ограничения для пользователей, которые хотят логически группировать примитивы для удобства работы с большими и сложными объектами.

**Важный use case**: В будущем планируется реализация импорта объектов из библиотеки внутрь текущего редактируемого объекта. При импорте объекта (например, "дом") должна создаваться группа примитивов, и туда копироваться все примитивы из импортируемого объекта. Если импортируемый объект уже содержит группы (например, "фундамент", "стены", "крыша"), то эта иерархическая структура должна сохраняться внутри созданной группы импорта. Это требует **иерархической**, а не плоской структуры групп.

### Текущая структура GfxObject

```typescript
export interface GfxObject {
  uuid: string;
  name: string;
  primitives: GfxPrimitive[];
  materials?: GfxMaterial[];
  boundingBox?: BoundingBox;
}
```

### Анализ существующих компонентов

**PrimitiveManager** (`src/features/object-editor/ui/PrimitiveManager/PrimitiveManager.tsx`):
- Отображает плоский список примитивов
- Поддерживает выделение, скрытие/показ, удаление примитивов
- Работает с индексами примитивов в массиве

**ObjectScenePrimitives** (`src/features/object-editor/ui/renderer/objects/ObjectScenePrimitives.tsx`):
- Рендерит примитивы через map по массиву
- Обрабатывает клики и передает индексы примитивов

**Tools системы**:
- objectEditor имеет tools в `src/features/object-editor/lib/ai/tools/objectTools.ts`
- sceneEditor имеет tools в `src/features/scene/lib/ai/tools/objectTools.ts`

## Цели задачи

1. **Реализовать опциональную группировку примитивов** - возможность создания групп и добавления в них примитивов
2. **Иерархическая структура групп** - поддержка вложенных групп для импорта объектов с существующими группами
3. **Интеграция с tools** - поддержка группировки в sceneEditor и objectEditor tools
4. **Обновление рендеринга** - учет группировки при рендеринге в обоих редакторах
5. **Расширение PrimitiveManager** - UI для управления группами
6. **UUID и имена групп** - каждая группа должна иметь uuid и name

## Планируемая структура данных

**ВАЖНЫЕ АРХИТЕКТУРНЫЕ РЕШЕНИЯ** (на основе замечаний от другого агента):

1. **UUID примитивов обязательны** - поле uuid в GfxPrimitive делается обязательным для надежной индексации
2. **Группировка по UUID** - вместо индексов используем primitiveUuid → groupUuid 
3. **Record для групп** - группы хранятся как Record<uuid, PrimitiveGroup> для эффективного доступа
4. **Стратегия конфликтов** - четкие правила для разрешения конфликтов имен и UUID при импорте

```typescript
// Обновленный интерфейс с обязательным UUID
export interface GfxPrimitive {
  uuid: string;        // 🆕 ОБЯЗАТЕЛЬНОЕ поле
  type: PrimitiveType;
  geometry: any;
  material?: string;
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
  visible?: boolean;
}

export interface GfxPrimitiveGroup {
  uuid: string;
  name: string;
  visible?: boolean;
  // Поддержка иерархии - ссылка на родительскую группу
  parentGroupUuid?: string;
  // Дополнительные свойства для импортированных групп
  sourceObjectUuid?: string; // UUID исходного объекта при импорте
}

export interface GfxObject {
  uuid: string;
  name: string;
  primitives: GfxPrimitive[];
  // Новые опциональные поля
  primitiveGroups?: Record<string, GfxPrimitiveGroup>; // 🔄 uuid -> GfxPrimitiveGroup
  // Привязка примитивов к группам по UUID
  primitiveGroupAssignments?: Record<string, string>; // 🔄 primitiveUuid -> groupUuid
  materials?: GfxMaterial[];
  boundingBox?: BoundingBox;
}
```

## Стратегии разрешения конфликтов

### Конфликты UUID при импорте:
- **Примитивы**: Всегда генерируем новые UUID для импортируемых примитивов
- **Группы**: Всегда генерируем новые UUID для импортируемых групп
- **Связи**: Обновляем все ссылки parentGroupUuid и primitiveGroupAssignments

### Конфликты имен при импорте:
- **Группы**: Добавляем суффикс " (импорт N)" где N - порядковый номер
- **Логика проверки**: Проверяем существование имени перед созданием группы

## Генерация UUID и управление идентификаторами

### Централизованная генерация UUID:
- **Примитивы**, **Группы**: `generateUUID` в `src/shared/lib/uuid.ts`

### Миграция существующих данных:
- **Примитивы без UUID**: Автоматическое присвоение UUID при загрузке
- **Обратная совместимость**: Поддержка объектов без групп
- **Валидация**: Проверка уникальности UUID при импорте

## План выполнения задачи по фазам

### Фаза 1: Расширение типов и моделей данных
**Статус**: ✅ Выполнено
**Отчет**: [phase_1_summary.md](phases/phase_1_summary.md)

**Описание**: Расширить интерфейсы для поддержки групп примитивов с обязательными UUID и эффективным хранением.

**Детальные действия**:
- **Обновить GfxPrimitive**: Сделать поле `uuid` обязательным
- **Создать PrimitiveGroup**: Интерфейс с полями uuid, name, visible, parentGroupUuid, sourceObjectUuid
- **Обновить GfxObject**: Добавить `primitiveGroups` как Record<string, GfxPrimitiveGroup> и `primitiveGroupAssignments` как Record<string, string>
- **Утилиты для групп**: Функции для работы с иерархией, поиска, создания дерева
- **Утилиты для импорта**: Функции разрешения конфликтов UUID и имен
- **Генерация UUID**: Централизованная логика создания UUID для примитивов и групп

**Критерии успешности**:
✅ GfxPrimitive.uuid - обязательное поле
✅ Утилита `buildGroupTree(groups)` возвращает иерархическое дерево
✅ Утилита `findGroupChildren(groupUuid, groups)` возвращает дочерние группы
✅ Утилита `resolveImportConflicts(object, targetObject)` разрешает конфликты
✅ Утилита `generateUUID()` создает уникальные ID

**Файлы для изменения**:
- `src/entities/object/model/types.ts`
- `src/entities/primitive/model/types.ts`
- `src/entities/primitiveGroup/` (новая entity)


### Фаза 2: Обновление objectStore для поддержки групп
**Статус**: ✅ Выполнено
**Отчет**: [phase_2_summary.md](phases/phase_2_summary.md)

**Описание**: Расширить zustand store объект-редактора для управления группами примитивов с надежной индексацией по UUID.

**Детальные действия**:
- **Состояние групп**: Добавить selectedGroupUuids: string[] вместо индексов
- **Actions для групп**: createGroup, deleteGroup, renameGroup, createSubGroup
- **Actions для привязки**: assignPrimitiveToGroup, removePrimitiveFromGroup (по UUID)
- **Actions для иерархии**: moveGroup, getGroupHierarchy
- **Action импорта**: importObjectAsGroup с разрешением конфликтов
- **Селекторы**: getPrimitivesInGroup, getGroupTree, getRootGroups, getGroupDepth
- **Миграция данных**: Обновить существующие селекторы для работы с UUID

**Критерии успешности**:
✅ Селектор `useGroupTree()` возвращает иерархическое дерево групп
  ✅ Селектор `useGroupPrimitives(groupUuid)` возвращает примитивы группы без лишних перерендеров
✅ Action `createGroup(name, parentUuid?)` создает группу с правильным UUID
✅ Action `assignPrimitiveToGroup(primitiveUuid, groupUuid)` корректно привязывает
✅ Action `importObjectAsGroup(object, name)` импортирует с разрешением конфликтов
✅ Селектор `useSelectedGroupUuids()` работает вместо индексов

**Файлы для изменения**:
- `src/features/object-editor/model/objectStore.ts`

### Фаза 3: Расширение UI PrimitiveManager для групп  
**Статус**: ✅ Выполнено
**Отчет**: [phase_3_summary.md](phases/phase_3_summary.md)

**Описание**: Создать древовидный интерфейс для управления иерархическими группами примитивов с drag-and-drop функциональностью.

**Детальные действия**:
- **PrimitiveGroupItem**: Компонент группы с expand/collapse, индикатором импорта
- **Древовидная структура**: Рекурсивное отображение иерархии групп
- **Drag-and-drop**: Перемещение примитивов и групп между группами
- **Контекстное меню**: Создать группу/подгруппу, переименовать, удалить
- **Индикация**: Визуальные индикаторы для импортированных групп
- **Выделение**: Поддержка множественного выбора групп и примитивов
- **GroupNameModal**: Модальное окно для создания и переименования групп

**Критерии успешности**:
✅ Древовидная структура корректно отображает иерархию групп  
✅ Drag-and-drop перемещает примитивы между группами без потери данных
✅ Контекстное меню создает подгруппы с правильным parentGroupUuid
✅ Collapse/expand работает для каждого уровня иерархии
✅ Индикатор "импорт" отображается для групп, у которых sourceObjectUuid не пустой
✅ Множественное выделение работает по Ctrl+Click и Shift+Click

**Файлы для изменения**:
- `src/features/object-editor/ui/PrimitiveManager/PrimitiveManager.tsx`
- `src/features/object-editor/ui/PrimitiveManager/PrimitiveGroupItem.tsx` (новый)
- `src/features/object-editor/ui/PrimitiveManager/PrimitiveItem.tsx`
- `src/features/object-editor/ui/PrimitiveManager/GroupNameModal.tsx` (новый)

### Фаза 4: Обновление рендеринга и трансформации в ObjectEditor
**Статус**: ✅ Выполнено
**Отчет**: [phase_4.1_summary.md](phases/phase_4.1_summary.md)

**Описание**: Реализовать рекурсивное рендеринг иерархических групп через вложенные Three.js `<group>` компоненты с поддержкой трансформации через gizmo controls.

**Подфаза 4.1: Рекурсивное рендеринг групп** - ✅ Выполнено
- **Рекурсивный компонент**: `GroupRenderer` для отображения группы и её подгрупп
- **Структура `<group>`**: Каждая группа = отдельный `<group>` Three.js Fiber элемент
- **Видимость**: Наследование `visible` от родительских групп к дочерним
- **userData**: Передача groupUuid в userData для обработки кликов
- **Примитивы вне групп**: Рендеринг на верхнем уровне для обратной совместимости
- **Селектор дочерних групп**: `useGroupChildren` возвращает только прямых потомков, предотвращая дублирование и бесконечные циклы
  - **Селектор примитивов группы**: `useGroupPrimitives` использует независимые подписки и мемоизирует список примитивов с индексами, что устраняет предупреждение `getSnapshot` и бесконечный перерендер

**Подфаза 4.2: Система координат** - ✅ Выполнено
- **Относительные координаты**: Примитивы всегда хранят относительные координаты в существующих полях `position/rotation/scale`
- **Автоматические трансформации**: Three.js `<group>` элементы автоматически применяют иерархические трансформации (уже работает благодаря рекурсивному GroupRenderer)
- **Утилиты для перемещения между группами**:  создать  `coordinateUtils.ts`:
  - `moveprimitiveToGroup(primitiveUuid, fromGroupUuid, toGroupUuid)` - пересчитывает координаты при drag-and-drop
  - `calculateGroupBounds(groupUuid)` - для расчета pivot point группы
  - добавить в GfxPrimitiveGroup свойство  `transform?: {
    position?: Vector3;
    rotation?: Vector3;
    scale?: Vector3;
    };`

**Подфаза 4.3: Pivot Point и Gizmo Controls** ✅ Выполнено
- **Динамический pivot для групп**: Расчет геометрического центра группы с помощью `calculateGroupBounds(groupUuid)` для позиционирования gizmo
- **Расширение PrimitiveTransformGizmo**: 
  - Добавить поддержку трансформации групп через новый проп `selectedGroupUuids?: string[]`
  - При выделении группы в primitivemanager показывать gizmo на геометрическом центре всех примитивов группы
- **Обновление objectStore**: 
  - Добавить селектор `useSelectedItemType()` возвращающий `'primitive' | 'group' | 'mixed'` 
  - Добавить action `setTransformMode(mode: 'primitive' | 'group')` для переключения режимов
- **Создание GroupControlPanel**: Аналог PrimitiveControlPanel для управления трансформациями групп:
  - **Показ панели**: Отображается при выделении одной группы (selectedGroupUuids.length === 1)
  - **Интерфейс как у PrimitiveControlPanel**: Те же блоки Position/Rotation/Scale с полями X/Y/Z
  - **Логика трансформации**: Изменения применяются к свойству transform GfxPrimitiveGroup 
  - **Интеграция в UI**: Показывать GroupControlPanel вместо PrimitiveControlPanel когда выделена группа
  - **Отображение значений**: Показывать значения свойства transform GfxPrimitiveGroup

**Подфаза 4.4: Обработка взаимодействий** - ✅ Выполнено
**Отчет**: [phase_4.4_summary.md](phases/phase_4.4_summary.md)
- **Обработка кликов по группам**: Расширить обработчик в ObjectScenePrimitives:
  - При клике на примитив проверять `userData.groupUuid` и определять нужно ли выделить группу или примитив
  - Логика: Ctrl+Click на примитив = выделить группу, обычный клик = выделить примитив
  - Добавить в objectStore: `selectGroup(groupUuid)`, `toggleGroupSelection(groupUuid)`
- **Drag-and-drop между группами**: Обновить PrimitiveManager:
  - При перемещении примитива между группами вызывать `movePrimitiveToGroup()` для пересчета координат
  - Обновить обработчики onDrop для работы с групповой иерархией
- **Интеграция с gizmo**: Обновить PrimitiveTransformGizmo:
  - Слушать изменения `selectedGroupUuids` и `selectedItemType`  
  - При трансформации группы  изменения применять к свойству transform GfxPrimitiveGroup
  - Сохранять относительные позиции примитивов внутри группы

**Критерии успешности**:
✅ Группы рендерятся как вложенные `<group>` элементы
✅ Относительные координаты примитивов работают автоматически через Three.js иерархию
✅ Gizmo позиционируется на pivot point группы при выборе группы  
✅ Перемещение примитивов между группами сохраняет их мировые координаты
✅ Поддержка трансформации единичного примитива и группы примитивов
✅ Скрытие родительской группы скрывает все дочерние элементы
✅ Клик по примитиву в группе передает правильный groupUuid в userData
✅ Объекты без групп рендерятся как раньше (обратная совместимость)
✅ Рекурсия корректно обрабатывает группы любой глубины вложенности
✅ Селекторы корневых и дочерних групп мемоизированы, что исключает бесконечный перерендер

**Файлы для изменения**:
- `src/features/object-editor/ui/renderer/objects/ObjectScenePrimitives.tsx` (обработка кликов)
- `src/features/object-editor/ui/renderer/objects/GroupRenderer.tsx` (уже создан)
- `src/features/object-editor/ui/renderer/controls/PrimitiveTransformGizmo.tsx` (поддержка групп)
- `src/features/object-editor/ui/GroupControlPanel/GroupControlPanel.tsx` (новый) - панель управления группами
- `src/features/object-editor/model/objectStore.ts` (селекторы и actions для групп)
- `src/entities/primitiveGroup/lib/coordinateUtils.ts` (новый) - утилиты координат
- `src/features/object-editor/ui/PrimitiveManager/PrimitiveManager.tsx` (drag-and-drop координат)


### Фаза 5: Обновление рендеринга в SceneEditor
**Статус**: ✅ Выполнено
**Отчет**: [phase_5_summary.md](phases/phase_5_summary.md)

**Описание**: Обновить рендеринг объектов в сцен-редакторе для поддержки новой структуры групп примитивов с иерархическим отображением.

**Детальные действия**:
- **Обновление SceneObjectRenderer**: Адаптировать рендеринг примитивов с учетом групп
- **Иерархическое отображение**: Реализовать рекурсивное рендеринг групп в контексте сцены
- **Интеграция с GroupRenderer**: Переиспользовать компонент GroupRenderer из objectEditor
- **userData для групп**: Обеспечить правильную передачу groupUuid в userData для обработки кликов в сцене
- **Обратная совместимость**: Сохранить работу объектов без групп
- **Производительность**: Не ухудшить производительность рендеринга сцены с множественными объектами

**Критерии успешности**:
✅ Объекты с группами корректно отображаются в сцен-редакторе
✅ Иерархическая структура групп сохраняется при рендеринге в сцене
✅ Клики по примитивам в группах правильно обрабатываются
✅ Относительные координаты примитивов работают через Three.js иерархию
✅ Объекты без групп продолжают работать как раньше
✅ Производительность рендеринга сцены не ухудшилась
✅ Видимость групп корректно наследуется в контексте сцены
✅ MemoizedSceneObject правильно обрабатывает объекты с группами

**Файлы для изменения**:
- `src/features/scene/ui/renderer/objects/SceneObjectRenderer.tsx`
- `src/features/scene/ui/renderer/optimization/OptimizedComponents.tsx` (обновить мемоизацию)
- Возможное переиспользование `src/features/object-editor/ui/renderer/objects/GroupRenderer.tsx`

### Фаза 6: Обновление objectEditorApi и tools
**Статус**: ✅ Выполнено
**Отчет**: [phase_6_summary.md](phases/phase_6_summary.md)

#### Обновление objectEditorApi
**Описание**: Расширить API объект-редактора для поддержки операций с группами.

**Детальные действия**:
✅ Обеспечить правильную интеграцию с tools системой
✅ Обновить существующие API методы с учетом групп:
  ✅ выводить информацию о группах в getObjectData (добавлены primitiveGroups и primitiveGroupAssignments)
  ✅ addPrimitives - обновить для опциональной возможности создания новых групп при добавлении примитивов и привязки добавляемых примитивов к создаваемым группам

**Файлы для изменения**:
✅ `src/features/object-editor/lib/objectEditorApi.ts`

#### Расширение tools для objectEditor

**Описание**: Обновить AI tools для управления учета групп примитивов в объект-редакторе.

**Детальные действия**:
✅ Обновить tool `getObjectDataTool` с учетом новой структуры (автоматически через обновленный API)
✅ Обновить tool `addPrimitivesTool` для опциональной возможности создания новых групп при добавлении примитивов и привязки добавляемых примитивов к создаваемым группам

**Файлы для изменения**:
✅ `src/features/object-editor/lib/ai/tools/objectTools.ts` (без изменений - tool автоматически получил поддержку групп)
✅ `src/features/object-editor/lib/ai/tools/primitiveTools.ts`


### Фаза 7: Расширение tools для sceneEditor
**Статус**: Не выполнено

**Описание**: Добавить AI tools для работы с группами примитивов в сцен-редакторе.

**Детальные действия**:
- Обновить существующие object tools с поддержкой иерархических групп
- Убедиться что создание объектов через AI правильно обрабатывает группы
- Добавить возможность AI создавать объекты с предустановленными иерархическими группами

**Файлы для изменения**:
- `src/features/scene/lib/ai/tools/objectTools.ts`




### Фаза 8: Обновление документации
**Статус**: Не выполнено

**Описание**: Обновить проектную документацию с учетом новой функциональности группировки примитивов.

**Детальные действия**:
- Обновить API документацию
- Добавить примеры использования иерархических групп примитивов
- Документировать процесс импорта объектов как групп
- Обновить архитектурную документацию

**Файлы для изменения**:
- `docs/api/types/README.md`  
- `docs/features/object-editing/README.md`
- Возможно другие файлы документации

## Принципы реализации

1. **Обратная совместимость**: Объекты без групп должны продолжать работать как раньше
2. **Иерархическая структура**: Поддержка вложенных групп для импорта объектов с сохранением структуры
3. **Производительность**: Группировка не должна значительно влиять на производительность рендеринга
4. **FSD архитектура**: Следовать принципам Feature-Sliced Design
5. **Type Safety**: Все новые интерфейсы должны быть типизированы
6. **Консистентность**: UI и UX должны быть консистентны с существующими компонентами

## Связанные файлы и документация

- [Design Principles](../../docs/architecture/design-principles.md) - Архитектурные принципы
- [Object Editing Documentation](../../docs/features/object-editing/README.md) - Документация по редактированию объектов
- [Types Documentation](../../docs/api/types/README.md) - Документация по типам API

## Примечания

- Каждая фаза должна быть реализована так, чтобы приложение собиралось и работало корректно
- При возникновении необходимости изменения более 15 файлов в одной фазе, следует разбить фазу на более мелкие
- Тестирование изменений должно проводиться после каждой фазы
