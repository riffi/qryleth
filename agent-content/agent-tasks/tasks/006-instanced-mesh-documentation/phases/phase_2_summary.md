---
id: 6
phase: 2
title: "Фаза 2: Поддержка составных объектов"
status: done
created: 2025-08-07
updated: 2025-08-08
---
# Фаза 2: Поддержка составных объектов

**Статус:** ✅ Выполнено
**Дата:** 2025-08-07
**Файлов изменено:** 3

## Цель фазы

Расширить поддержку Instanced Mesh для составных объектов (объектов с несколькими примитивами), таких как столы с ножками, деревья с кроной и стволом и т.д.

## Выполненные изменения

### 1. Удаление ограничения на одно-примитивные объекты
- **Было:** `if (sceneObject.primitives.length > 1) return null`
- **Стало:** Полная поддержка составных объектов
- **Файл:** `InstancedObjects.tsx`

### 2. Создание CompositeInstancedGroup
- Новый компонент для обработки объектов с несколькими примитивами
- Создает отдельный `InstancedMesh` для каждого примитива объекта
- Обрабатывает события на уровне группы объектов

### 3. Создание PrimitiveInstancedGroup
- Компонент для обработки одного примитива с инстансингом
- Использует `@react-three/drei` `Instances` и `Instance`
- Применяет комбинированные трансформации

### 4. Функция combineTransforms
- Утилита для правильного объединения трансформаций экземпляра и примитива
- Учитывает позицию, поворот и масштаб
- Математически корректное объединение преобразований

## Технические детали

### Архитектура составных объектов
```tsx
<CompositeInstancedGroup>
  {sceneObject.primitives.map((primitive, index) => (
    <PrimitiveInstancedGroup
      key={`${objectUuid}-primitive-${index}`}
      primitive={primitive}
      instances={instances}
    />
  ))}
</CompositeInstancedGroup>
```

### Объединение трансформаций
```typescript
const finalPosition = [
  instanceX + primitiveX * instanceScaleX,
  instanceY + primitiveY * instanceScaleY,
  instanceZ + primitiveZ * instanceScaleZ
]
```

### Добавленные компоненты
- `CompositeInstancedGroup` - для составных объектов
- `PrimitiveInstancedGroup` - для отдельных примитивов
- `combineTransforms` - утилита объединения трансформаций

## Результат

- ✅ Поддержка составных объектов с несколькими примитивами
- ✅ Правильное объединение трансформаций экземпляра и примитива
- ✅ Каждый примитив рендерится как отдельный InstancedMesh
- ✅ События обрабатываются на уровне группы объектов

## Следующая фаза

Фаза 3: Поддержка материалов для примитивов в Instanced Mesh

