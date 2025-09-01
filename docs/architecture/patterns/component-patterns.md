# Паттерны React компонентов

В Qryleth используются стандартные подходы к построению компонентов React:

- **Контейнер/Презентационный компонент** — разделение логики и отображения
- **Hooks first** — бизнес‑логика выносится в кастомные хуки
- **Модульность** — каждый компонент лежит в собственном файле рядом с тестами и типами
- **Композиция** — сложные компоненты строятся из простых shared компонентов

## Паттерн композиции карточек

Для создания карточек используется многослойная композиция:

### 1. Shared компоненты (базовые блоки)
```typescript
import { BaseCard, PreviewImage, MetadataBadges, ActionButtons } from '@/shared/ui'
```

### 2. Entity компоненты (доменная логика)
```typescript
import { ObjectCard } from '@/entities/object/ui'

<ObjectCard 
  object={gfxObject}
  thumbnailSrc={thumbnailUrl}
  actions={actions}
/>
```

### 3. Feature компоненты (специфичная логика)
```typescript
import { LibraryObjectCard } from '@/features/object-library'

<LibraryObjectCard 
  object={objectRecord}
  onEdit={handleEdit}
  showAddButton={true}
/>
```

Подробности см. в [card-composition.md](./card-composition.md)

Следование этим правилам упрощает поддержку и переиспользование UI.
