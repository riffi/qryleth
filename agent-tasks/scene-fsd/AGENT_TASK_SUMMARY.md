# Агентская задача: Приведение /features/scene к стандарту FSD

## Описание
Привести структуру `/features/scene` в соответствие с принципами Feature-Sliced Design (FSD) и требованиями архитектуры проекта.

## Цель
Обеспечить соответствие feature-слайса `scene` стандартной FSD-архитектуре с правильным разделением на сегменты `model/`, `ui/`, `lib/`, `api/` и созданием публичного API.

## Контекст
Текущая структура `/features/scene` содержит 8 нестандартных сегментов (`controls/`, `effects/`, `landscape/`, `lighting/`, `objects/`, `optimization/`, `store/`, `ui/`) вместо стандартных 4 FSD-сегментов, что нарушает принципы архитектуры.

## Фазы выполнения

### Фаза 1: Подготовка FSD структуры
**Цель**: Создать правильную структуру каталогов согласно FSD

**Действия**:
1. Создать новую структуру каталогов:
   ```
   src/features/scene/
   ├── model/
   ├── ui/
   └── index.ts
   ```
2. Создать файлы `index.ts` в каждом сегменте для экспортов

**Результат**: Готовая структура каталогов FSD

### Фаза 2: Миграция модели и стора
**Цель**: Перенести бизнес-логику в сегмент `model/`

**Действия**:
1. Переместить файлы из `store/` в `model/`:
   - `store/sceneStore.ts` → `model/sceneStore.ts`
   - `store/optimizedSelectors.ts` → `model/optimizedSelectors.ts`
2. Обновить все импорты, ссылающиеся на перемещенные файлы
3. Создать `model/index.ts` с экспортами

**Результат**: Вся бизнес-логика консолидирована в `model/`

### Фаза 3: Реорганизация UI компонентов
**Цель**: Консолидировать все UI компоненты в сегменте `ui/`

**Действия**:
1. Переместить компоненты в `ui/` с логической группировкой:
   ```
   ui/
   ├── controls/
   │   ├── CameraControls.tsx
   │   ├── FlyControls.tsx
   │   ├── WalkControls.tsx
   │   └── TransformGizmo.tsx
   ├── effects/
   │   └── PostProcessing.tsx
   ├── landscape/
   │   ├── LandscapeLayer.tsx
   │   └── LandscapeLayers.tsx
   ├── lighting/
   │   └── SceneLighting.tsx
   ├── objects/
   │   ├── SceneObjectRenderer.tsx
   │   └── SceneObjects.tsx
   ├── optimization/
   │   └── OptimizedComponents.tsx
   └── [остальные UI компоненты]
   ```
2. Обновить все импорты в кодовой базе
3. Создать `ui/index.ts` с экспортами

**Результат**: Все UI компоненты организованы в одном сегменте

### Фаза 4: Создание публичного API
**Цель**: Определить публичный интерфейс feature-слайса

**Действия**:
1. Создать корневой `index.ts` с экспортами публичного API
2. Обновить внешние импорты для использования публичного API
3. Обеспечить правильную инкапсуляцию внутренней реализации

**Результат**: Четко определенный публичный API feature-слайса

### Фаза 5: Обновление документации
**Цель**: Обновить документацию проекта

**Действия**:
1. Создать `docs/architecture/feature-sliced-design.md` с описанием FSD
2. Обновить документацию по scene management в `docs/features/scene-management/`
3. Создать руководство по миграции других features

**Результат**: Актуальная документация по FSD и feature-слайсам

### Фаза 6: Тестирование и валидация
**Цель**: Убедиться в корректности рефакторинга

**Действия**:
1. Проверить корректность всех импортов
2. Запустить тесты для проверки функциональности
3. Исправить пропущенные импорты

**Результат**: Полностью работающий feature-слайс в FSD-формате

## Критерии готовности
- [ ] Структура `/features/scene` соответствует FSD стандарту
- [ ] Все файлы перемещены в правильные сегменты
- [ ] Все импорты обновлены и работают корректно
- [ ] Создан публичный API feature-слайса
- [ ] Обновлена документация
- [ ] Все тесты проходят успешно

## Файлы для изменения
### Перемещение файлов:
- `src/features/scene/store/*` → `src/features/scene/model/`
- `src/features/scene/controls/*` → `src/features/scene/ui/controls/`
- `src/features/scene/effects/*` → `src/features/scene/ui/effects/`
- `src/features/scene/landscape/*` → `src/features/scene/ui/landscape/`
- `src/features/scene/lighting/*` → `src/features/scene/ui/lighting/`
- `src/features/scene/objects/*` → `src/features/scene/ui/objects/`
- `src/features/scene/optimization/*` → `src/features/scene/ui/optimization/`

### Создание новых файлов:
- `src/features/scene/index.ts`
- `src/features/scene/model/index.ts`
- `src/features/scene/ui/index.ts`
- `docs/architecture/feature-sliced-design.md`

### Обновление импортов во всех файлах проекта

## Примечания
- Сохранить всю существующую функциональность
- Минимизировать breaking changes для других частей системы
- Использовать постепенный подход для снижения рисков
- Обеспечить обратную совместимость где это возможно