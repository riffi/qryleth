---
status: planned
created: 2025-08-07
tags: [architecture, fsd, refactoring, shared-layer]
---

# Epic: Устранение FSD нарушений в слое shared

## Цель эпика

Полностью очистить слой `shared` от зависимостей верхних слоев (`entities`, `features`, `widgets`, `pages`, `app`) согласно принципам Feature-Sliced Design.

## Проблема

Слой `shared` содержит множественные нарушения FSD архитектуры - импорты из слоя `entities`, что создает:
- Циклические зависимости
- Нарушение принципа инверсии зависимостей  
- Невозможность переиспользования shared компонентов
- Архитектурную путаницу

## KPI эпика

- ✅ 0 импортов из `entities` в слое `shared`
- ✅ 0 предупреждений линтера по FSD правилам
- ✅ Все компоненты shared работают независимо от бизнес-логики
- ✅ Сохранена обратная совместимость API

## Обнаруженные нарушения

### 1. API слой (2 нарушения)
- **shared/api/types.ts:10** - `import type { GfxObject } from '@/entities/object'`
- **shared/api/types.ts:11** - `import type { SceneData } from '@/entities/scene/types'`

### 2. Библиотечный слой (8 нарушений)
- **shared/lib/database.ts:4** - `import type {SceneData} from "@/entities/scene/types.ts"`
- **shared/lib/database.ts:5** - `import type {GfxObject} from "@/entities/object"`
- **shared/lib/geometry/boundingBoxUtils.ts:2** - `import type { GfxPrimitive, GfxObject } from '@/entities'`
- **shared/lib/materials/MaterialRegistry.ts:1** - `import type { GfxMaterial, CreateGfxMaterial } from '@/entities/material'`
- **shared/lib/materials/materialResolver.ts:1** - `import type { GfxMaterial } from '@/entities/material'`
- **shared/lib/materials/globalMaterials.ts:1-2** - импорты типов и констант из `@/entities/material`
- **shared/lib/langchain/chatService.ts:11** - `import type {GfxObjectWithTransform} from '@/entities'`
- **shared/types/index.ts:17-21** - реэкспорт типов из `@/entities/material`

### 3. React Three Fiber компоненты (12 нарушений)
- **shared/r3f/optimization/InstancedObjects.tsx:4** - импорты сценарных типов
- **shared/r3f/primitives/Box3D.tsx:2** - `import type { GfxPrimitive } from '@/entities/primitive'`
- **shared/r3f/primitives/Cone3D.tsx:2** - аналогично
- **shared/r3f/primitives/Cylinder3D.tsx:2** - аналогично  
- **shared/r3f/primitives/Plane3D.tsx:2** - аналогично
- **shared/r3f/primitives/Primitive3D.tsx:2** - аналогично
- **shared/r3f/primitives/PrimitiveRenderer.tsx:15-16** - множественные импорты
- **shared/r3f/primitives/Pyramid3D.tsx:2** - аналогично
- **shared/r3f/primitives/Sphere3D.tsx:2** - аналогично
- **shared/r3f/primitives/Torus3D.tsx:2** - аналогично

**Итого: 22 файла с нарушениями FSD**

## Высокоуровневые вехи

### ✅ Этап 1: Анализ и планирование
- [x] Провести аудит нарушений FSD в shared слое
- [x] Создать план рефакторинга по приоритетам
- [x] Определить архитектурные принципы решения

### ⏳ Этап 2: Database и API рефакторинг
- [ ] [Задача: FSD Repository Refactoring](../tasks/fsd-repository-refactoring/AGENT_TASK_SUMMARY.md)
- [ ] Создать абстрактные репозитории в shared
- [ ] Перенести доменные типы в entities

### ⏳ Этап 3: Materials system рефакторинг  
- [ ] Задача: Вынести материальную систему в entities
- [ ] Создать generic интерфейсы в shared
- [ ] Обновить MaterialRegistry и резолверы

### ⏳ Этап 4: R3F компоненты рефакторинг
- [ ] Задача: Сделать R3F примитивы generic
- [ ] Либо перенести в entities, либо абстрагировать
- [ ] Обновить InstancedObjects компонент

### ⏳ Этап 5: Геометрия и вспомогательные утилиты
- [ ] Задача: Рефакторинг geometry utilities  
- [ ] Убрать зависимости от GfxPrimitive/GfxObject
- [ ] Создать абстрактные геометрические интерфейсы

### ⏳ Этап 6: Валидация и финализация
- [ ] Задача: Финальная проверка FSD compliance
- [ ] Обновить документацию архитектуры
- [ ] Провести комплексное тестирование

## Связанные задачи

1. **[FSD Repository Refactoring](tasks/fsd-repository-refactoring/AGENT_TASK_SUMMARY.md)** - рефакторинг database.ts и API типов
2. **Materials System FSD Cleanup** - планируется
3. **R3F Components Generic Refactoring** - планируется  
4. **Geometry Utils Abstraction** - планируется
5. **FSD Compliance Validation** - планируется

## Архитектурные принципы

1. **Инверсия зависимостей** - shared определяет интерфейсы, entities их реализуют
2. **Generic абстракции** - shared содержит только универсальные компоненты
3. **Чистота слоев** - строгое соблюдение FSD dependency rules
4. **Обратная совместимость** - сохранить существующие API где возможно