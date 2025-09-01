# Паттерн композиции карточек

## Обзор

В проекте используется паттерн композиции для создания карточек объектов, соответствующий принципам Feature-Sliced Design. Вместо монолитных компонентов карточек создается система переиспользуемых базовых компонентов.

## Архитектура слоев

### Shared слой - базовые UI компоненты

Содержит универсальные компоненты без доменной логики:

```typescript
// Базовая карточка
import { BaseCard } from '@/shared/ui/Card'

// Превью изображения
import { PreviewImage } from '@/shared/ui/PreviewImage'

// Бейджи метаданных
import { MetadataBadges } from '@/shared/ui/MetadataBadges'

// Кнопки действий
import { ActionButtons } from '@/shared/ui/ActionButtons'

// Виртуализированная сетка
import { VirtualizedGrid } from '@/shared/ui/VirtualizedGrid'
```

### Entities слой - доменные компоненты

Знает о доменных типах и использует композицию shared компонентов:

```typescript
// Карточка объекта
import { ObjectCard } from '@/entities/object/ui'

// Пример использования
<ObjectCard
  object={gfxObject}
  thumbnailSrc={thumbnailUrl}
  size="md"
  actions={[
    { type: 'edit', label: 'Редактировать', onClick: handleEdit },
    { type: 'delete', label: 'Удалить', onClick: handleDelete }
  ]}
  previewOverlay={<CustomPreview />}
/>
```

### Features слой - специфичная логика

Добавляет feature-специфичную логику поверх entity компонентов:

```typescript
// Карточка библиотеки с hover-превью
import { LibraryObjectCard } from '@/features/object-library'

// Сетка объектов библиотеки
import { VirtualizedObjectGrid } from '@/features/object-library'
```

## Принципы использования

### 1. Выбор компонента по слою

- **Shared UI** — только для универсальных компонентов без доменной логики
- **Entity UI** — когда нужна карточка объекта с базовой функциональностью
- **Feature UI** — когда нужна специфичная логика (hover-превью, особые действия)

### 2. Композиция вместо наследования

```typescript
// ❌ Неправильно - монолитный компонент
const ObjectPreviewCard = ({ object, onEdit, onDelete, showHover }) => {
  // Много логики в одном компоненте
}

// ✅ Правильно - композиция
const LibraryObjectCard = ({ object, onEdit, onDelete }) => {
  const previewOverlay = hovered ? <HoverPreview /> : undefined
  
  return (
    <ObjectCard
      object={object}
      actions={[...]}
      previewOverlay={previewOverlay}
    />
  )
}
```

### 3. Dependency Injection

Передача зависимостей через props вместо прямых импортов:

```typescript
// ✅ Правильно
<ObjectCard 
  thumbnailSrc={object.thumbnail}  // DI: источник превью
  previewOverlay={<HoverPreview />} // DI: интерактивное превью
/>

// ❌ Неправильно
// ObjectCard сам импортирует ObjectRenderer из feature
```

## Примеры использования

### Карточка в библиотеке объектов

```typescript
import { LibraryObjectCard } from '@/features/object-library'

<LibraryObjectCard
  object={objectRecord}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onAdd={handleAdd}
  showAddButton={true}
  size="md"
/>
```

### Карточка в редакторе сцены

```typescript
import { ObjectCard } from '@/entities/object/ui'

<ObjectCard
  object={sceneObject}
  thumbnailSrc={undefined} // без превью в сцене
  actions={[
    { type: 'select', label: 'Выбрать', onClick: handleSelect },
    { type: 'delete', label: 'Удалить', onClick: handleDelete }
  ]}
  showThumbnail={false}
/>
```

### Виртуализированная сетка

```typescript
import { VirtualizedObjectGrid } from '@/features/object-library'

<VirtualizedObjectGrid
  objects={libraryObjects}
  onEdit={handleEdit}
  onDelete={handleDelete}
  height={600}
  showAddButton={true}
/>
```

## Преимущества подхода

1. **Соблюдение FSD** — нет нарушений зависимостей между слоями
2. **Переиспользование** — shared компоненты можно использовать везде
3. **Тестируемость** — каждый компонент можно тестировать изолированно
4. **Гибкость** — легко создавать новые варианты карточек через композицию
5. **Производительность** — виртуализация для больших списков

## Миграция существующих компонентов

При создании новых карточек или рефакторинге существующих:

1. Используйте shared компоненты как основу
2. Добавляйте доменную логику на уровне entities
3. Специфичную feature логику размещайте в соответствующих features
4. Избегайте прямых зависимостей между features