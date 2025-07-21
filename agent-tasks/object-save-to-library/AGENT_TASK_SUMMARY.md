# Агентская задача: Реализация функционала сохранения объектов в библиотеку

> ⚠️ **ОБЯЗАТЕЛЬНО**: При выполнении каждой фазы необходимо сверяться с требованиями из [../../docs/AGENT_TASKS.md](../../docs/AGENT_TASKS.md)

## Описание задачи

В ObjectManager существует кнопка "Сохранить в библиотеку" для объектов, но функционал не реализован. В настоящее время при нажатии на кнопку выполняется только `console.log(objectUuid)` (`SceneObjectManager.tsx:220-222`).

### Контекст

#### Текущее состояние
- ✅ **UI готов**: Кнопка существует в `SceneObjectItem.tsx:162-170`
- ✅ **База данных**: Схема `ObjectRecord` и таблица `objects` готовы
- ✅ **Интерфейсы**: `GfxObject` и `ObjectRecord` определены
- ✅ **Библиотека**: `LibraryPage.tsx` поддерживает отображение объектов
- ❌ **Функционал**: Методы `saveObject()` и `updateObject()` отсутствуют в database.ts
- ❌ **Интеграция**: `handleSaveObjectToLibrary()` не реализован

#### Ключевые файлы
```
src/features/scene/ui/SceneObjectManager.tsx:220-222  - обработчик (не реализован)
src/features/scene/ui/SceneObjectItem.tsx:162-170     - UI кнопка
src/shared/lib/database.ts:119                        - место для saveObject()
src/pages/LibraryPage.tsx                             - отображение объектов
```

#### Архитектурные требования
- Следовать Feature-Sliced архитектуре
- Использовать существующий Zustand паттерн
- Интегрироваться с существующей Dexie базой данных
- Обеспечить error handling через `shared/hooks/useErrorHandler`

## План выполнения по фазам

### Фаза 1: Database Layer ✅ Выполнено
**Файлы для изменения**: `src/shared/lib/database.ts`

**Задача**: Добавить недостающие методы `saveObject()` и `updateObject()` в класс `SceneLibraryDB`

**Детали реализации**:
1. Добавить метод `saveObject(name: string, objectData: GfxObject, description?: string, thumbnail?: string): Promise<string>`
   - Генерировать UUID для объекта
   - Создавать запись `ObjectRecord` с метаданными
   - Сохранять в таблицу `objects`
   - Возвращать UUID созданного объекта

2. Добавить метод `updateObject(uuid: string, updates: Partial<ObjectRecord>): Promise<void>`
   - Обновлять существующую запись
   - Обновлять `updatedAt` timestamp

**Ожидаемый результат**: Database API готово для сохранения объектов

### Фаза 2: Scene Object Manager Integration ✅ Выполнено
**Файлы для изменения**: `src/features/scene/ui/SceneObjectManager.tsx`

**Задача**: Реализовать функционал `handleSaveObjectToLibrary(objectUuid: string)`

**Детали реализации**:
1. Получить объект из scene store по UUID
2. Создать диалог для ввода имени и описания объекта
3. Извлечь `GfxObject` из `SceneObject` (убрать `layerId`, `visible`)
4. Вызвать `database.saveObject()` с введенными данными
5. Показать toast уведомление об успехе/ошибке
6. Обновить состояние, если необходимо

**Технические детали**:
```typescript
const sceneObject = useSceneStore.getState().getObjectByUuid(objectUuid);
const gfxObject: GfxObject = {
  uuid: sceneObject.uuid,
  name: sceneObject.name, 
  primitives: sceneObject.primitives
};
await database.saveObject(userInputName, gfxObject, userInputDescription);
```

**Ожидаемый результат**: Рабочий функционал сохранения из ObjectManager

### Фаза 3: Save Dialog Component ✅ Выполнено
**Файлы для создания**: 
- `src/shared/ui/SaveObjectDialog.tsx` 
- `src/shared/ui/index.ts` (экспорт)

**Задача**: Создать переиспользуемый диалог для сохранения объекта

**Детали реализации**:
1. Mantine Modal с формой ввода:
   - Поле имени объекта (обязательное)
   - Поле описания (опционально)
   - Кнопки "Сохранить" и "Отмена"
2. Валидация имени (не пустое, уникальность опционально)
3. Обработка состояний loading/error
4. TypeScript интерфейс для props

**Компонентная структура**:
```typescript
interface SaveObjectDialogProps {
  opened: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => Promise<void>;
  objectName?: string; // начальное значение
}
```

**Ожидаемый результат**: Переиспользуемый UI компонент для сохранения

### Фаза 4: Error Handling & Notifications ✅ Выполнено
**Файлы для изменения**:
- `src/features/scene/ui/SceneObjectManager.tsx`
- `src/shared/lib/database.ts`

**Задача**: Добавить comprehensive error handling и уведомления пользователю

**Детали реализации**:
1. **Database errors**:
   - Обработка duplicate names
   - Database connection errors  
   - Validation errors
2. **UI notifications**:
   - Success toast при успешном сохранении
   - Error toast с детальными сообщениями
   - Loading состояние для кнопки сохранения
3. **Error boundary** интеграция
4. **Logging** через существующую систему

**Обработка ошибок**:
```typescript
try {
  const uuid = await database.saveObject(name, objectData, description);
  showNotification({ message: `Объект "${name}" сохранен`, color: 'green' });
} catch (error) {
  if (error.name === 'ConstraintError') {
    showNotification({ message: 'Объект с таким именем уже существует', color: 'red' });
  } else {
    showNotification({ message: 'Ошибка сохранения объекта', color: 'red' });
  }
}
```

**Ожидаемый результат**: Robust error handling и user feedback

Фаза выполнена: добавлен хук `useErrorHandler`, методы `saveObject` и
`updateObject` теперь проверяют входные данные и уникальность имени. В
`SceneObjectManager.tsx` используются уведомления с учётом типов ошибок.

### Фаза 5: Testing & Integration ⏳ Запланировано
**Файлы для тестирования**: Все измененные компоненты

**Задача**: Comprehensive тестирование и финальная интеграция

**Детали тестирования**:
1. **Unit тесты**:
   - Database методы (saveObject, updateObject)
   - Save dialog компонент
   - Error handling scenarios
2. **Integration тесты**:
   - Full save flow: ObjectManager → Dialog → Database → LibraryPage
   - Error scenarios (duplicate names, DB failures)
   - UI state management
3. **Manual тестирование**:
   - Сохранение различных типов объектов
   - Проверка отображения в LibraryPage
   - Тестирование на edge cases

**Критерии готовности**:
- Объекты успешно сохраняются в библиотеку
- Сохраненные объекты отображаются в LibraryPage
- Все error cases обработаны корректно
- UI responsive и intuitive

**Ожидаемый результат**: Полностью рабочий и протестированный функционал

-## Статус выполнения фаз
- [x] **Фаза 1**: Database Layer - Выполнено
- [x] **Фаза 2**: Scene Object Manager Integration - Выполнено
- [x] **Фаза 3**: Save Dialog Component - Выполнено
- [x] **Фаза 4**: Error Handling & Notifications - Выполнено
- [ ] **Фаза 5**: Testing & Integration - Запланировано

## Ссылки на выполненные фазы
- [Фаза 1](phases/phase_1_summary.md)
- [Фаза 2](phases/phase_2_summary.md)
- [Фаза 3](phases/phase_3_summary.md)
- [Фаза 4](phases/phase_4_summary.md)

## Примечания для агентов

1. **Архитектура**: Строго следовать Feature-Sliced принципам из `docs/qryleth_architecture_guidelines.md`
2. **Консистентность**: Использовать существующие паттерны из `sceneStore.ts` и `database.ts`  
3. **Performance**: Учитывать потенциально большое количество объектов в библиотеке
4. **UX**: Обеспечить intuitive и responsive пользовательский интерфейс
5. **Compatibility**: Поддерживать существующий формат `GfxObject` без breaking changes
