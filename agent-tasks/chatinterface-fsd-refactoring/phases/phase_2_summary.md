# Фаза 2: Рефакторинг ObjectEditor layout

**Статус**: ⏳ Планируется  
**Приоритет**: Высокий  
**Предполагаемое время**: 3-4 часа

## Цель фазы
Подготовка UI ObjectEditor для интеграции системы переключаемых панелей путем создания нового layout компонента с поддержкой управления панелями.

## Контекст
ObjectEditor открывается в двух режимах:
1. **Страница редактирования объекта** - полноэкранный режим
2. **Модальное окно редактирования** - в контексте SceneEditor

В обоих режимах необходимо разместить toggle buttons для управления панелями в header области.

## Подзадачи

### 2.1 Анализ существующего ObjectEditor UI
**Время**: 30 минут

**Файлы для анализа:**
- `src/features/object-editor/ui/ObjectEditorR3F.tsx`
- `src/pages/ObjectEditorPage.tsx`
- `src/features/object-editor/ui/ObjectManagementPanel/`
- `src/features/object-editor/ui/PrimitiveControlPanel/`
- `src/features/object-editor/ui/MaterialControlPanel/`

**Задачи анализа:**
- Определить текущую структуру layout'а
- Найти места размещения header controls
- Выявить логику переключения между PrimitiveControlPanel и MaterialControlPanel
- Понять механизм работы с модальным окном

### 2.2 Создание ObjectEditorLayout компонента
**Время**: 2-2.5 часа

**Файлы для создания:**
```
src/features/object-editor/ui/ObjectEditorLayout/
├── ObjectEditorLayout.tsx
├── index.ts
└── components/
    ├── HeaderControls/
    │   ├── HeaderControls.tsx
    │   └── index.ts
    └── PanelContainer/
        ├── PanelContainer.tsx
        └── index.ts
```

**ObjectEditorLayout.tsx - основные требования:**

```typescript
interface ObjectEditorLayoutProps {
  mode: 'page' | 'modal'
  children: React.ReactNode
  onClose?: () => void // для модального режима
}
```

**Функциональность:**
- Управление размещением всех панелей ObjectEditor
- Интеграция PanelToggleButtons в соответствующие header области
- Поддержка двух режимов отображения (страница/модаль)
- Реализация логики взаимоисключающих панелей для левой стороны
- Сохранение состояния панелей между переключениями

**HeaderControls.tsx:**
- Размещение PanelToggleButtons
- Адаптация под режим отображения (страница vs модаль)
- Интеграция с существующими header элементами
- Респонсивность для разных размеров экрана

**PanelContainer.tsx:**
- Контейнер для левой панели (чат/свойства)
- Контейнер для правой панели (менеджер)
- Анимации появления/скрытия панелей
- Управление размерами панелей

### 2.3 Интеграция логики переключения панелей
**Время**: 1-1.5 часа

**Реализуемая логика:**

**Правила взаимодействия:**
1. **Левая панель**: чат ↔ свойства (взаимоисключающие)
2. **Правая панель**: менеджер (независимый)
3. **Автоматическое переключение**: 
   - При выборе примитива в менеджере → скрыть чат, показать PrimitiveControlPanel
   - При выборе материала в менеджере → скрыть чат, показать MaterialControlPanel  
   - При активации чата → скрыть свойства
4. **Визуальная индикация**: активные панели подсвечены в toggle buttons

**Интеграция с существующей логикой:**
- Подключение к существующему стейту выбора примитива/материала
- Сохранение текущих callbacks и обработчиков событий
- Обеспечение обратной совместимости с существующим API

### 2.4 Адаптация для двух режимов работы
**Время**: 30 минут

**Режим "Страница редактирования":**
- Toggle buttons размещаются в rightSection существующего header
- Полная ширина экрана для панелей
- Интеграция с существующим MainLayout

**Режим "Модальное окно":**
- Toggle buttons размещаются в header модального окна рядом с кнопкой закрытия
- Ограниченная ширина модального окна
- Адаптация размеров панелей под модальный контекст

## Критерии готовности

### Функциональные критерии
- [ ] ObjectEditorLayout корректно отображается в обоих режимах
- [ ] PanelToggleButtons интегрированы в соответствующие header области
- [ ] Логика взаимоисключающих панелей работает корректно
- [ ] Автоматическое переключение при выборе примитива/материала функционирует
- [ ] Состояние панелей сохраняется между переключениями

### Технические критерии
- [ ] Обратная совместимость с существующими компонентами
- [ ] Нет breaking changes в API ObjectEditor
- [ ] TypeScript компилируется без ошибок
- [ ] Производительность: плавные анимации панелей
- [ ] Респонсивность: корректное отображение на разных экранах

### Критерии качества
- [ ] Код соответствует паттернам проекта
- [ ] Компоненты хорошо структурированы и переиспользуемы
- [ ] CSS стили не конфликтуют с существующими
- [ ] Accessibility: поддержка клавиатурной навигации

## Технические детали реализации

### Структура состояния панелей
```typescript
interface ObjectEditorPanelState {
  leftPanel: 'chat' | 'properties' | null
  rightPanel: 'manager' | null
  propertiesType: 'primitive' | 'material' | null
  previousLeftPanel: 'chat' | 'properties' | null // для восстановления
}
```

### Интеграция с существующим стейтом
```typescript
// Подключение к objectStore
const { selectedPrimitive, selectedMaterial } = useObjectStore()

// Логика автопереключения
useEffect(() => {
  if (selectedPrimitive || selectedMaterial) {
    setPanelState(prev => ({
      ...prev,
      leftPanel: 'properties',
      propertiesType: selectedPrimitive ? 'primitive' : 'material'
    }))
  }
}, [selectedPrimitive, selectedMaterial])
```

### CSS Layout структура
```scss
.object-editor-layout {
  display: flex;
  height: 100%;
  
  &__main-content {
    flex: 1;
    display: flex;
    
    .viewport-container {
      flex: 1;
    }
    
    .left-panel {
      width: 300px;
      transition: transform 0.3s ease;
      
      &--hidden {
        transform: translateX(-100%);
      }
    }
    
    .right-panel {
      width: 350px;
      transition: transform 0.3s ease;
      
      &--hidden {
        transform: translateX(100%);
      }
    }
  }
}
```

## Потенциальные проблемы и решения

**Проблема**: Конфликт с существующей логикой управления панелями  
**Решение**: Использовать decorator pattern - обернуть существующие компоненты, не изменяя их внутреннюю логику

**Проблема**: Сложность анимаций в модальном режиме  
**Решение**: Создать отдельные CSS классы для модального режима с адаптированными анимациями

**Проблема**: Состояние панелей не синхронизируется между режимами  
**Решение**: Использовать единый Zustand store для состояния панелей, доступный из обоих режимов

## Следующая фаза
После завершения переходим к **Фазе 3: Миграция SceneEditor ChatInterface**, где будет выполнен перенос существующего ChatInterface в архитектуру FSD.

## Связанные файлы
- `src/features/object-editor/ui/PanelToggleButtons/` - созданный в Фазе 1
- `src/features/object-editor/ui/ObjectEditorR3F.tsx` - основной компонент для интеграции
- `src/pages/ObjectEditorPage.tsx` - страница режим
- `src/features/object-editor/model/objectStore.ts` - стейт для интеграции