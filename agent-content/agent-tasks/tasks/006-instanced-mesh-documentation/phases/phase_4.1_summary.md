---
id: 6
phase: 4.1
title: "Фаза 4.1: Поддержка выбора и трансформации отдельных инстансов"
status: done
created: 2025-08-11
updated: 2025-08-11
filesChanged: 6
---

# Фаза 4.1: Поддержка выбора и трансформации отдельных инстансов

**Статус:** ✅ Выполнено
**Дата:** 2025-08-11
**Файлов изменено:** 6

## Цель фазы

Устранить ограничение 4-й фазы, при котором события обрабатывались только на уровне группы объектов. Добавить возможность выбирать и трансформировать отдельные инстансы объектов в InstancedMesh с помощью gizmo controls.

## Проблема

После реализации 4-й фазы система Instanced Mesh обрабатывала события только на уровне группы объектов:
- События передавались через невидимый mesh с userData `{ isInstanced: true }` без указания конкретного instanceId  
- Отсутствовала возможность выбрать конкретный инстанс объекта
- TransformControls не могли работать с отдельными экземплярами InstancedMesh
- При клике выбирался весь тип объекта, а не конкретный инстанс

## Выполненные изменения

### 1. Обработка событий для отдельных инстансов

**Файл:** `InstancedObjects.tsx`

- Удален невидимый mesh-обработчик событий из `CompositeInstancedGroup`
- Добавлена обработка событий напрямую в `PrimitiveInstancedGroup` через компонент `<Instances>`
- Реализованы обработчики `handleInstanceClick` и `handleInstanceHover` с передачей instanceId
- Добавлен userData для каждого Instance с полной информацией о выбранном экземпляре

```typescript
const handleInstanceClick = useCallback((event: any) => {
  if (!onClick || !ref.current) return
  
  const instanceId = event.instanceId
  if (instanceId !== undefined && instanceId < instances.length) {
    const instance = instances[instanceId]
    const syntheticEvent = {
      ...event,
      userData: {
        generated: true,
        objectUuid: objectUuid,
        objectInstanceUuid: instance.uuid,
        isInstanced: true,
        instanceId: instanceId,
        layerId: sceneObject.layerId || 'objects'
      }
    }
    onClick(syntheticEvent)
  }
}, [onClick, objectUuid, instances, sceneObject])
```

### 2. Компонент для трансформации инстансированных объектов

**Файл:** `InstancedObjectTransform.tsx` (новый)

Создан специализированный компонент для работы с TransformControls и инстансированными объектами:
- Создает вспомогательный объект (helper object) для представления выбранного инстанса
- Синхронизирует позицию helper object с трансформациями инстанса
- Передает изменения трансформации обратно в store через колбэк

```typescript
/**
 * Компонент для трансформации отдельных инстансов в InstancedMesh
 * Создаёт вспомогательный объект, который представляет выбранный инстанс
 */
export const InstancedObjectTransform: React.FC<InstancedObjectTransformProps>
```

### 3. Интеграция с ObjectTransformGizmo

**Файл:** `ObjectTransformGizmo.tsx`

- Добавлена поддержка инстансированных объектов
- Логика ветвления: для инстансированных объектов используется `InstancedObjectTransform`, для обычных - стандартный `TransformControls`
- Передача колбэка для обновления трансформации инстанса

```typescript
// Если выбран инстансированный объект, используем специальный компонент
if (selectionMetadata.isInstanced && selectionMetadata.instanceUuid && selectionMetadata.objectUuid) {
  return (
    <InstancedObjectTransform
      selectedObjectUuid={selectionMetadata.objectUuid}
      selectedInstanceUuid={selectionMetadata.instanceUuid}
      transformMode={transformMode}
      onTransformChange={handleInstancedObjectTransform}
    />
  )
}
```

### 4. Обновление типов и store

**Файлы:** `index.ts`, `store-types.ts`, `sceneStore.ts`

- Добавлено поле `isInstanced?: boolean` в интерфейс `SelectedSceneObject`
- Обновлена сигнатура функции `selectObject` для передачи флага isInstanced
- Обновлена обработка в `useSceneEvents` для извлечения и передачи флага isInstanced

### 5. Передача информации об инстансировании

**Файл:** `useSceneEvents.ts`

- Извлечение флага `isInstanced` из userData кликнутого объекта
- Передача флага в функцию `selectObject` для корректной идентификации типа объекта

## Технические детали

### Архитектура решения

1. **Обработка событий на уровне Instance**: Каждый экземпляр в InstancedMesh теперь может обрабатывать клики индивидуально
2. **Helper Object Pattern**: Для трансформации используется вспомогательный THREE.Object3D, который синхронизируется с данными инстанса в store
3. **Условный рендеринг**: ObjectTransformGizmo автоматически выбирает правильный компонент в зависимости от типа выбранного объекта

### Поддерживаемые возможности

- ✅ Выбор отдельных экземпляров объектов в InstancedMesh
- ✅ Трансформация выбранных инстансов с помощью TransformControls (translate, rotate, scale)
- ✅ Синхронизация изменений с основным store сцены
- ✅ Корректное отключение управления камерой во время трансформации
- ✅ Обратная совместимость с обычными (не инстансированными) объектами

### Ограничения

- TransformControls работает с helper object, а не напрямую с InstancedMesh
- Необходима синхронизация между helper object и store данными
- Требуется instanceId в событиях от drei/Instances компонента

## Результат

- ✅ Устранена основная проблема - отсутствие возможности выбора отдельных инстансов
- ✅ Полная интеграция с системой TransformControls
- ✅ Сохранена совместимость с существующей системой событий
- ✅ Добавлена поддержка всех режимов трансформации (translate, rotate, scale)
- ✅ Система готова к использованию в production

## Следующая фаза

Фаза 5: Документирование API и создание примеров использования - планируется добавить детальную документацию по работе с новой функциональностью.