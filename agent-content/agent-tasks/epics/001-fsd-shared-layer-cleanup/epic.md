---
id: 1
title: "Устранение FSD нарушений в слое shared"
status: planned
created: 2025-08-07
updated: 2025-08-07
tags: [architecture, fsd, refactoring, shared-layer]
---

# Устранение FSD нарушений в слое shared

## Цель
Полностью очистить слой `shared` от зависимостей верхних слоев (`entities`, `features`, `widgets`, `pages`, `app`) согласно принципам Feature-Sliced Design.

## Контекст

Слой `shared` содержит множественные нарушения FSD архитектуры - импорты из слоя `entities`, что создает:
- Циклические зависимости
- Нарушение принципа инверсии зависимостей  
- Невозможность переиспользования shared компонентов
- Архитектурную путаницу

### Обнаруженные нарушения

#### 1. API слой (2 нарушения)
- **shared/api/types.ts:10** - `import type { GfxObject } from '@/entities/object'`
- **shared/api/types.ts:11** - `import type { SceneData } from '@/entities/scene/types'`

#### 2. Библиотечный слой (8 нарушений)
- **shared/lib/database.ts:4** - `import type {SceneData} from "@/entities/scene/types.ts"`
- **shared/lib/database.ts:5** - `import type {GfxObject} from "@/entities/object"`
- **shared/lib/geometry/boundingBoxUtils.ts:2** - `import type { GfxPrimitive, GfxObject } from '@/entities'`
- **shared/lib/materials/MaterialRegistry.ts:1** - `import type { GfxMaterial, CreateGfxMaterial } from '@/entities/material'`
- **shared/lib/materials/materialResolver.ts:1** - `import type { GfxMaterial } from '@/entities/material'`
- **shared/lib/materials/globalMaterials.ts:1-2** - импорты типов и констант из `@/entities/material`
- **shared/lib/langchain/chatService.ts:11** - `import type {GfxObjectWithTransform} from '@/entities'`
- **shared/types/index.ts:17-21** - реэкспорт типов из `@/entities/material`

#### 3. React Three Fiber компоненты (12 нарушений)
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

## Основные вехи
- [x] Веха 1: Анализ и планирование (завершено)
- [ ] Веха 2: Database и API рефакторинг
- [ ] Веха 3: Materials system рефакторинг  
- [ ] Веха 4: R3F компоненты рефакторинг
- [ ] Веха 5: Геометрия и вспомогательные утилиты
- [ ] Веха 6: Валидация и финализация

## Задачи эпика

### ✅ Задача 1: Анализ архитектурных нарушений
**Статус:** done  
**Ссылка:** -  
**Описание:** Провести аудит всех FSD нарушений в слое shared и создать детальный план рефакторинга

### ⏳ Задача 2: FSD Repository Refactoring  
**Статус:** planned  
**Ссылка:** [tasks/002-fsd-repository-refactoring/AGENT_TASK_SUMMARY.md](tasks/002-fsd-repository-refactoring/AGENT_TASK_SUMMARY.md)  
**Описание:** Рефакторинг database.ts и API типов для устранения зависимостей от entities

### ⏳ Задача 3: Materials System FSD Cleanup
**Статус:** planned  
**Ссылка:** -  
**Описание:** Вынести материальную систему в entities, создать generic интерфейсы в shared

### ⏳ Задача 4: R3F Components Generic Refactoring
**Статус:** planned  
**Ссылка:** -  
**Описание:** Сделать R3F примитивы generic или перенести в entities

### ⏳ Задача 5: Geometry Utils Abstraction
**Статус:** planned  
**Ссылка:** -  
**Описание:** Убрать зависимости от GfxPrimitive/GfxObject, создать абстрактные геометрические интерфейсы

### ⏳ Задача 6: FSD Compliance Validation
**Статус:** planned  
**Ссылка:** -  
**Описание:** Финальная проверка соответствия FSD, обновление документации и тестирование

## Критерии завершения
- [ ] 0 импортов из `entities` в слое `shared`
- [ ] 0 предупреждений линтера по FSD правилам
- [ ] Все компоненты shared работают независимо от бизнес-логики
- [ ] Сохранена обратная совместимость API
- [ ] Обновлена документация архитектуры
- [ ] Проведено комплексное тестирование

## Статус выполнения
**Текущий статус:** planned  
**Прогресс:** 1/6 задач завершено  
**Последнее обновление:** 2025-08-07