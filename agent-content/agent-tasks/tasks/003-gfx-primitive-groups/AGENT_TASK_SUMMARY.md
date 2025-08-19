---
id: 3
epic: null
title: Группировка примитивов GfxObject
status: done
created: 2025-08-07
updated: 2025-08-08
tags: [gfx, primitives, groups, ui, refactor]
phases:
  total: 8
  completed: 8
---

# Группировка примитивов GfxObject

## Обязательная информация
!Правила работы с агентскими задачами: [agent-tasks.md](../../../../docs/development/workflows/agent-tasks.md)
**ВАЖНО**: При выполнении каждой из фаз необходимо обязательно сверяться с требованиями и принципами из указанного файла.

### Цели

1. **Реализовать опциональную группировку примитивов** - возможность создания групп и добавления в них примитивов
2. **Иерархическая структура групп** - поддержка вложенных групп для импорта объектов с существующими группами
3. **Интеграция с tools** - поддержка группировки в sceneEditor и objectEditor tools
4. **Обновление рендеринга** - учет группировки при рендеринге в обоих редакторах
5. **Расширение PrimitiveManager** - UI для управления группами
6. **UUID и имена групп** - каждая группа должна иметь uuid и name

## Контекст

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



## Список фаз

### ✅ Фаза 1: Расширение типов и моделей данных
- Расширены интерфейсы примитивов и добавлен тип группы
**Отчёт**: [phases/phase_1_summary.md](phases/phase_1_summary.md)

### ✅ Фаза 2: Обновление objectStore для поддержки групп
- Добавлены структуры данных и действия для групп
**Отчёт**: [phases/phase_2_summary.md](phases/phase_2_summary.md)

### ✅ Фаза 3: Расширение UI PrimitiveManager для групп
- Реализован интерфейс управления иерархией групп
**Отчёт**: [phases/phase_3_summary.md](phases/phase_3_summary.md)

### ✅ Фаза 4.1: Рекурсивное рендеринг групп
- Добавлен компонент GroupRenderer и обновлён ObjectScenePrimitives
**Отчёт**: [phases/phase_4.1_summary.md](phases/phase_4.1_summary.md)

### ✅ Фаза 4.2: Система координат
- Добавлены трансформации и утилиты для групп
**Отчёт**: [phases/phase_4.2_summary.md](phases/phase_4.2_summary.md)

### ✅ Фаза 4.3: Pivot Point и Gizmo Controls
- Реализована поддержка pivot point и gizmo для групп
**Отчёт**: [phases/phase_4.3_summary.md](phases/phase_4.3_summary.md)

### ✅ Фаза 4.4: Обработка взаимодействий
- Обработаны клики и drag-and-drop для групп
**Отчёт**: [phases/phase_4.4_summary.md](phases/phase_4.4_summary.md)

### ✅ Фаза 5: Обновление рендеринга в SceneEditor
- Добавлен SceneGroupRenderer и поддержка иерархий
**Отчёт**: [phases/phase_5_summary.md](phases/phase_5_summary.md)

### ✅ Фаза 6: Обновление objectEditorApi и tools
- API и AI инструменты поддерживают группы
**Отчёт**: [phases/phase_6_summary.md](phases/phase_6_summary.md)

### ✅ Фаза 7: Расширение tools для sceneEditor
- Добавлены схемы и инструменты для групп в сцен-редакторе
**Отчёт**: [phases/phase_7_summary.md](phases/phase_7_summary.md)

### ✅ Фаза 8: Обновление основной проектной документации docs
- Документация обновлена с примерами групп
**Отчёт**: [phases/phase_8_summary.md](phases/phase_8_summary.md)
