# Агентская задача: Рефакторинг типов GfxPrimitive

## Ссылка на инструкции
При выполнении каждой фазы обязательно сверяйся с требованиями в [agent-tasks.md](../../docs/development/workflows/agent-tasks.md)

## Контекст задачи

[gfx_primitive_refactor_plan.md](../../docs/architecture/gfx_primitive_refactor_plan.md)

### Текущая проблема
Сейчас все геометрические параметры хранятся на верхнем уровне `GfxPrimitive`, что создает следующие проблемы:
- У каждого примитива множество `undefined` полей для параметров других примитивов
- Сложность в работе с типами для AI-ассистента
- Отсутствие строгой типизации для специфичных геометрических параметров

### Текущая структура типов (src/entities/primitive/model/types.ts:3-25)
```typescript
export interface GfxPrimitive {
  type: 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'plane' | 'torus';
  name?: string;
  width?: number;        // для box, plane
  height?: number;       // для box, cylinder, cone, pyramid, plane
  depth?: number;        // для box
  radius?: number;       // для sphere, cone
  radiusTop?: number;    // для cylinder
  radiusBottom?: number; // для cylinder
  radialSegments?: number; // для cylinder, cone, torus
  tubularSegments?: number; // для torus
  majorRadius?: number;  // для torus
  minorRadius?: number;  // для torus
  baseSize?: number;     // для pyramid
  // материал и трансформации
  color?: string;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
}
```

### Целевая структура
Дискриминированное объединение с выделенной геометрией для каждого типа примитива и общими свойствами.

## Анализ затрагиваемых файлов

### Основные файлы типов:
- `src/entities/primitive/model/types.ts` - определение типов
- `src/features/scene/lib/ai/tools/objectTools.ts` - Zod схемы для AI

### Рендереры (7 файлов):
- `src/shared/r3f/primitives/PrimitiveRenderer.tsx` - главный рендерер
- `src/shared/r3f/primitives/Box3D.tsx` - рендерер куба
- `src/shared/r3f/primitives/Cylinder3D.tsx` - рендерер цилиндра
- `src/shared/r3f/primitives/Torus3D.tsx` - рендерер тора
- И другие примитивы (Sphere3D, Cone3D, Pyramid3D, Plane3D)

### Прочие файлы:
- `src/entities/primitive/model/icons.ts` - иконки примитивов
- `src/entities/primitive/model/names.ts` - имена примитивов
- Редакторы и хранилища

---

## План выполнения по фазам

### Фаза 1: Создание новых интерфейсов типов 
**Статус**: Выполнено ✅  
**Описание**: Создать новые интерфейсы геометрии и дискриминированное объединение  
**Файлы**: `src/entities/primitive/model/types.ts`  
**Ссылка**: [phase_1_summary.md](phases/phase_1_summary.md)

**Результат**: Созданы интерфейсы геометрии для всех 7 типов примитивов (BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, PyramidGeometry, PlaneGeometry, TorusGeometry), интерфейс PrimitiveCommon с общими свойствами (material, transform), и дискриминированное объединение GfxPrimitive. Сохранен LegacyGfxPrimitive для обратной совместимости.

### Фаза 2: Обновление Zod-схем для AI-инструментов 
**Статус**: Выполнено ✅  
**Описание**: Обновить PrimitiveSchema в objectTools.ts с использованием discriminatedUnion  
**Файлы**: `src/features/scene/lib/ai/tools/objectTools.ts`  
**Ссылка**: [phase_2_summary.md](phases/phase_2_summary.md)

**Результат**: Созданы отдельные Zod-схемы для каждого типа геометрии (BoxGeometrySchema, SphereGeometrySchema, и т.д.), обновлена PrimitiveSchema для использования дискриминированного объединения. AI-инструменты теперь работают со строгой типизацией и новой структурой данных `{ type, geometry, material, transform }`.

### Фаза 3: Рефакторинг основного рендерера 
**Статус**: Выполнено ✅  
**Описание**: Обновить PrimitiveRenderer.tsx для работы с новой структурой типов  
**Файлы**: `src/shared/r3f/primitives/PrimitiveRenderer.tsx`  
**Ссылка**: [phase_3_summary.md](phases/phase_3_summary.md)

**Результат**: Обновлен основной рендерер для работы с новой структурой данных. Материальные свойства теперь читаются из `primitive.material.*`, трансформационные свойства из `primitive.transform.*`. Проект успешно компилируется. Подготовлена основа для рефакторинга дочерних рендереров в следующих фазах.

### Фаза 4: Рефакторинг рендереров примитивов (Часть 1) 
**Статус**: Выполнено ✅  
**Описание**: Обновить Box3D, Sphere3D, Plane3D для чтения геометрии из primitive.geometry  
**Файлы**: 
- `src/shared/r3f/primitives/Box3D.tsx`
- `src/shared/r3f/primitives/Sphere3D.tsx`
- `src/shared/r3f/primitives/Plane3D.tsx`  
**Ссылка**: [phase_4_summary.md](phases/phase_4_summary.md)

**Результат**: Обновлены первые три рендерера примитивов (Box3D, Sphere3D, Plane3D) для работы с новой структурой типов. Каждый рендерер теперь проверяет тип примитива и читает геометрические параметры из `primitive.geometry`. Добавлены проверки типов для безопасности и лучшей отладки. Проект успешно компилируется.

### Фаза 5: Рефакторинг рендереров примитивов (Часть 2)
**Статус**: Выполнено ✅
**Описание**: Обновить Cylinder3D, Cone3D, Pyramid3D, Torus3D для чтения геометрии из primitive.geometry
**Файлы**:
- `src/shared/r3f/primitives/Cylinder3D.tsx`
- `src/shared/r3f/primitives/Cone3D.tsx`
- `src/shared/r3f/primitives/Pyramid3D.tsx`
- `src/shared/r3f/primitives/Torus3D.tsx`
**Ссылка**: [phase_5_summary.md](phases/phase_5_summary.md)

**Результат**: Выполнен рефакторинг оставшихся рендереров примитивов. Все компоненты проверяют тип примитива и используют параметры из `primitive.geometry`. Проект продолжает успешно компилироваться.

### Фаза 6: Обновление утилит и хелперов
**Статус**: Выполнено ✅
**Описание**: Обновить icons.ts, names.ts для работы с новыми типами
**Файлы**:
- `src/entities/primitive/model/icons.ts`
- `src/entities/primitive/model/names.ts`
**Ссылка**: [phase_6_summary.md](phases/phase_6_summary.md)

### Фаза 7: Обновление хранилищ и API
**Статус**: Выполнено ✅
**Описание**: Обновить хранилища и API для работы с новыми типами
**Файлы**:
- `src/features/object-editor/model/objectStore.ts`
- `src/features/scene/lib/sceneAPI.ts`
- `src/features/scene/lib/correction/LLMGeneratedObjectCorrector.ts`
**Ссылка**: [phase_7_summary.md](phases/phase_7_summary.md)

### Фаза 8: Доработка cad2qryleth converter
**Статус**: Запланирована  
**Описание**: Доработать  [converter.py](../../cad2qryleth/converter.py) согласно новой структуре данных
**Файлы**: Все измененные файлы

### Фаза 9: Доработка документации
**Статус**: Запланирована  
**Описание**: 
- Описать в документации принцип работы [converter.py](../../cad2qryleth/converter.py)
- Обновить документацию в папке docs согласно выполненным работам в рамках агентской задачи
**Файлы**: Все измененные файлы

---

## Важные заметки

1. **Типобезопасность**: Новая структура использует дискриминированные объединения TypeScript
2. **AI-интеграция**: Zod-схемы обновлены для корректной генерации JSON AI-ассистентом
3. **Архитектурные принципы**: Следуем FSD и принципам, описанным в design-principles.md
4. **Прямое обновление**: Старый формат данных не поддерживается, требуется полное обновление

## Связанные файлы
- [План рефакторинга](../../docs/architecture/gfx_primitive_refactor_plan.md)
- [Принципы архитектуры](../../docs/architecture/design-principles.md)
- [Workflow агентских задач](../../docs/development/workflows/agent-tasks.md)
