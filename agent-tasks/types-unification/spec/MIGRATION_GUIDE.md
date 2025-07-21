# Руководство по миграции типов

## Обзор

Это руководство поможет разработчикам безопасно мигрировать код при изменениях в системе типов проекта. Следуйте этим принципам для поддержания стабильности и архитектурной чистоты.

## Принципы безопасной миграции

### 1. 🛡️ Never Break Backward Compatibility

**Всегда используйте временные алиасы** при миграции типов:

```typescript
// OLD LOCATION: entities/someOldLocation/types.ts
// Перед удалением создайте алиасы
export type {
  SomeType,
  AnotherType
} from '@/shared/types/ui'  // New location

// Оставьте алиасы до полной миграции всех импортов
```

### 2. 🔄 Градуальная миграция

**Никогда не мигрируйте все импорты сразу**. Используйте поэтапный подход:

1. **Фаза 1**: Создайте новую структуру с алиасами
2. **Фаза 2**: Мигрируйте импорты по частям (5-10 файлов за раз)
3. **Фаза 3**: Тестируйте после каждой части
4. **Фаза 4**: Удаляйте алиасы только после полной миграции

### 3. ✅ Тестирование на каждом шаге

После каждого изменения запускайте:

```bash
# TypeScript компиляция
npx tsc --noEmit

# Линтер (если настроен)
npm run lint

# Тесты (если есть)
npm test
```

## Сценарии миграции

### Сценарий 1: Перемещение типа между слоями

**Пример**: Перенос UI типа из entities в shared

```typescript
// BEFORE: entities/ui/types.ts
export interface ButtonVariant {
  primary: string
  secondary: string
}

// STEP 1: Создать новое место
// shared/types/ui/index.ts
export interface ButtonVariant {
  primary: string
  secondary: string
}

// STEP 2: Создать алиас в старом месте
// entities/ui/types.ts
export type { ButtonVariant } from '@/shared/types/ui'

// STEP 3: Мигрировать импорты поэтапно
// До: import { ButtonVariant } from '../entities/ui/types'
// После: import type { ButtonVariant } from '@/shared/types/ui'

// STEP 4: Удалить алиас после полной миграции
```

### Сценарий 2: Разделение монолитного файла типов

**Пример**: Разбиение большого файла на несколько специализированных

```typescript
// BEFORE: features/editor/types.ts (100+ строк)
export interface EditorState { ... }
export interface ToolbarProps { ... }
export interface PanelData { ... }
export type EditorMode = 'edit' | 'view'

// STEP 1: Создать специализированные файлы
// features/editor/model/store-types.ts
export interface EditorState { ... }

// features/editor/ui/toolbar-types.ts  
export interface ToolbarProps { ... }
export interface PanelData { ... }

// shared/types/ui/editor.ts
export type EditorMode = 'edit' | 'view'

// STEP 2: Создать временные алиасы в старом файле
// features/editor/types.ts
export type { EditorState } from './model/store-types'
export type { ToolbarProps, PanelData } from './ui/toolbar-types'
export type { EditorMode } from '@/shared/types/ui/editor'

// STEP 3: Обновить barrel exports
// features/editor/index.ts
export * from './model'
export * from './ui'

// STEP 4: Мигрировать импорты и удалить старый файл
```

### Сценарий 3: Переименование типов

**Пример**: Улучшение именования типов

```typescript
// STEP 1: Создать новый тип с лучшим именем
export interface SceneViewMode extends ViewMode {
  // Расширенная функциональность
}

// STEP 2: Создать алиас для обратной совместимости  
export type ViewMode = SceneViewMode // @deprecated Use SceneViewMode

// STEP 3: Постепенно мигрировать код на новое имя
// STEP 4: Удалить deprecated алиас через несколько релизов
```

## Архитектурные принципы миграции

### Правило 1: Соблюдение иерархии слоев FSD

```
✅ Разрешенные направления миграции:
entities → shared    (утилитарные типы)
entities → features  (бизнес-логика)  
shared → features    (feature-специфичные варианты)

❌ Запрещенные направления:
shared → entities    (нарушение архитектуры)
features → entities  (нарушение архитектуры)
features → shared    (создаст зависимость)
```

### Правило 2: Сохранение семантики

При миграции **не изменяйте логический смысл** типов:

```typescript
// ✅ Правильно: тот же тип, новое место
// entities/ui/types.ts → shared/types/ui/index.ts
export interface ButtonProps {
  variant: 'primary' | 'secondary'
  size: 'small' | 'medium' | 'large'
}

// ❌ Неправильно: изменение при миграции
export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'tertiary'  // Добавили новый variant
  size: 'small' | 'medium' | 'large'
}
```

### Правило 3: Barrel Exports First

Всегда создавайте удобные barrel exports:

```typescript
// shared/types/index.ts
export * from './core'
export * from './ui'
export * from './validation'

// Позволяет использовать:
import type { ButtonProps, ValidationRule } from '@/shared/types'
// Вместо:
import type { ButtonProps } from '@/shared/types/ui'
import type { ValidationRule } from '@/shared/types/validation'
```

## Инструменты и автоматизация

### Поиск использования типов

```bash
# Найти все импорты определенного типа
grep -r "import.*ButtonProps" src/
grep -r "ButtonProps" src/ --include="*.ts" --include="*.tsx"

# Найти файлы, которые нужно обновить
find src/ -name "*.ts" -o -name "*.tsx" | xargs grep "from.*entities/ui/types"
```

### Batch замена импортов

```bash
# Осторожно! Тестируйте перед применением
# Заменить относительные пути на абсолютные
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from ['\''"]../../../entities/primitive['\''"]|from "@/entities/primitive"|g'
```

### TypeScript для проверки

```typescript
// Создайте временный файл для проверки миграции
// migration-check.ts
import type { OldType } from './old/location'
import type { NewType } from './new/location'

// Убедитесь, что типы совместимы
const test: OldType = {} as NewType  // Должно компилироваться
const test2: NewType = {} as OldType  // Должно компилироваться
```

## Чек-лист миграции

### Перед началом миграции

- [ ] Определил целевой слой согласно FSD принципам
- [ ] Создал план поэтапной миграции
- [ ] Настроил инструменты для поиска использований

### Во время миграции

- [ ] Создал новую структуру типов
- [ ] Добавил временные алиасы в старых местах
- [ ] Обновил barrel exports
- [ ] Мигрировал импорты по частям (5-10 файлов)
- [ ] Тестировал TypeScript компиляцию после каждой части
- [ ] Документировал изменения

### После миграции

- [ ] Все импорты используют новые пути
- [ ] TypeScript компилируется без ошибок
- [ ] Удален старый код и алиасы
- [ ] Обновлена документация
- [ ] Проинформированы другие разработчики

## Распространенные ошибки

### ❌ Ошибка 1: Массовая замена импортов

```typescript
// НЕ ДЕЛАЙТЕ ТАК - это может сломать код
find src/ -name "*.ts" | xargs sed -i 's/old-import/new-import/g'
```

**Решение**: Мигрируйте по 5-10 файлов, тестируя каждую партию.

### ❌ Ошибка 2: Изменение типов во время миграции

```typescript
// БЫЛО
export interface User {
  name: string
  email: string
}

// СТАЛО (неправильно - изменили тип во время миграции)
export interface User {
  firstName: string  // ← изменили структуру!
  lastName: string
  email: string
}
```

**Решение**: Сначала мигрируйте, потом рефакторьте в отдельном PR.

### ❌ Ошибка 3: Забыли про barrel exports

```typescript
// Создали новые файлы, но забыли добавить в index.ts
// shared/types/ui/button.ts ← создали
// shared/types/ui/modal.ts  ← создали
// shared/types/ui/index.ts  ← не обновили!

// В результате импорты не работают:
import type { ButtonProps } from '@/shared/types/ui'  // ❌ не найдет
```

**Решение**: Всегда обновляйте barrel exports при создании новых файлов.

## Примеры успешных миграций

### Пример 1: Миграция UI типов (Фаза 3)

```typescript
// entities/r3f/types.ts → shared/types/ui/
// Мигрировано: ViewMode, RenderMode, TransformMode, SelectedObject
// Файлов обновлено: 12
// Время: 1 час
// Проблем: 0
```

### Пример 2: Миграция Store типов (Фаза 3)

```typescript
// entities/r3f/types.ts → features/scene/model/
// Мигрировано: SceneStore, SceneStoreState, SceneStoreActions
// Файлов обновлено: 5
// Время: 0.5 часа  
// Проблем: 1 архитектурное нарушение (исправлено)
```

## Заключение

Следование этому руководству поможет:

- 🛡️ **Избежать breaking changes** 
- ⚡ **Ускорить миграцию** благодаря проверенным паттернам
- 🏗️ **Сохранить архитектурную чистоту**
- 📚 **Упростить будущие миграции**

При возникновении сложных случаев создавайте issue или консультируйтесь с архитектором проекта.