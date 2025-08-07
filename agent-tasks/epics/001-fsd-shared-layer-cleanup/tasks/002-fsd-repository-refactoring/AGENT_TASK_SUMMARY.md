---
id: 2
epic: ../../../epics/001-fsd-shared-layer-cleanup/epic.md
status: planned
created: 2025-08-07
tags: [architecture, fsd, refactoring, database]
---

# FSD Repository Refactoring

## Контекст

В коде обнаружены нарушения FSD архитектуры - слой `shared` импортирует типы из слоя `entities`, что создает архитектурные проблемы:

1. **shared/lib/database.ts** - импортирует `SceneData`, `GfxObject` из entities
2. **shared/api/types.ts** - содержит доменные типы `SceneRecord`, `ObjectRecord` 
3. **Множественные файлы** в shared импортируют из entities

## Цель

Исправить нарушения FSD архитектуры через выделение абстрактных репозиториев в shared и перенос доменных сущностей в entities.

## Ожидаемый результат

1. Слой `shared` больше не зависит от `entities`
2. Созданы generic интерфейсы репозиториев в `shared/lib/database/`
3. Доменные типы и реализации перенесены в соответствующие `entities/*/api/`
4. Все импорты обновлены согласно новой структуре

## Фазы выполнения

### Фаза 1: Создание абстрактных интерфейсов репозиториев ⏳ Планируется
- Создать `shared/lib/database/interfaces.ts` с generic интерфейсами
- Создать `shared/lib/database/base.ts` с базовыми типами
- Обновить экспорты в `shared/lib/database/index.ts`

### Фаза 2: Перенос доменных типов в entities ⏳ Планируется  
- Переместить `SceneRecord` в `entities/scene/types/`
- Переместить `ObjectRecord` в `entities/object/types/`
- Создать типизированные алиасы репозиториев в entities
- Удалить доменные типы из `shared/api/types.ts`

### Фаза 3: Рефакторинг database.ts ⏳ Планируется
- Создать generic базовый класс `DatabaseCore` в shared
- Переместить доменную логику в `entities/database/`
- Обновить экспорты и импорты

### Фаза 4: Обновление импортов в потребителях ⏳ Планируется
- Обновить импорты в `pages/LibraryPage.tsx`
- Обновить импорты в других файлах, использующих типы записей
- Проверить корректность работы приложения

### Фаза 5: Валидация и тестирование ⏳ Планируется
- Запустить линтер и type-check
- Проверить работоспособность базы данных
- Убедиться в отсутствии FSD нарушений

## Архитектурные принципы

- Следовать принципам FSD: нижние слои не должны знать о верхних
- Использовать generic интерфейсы для абстракции
- Сохранить обратную совместимость API
- Обеспечить чистоту зависимостей

## Примеры целевой архитектуры

### 1. Абстрактные интерфейсы в shared

```typescript
// src/shared/lib/database/interfaces.ts

export interface BaseRecord {
  id?: number
  uuid: string
  name: string
  description?: string
  thumbnail?: string
  createdAt: Date
  updatedAt: Date
}

export interface IDataRepository<TData, TRecord extends BaseRecord> {
  save(name: string, data: TData, description?: string, thumbnail?: string): Promise<string>
  update(uuid: string, name: string, data: TData, description?: string, thumbnail?: string): Promise<void>
  get(uuid: string): Promise<TRecord | undefined>
  getAll(): Promise<TRecord[]>
  delete(uuid: string): Promise<void>
}

// Для объектов с дополнительным методом updatePartial
export interface IExtendedDataRepository<TData, TRecord extends BaseRecord> 
  extends IDataRepository<TData, TRecord> {
  updatePartial(uuid: string, updates: Partial<TRecord>): Promise<void>
}
```

### 2. Доменные типы в entities

```typescript
// src/entities/scene/types/sceneRecord.ts
import type { BaseRecord } from '@/shared/lib/database'
import type { SceneData } from './sceneData'

export interface SceneRecord extends BaseRecord {
  sceneData: SceneData
}

// src/entities/scene/api/types.ts
import type { IDataRepository } from '@/shared/lib/database'
import type { SceneData, SceneRecord } from '../types'

export type ISceneRepository = IDataRepository<SceneData, SceneRecord>
```

### 3. Реализации репозиториев

```typescript
// src/entities/scene/api/sceneRepository.ts
import type { ISceneRepository } from './types'
import type { SceneData, SceneRecord } from '../types'
import { DatabaseCore } from '@/shared/lib/database'

export class SceneRepository extends DatabaseCore implements ISceneRepository {
  // конкретная реализация для сцен
}
```

### 4. Структура файлов

```
src/
├── shared/lib/database/
│   ├── interfaces.ts     # Generic интерфейсы
│   ├── base.ts          # BaseRecord, DatabaseCore
│   └── index.ts         # Экспорты
├── entities/scene/
│   ├── types/
│   │   ├── sceneRecord.ts
│   │   └── index.ts
│   └── api/
│       ├── sceneRepository.ts
│       ├── types.ts     # ISceneRepository alias
│       └── index.ts
└── entities/object/
    ├── types/
    │   ├── objectRecord.ts
    │   └── index.ts
    └── api/
        ├── objectRepository.ts
        ├── types.ts     # IObjectRepository alias
        └── index.ts
```