# Редактирование объектов

Документация по системе редактирования 3D объектов в Qryleth.

---

## Обзор

Система редактирования объектов обеспечивает полный цикл работы с 3D объектами:

- ✏️ **Создание и модификация** примитивов
- 📁 **Группировка примитивов** с иерархической структурой
- 🎨 **Управление материалами** объектов
- 🔧 **Трансформации** (перемещение, поворот, масштабирование)
- 📋 **Управление состоянием** через специализированные store

### Дополнительно

- 🆕 [Процедурная генерация деревьев](tree-generation.md) — параметры, типы, оптимизация рендера

---

## Компоненты

### Основные UI компоненты

1. **ObjectEditorLayout** - основной layout с системой переключаемых панелей
   - Управление видимостью панелей чата, свойств и менеджера
   - Поддержка режимов страницы и модального окна
   - Автоматическое переключение панелей при выборе элементов

2. **Toolbars** - вертикальные тулбары управления панелями
   - Левая колонка: Чат и Свойства (взаимоисключающие)
   - Правая колонка: Менеджер объектов (независимо)
   - Интеграция на уровне виджета `ObjectEditor`

3. **ObjectChatInterface** - AI чат для редактирования объектов
   - Контекстная помощь на основе текущего объекта
   - Специализированные AI tools для объектов
   - Интеграция в систему панелей

4. **ObjectManagementPanel** - панель управления объектом
   - Табуляция между примитивами и материалами
   - Интегрированный интерфейс управления

5. **PrimitiveManager** - управление примитивами и группами объекта
   - Древовидная структура с иерархическими группами
   - Создание, удаление, выбор примитивов и групп
   - Drag-and-drop перемещение между группами
   - Контекстные меню для групп (создать подгруппу, переименовать)
   - Модальные окна для создания/редактирования

6. **MaterialManager** - управление материалами объекта
   - Список материалов объекта
   - Создание и выбор материалов
   - Валидация уникальности имен

### Панели управления

1. **PrimitiveControlPanel** - редактирование примитива
   - Параметры геометрии
   - Назначение материалов
   - Трансформации

2. **GroupControlPanel** - редактирование группы примитивов
   - Трансформации группы (position, rotation, scale)
   - Видимость группы
   - Имя и свойства группы

3. **MaterialControlPanel** - редактирование материала
   - Цветовые параметры
   - Прозрачность и излучение
   - Интерактивные элементы управления

---

## Система панелей

### Архитектура панелей (после рефакторинга)

ObjectEditor использует систему переключаемых панелей для оптимального использования пространства:

#### Типы панелей

```typescript
interface PanelState {
  leftPanel: 'chat' | 'properties' | null
  rightPanel: 'manager' | null
  chatVisible: boolean
  propertiesVisible: boolean
  managerVisible: boolean
}
```

#### Логика переключения

1. **Левая панель**: чат и свойства взаимоисключающие
   - Активен только один из компонентов: ObjectChatInterface или PrimitiveControlPanel/GroupControlPanel/MaterialControlPanel
   - При выборе примитива/группы/материала → автоматически показывается панель свойств, скрывается чат
   
2. **Правая панель**: менеджер работает независимо
   - ObjectManagementPanel может быть открыт/закрыт независимо от левой панели
   
3. **Автоматические переходы**:
   - Выбор примитива в менеджере → `leftPanel = 'properties'`
   - Выбор группы в менеджере → `leftPanel = 'properties'`
   - Выбор материала в менеджере → `leftPanel = 'properties'`
   - Кнопка "Чат" → `leftPanel = 'chat'`

#### Режимы интеграции

- **Страница редактирования**: управление панелями через встроенные тулбары
- **Модальное окно**: те же тулбары внутри модального `ObjectEditor`

### AI интеграция в панели

**ObjectChatInterface** предоставляет контекстную помощь:

- **Анализ текущего объекта** - чат получает информацию о редактируемом объекте и структуре групп
- **Специализированные AI tools**:
  - `getObjectData` - получение полных данных объекта включая группы
  - `addPrimitives` - добавление новых примитивов с возможностью создания групп
- **Контекстные промпты** - системные промпты адаптируются под текущий контекст

---

## Архитектура

### Store и состояние

```typescript
// objectStore - управление состоянием объекта
interface ObjectStore {
  // Основное состояние
  currentObject: GfxObject | null
  selectedPrimitive: GfxPrimitive | null
  selectedMaterial: GfxMaterial | null
  selectedGroupUuids: string[]  // 🆕 Выбранные группы по UUID
  
  // Действия с примитивами
  addPrimitive: (primitive: GfxPrimitive) => void
  updatePrimitive: (primitive: GfxPrimitive) => void
  deletePrimitive: (index: number) => void
  
  // 🆕 Действия с группами
  createGroup: (name: string, parentUuid?: string) => void
  deleteGroup: (groupUuid: string) => void
  renameGroup: (groupUuid: string, newName: string) => void
  assignPrimitiveToGroup: (primitiveUuid: string, groupUuid?: string) => void
  importObjectAsGroup: (object: GfxObject, groupName: string) => void
  
  // Действия с материалами
  addMaterial: (material: GfxMaterial) => void
  updateMaterial: (material: GfxMaterial) => void
  deleteMaterial: (uuid: string) => void
  
  // 🆕 Селекторы для групп
  useGroupTree: () => GroupTreeNode[]
  useGroupPrimitives: (groupUuid: string) => PrimitiveWithIndex[]
  useSelectedItemType: () => 'primitive' | 'group' | 'mixed'
}
```

### Интеграция с рендерингом

```typescript
// GroupRenderer рекурсивно рендерит иерархию групп
const GroupRenderer = ({ groupUuid, object }) => {
  const group = object.primitiveGroups?.[groupUuid]
  const childGroups = useGroupChildren(groupUuid)
  const groupPrimitives = useGroupPrimitives(groupUuid)
  
  return (
    <group 
      visible={group?.visible} 
      position={group?.transform?.position}
      rotation={group?.transform?.rotation}
      scale={group?.transform?.scale}
      userData={{ groupUuid }}
    >
      {/* Рендер примитивов группы */}
      {groupPrimitives.map(primitive => 
        <PrimitiveRenderer key={primitive.uuid} primitive={primitive} object={object} />
      )}
      
      {/* Рекурсивный рендер дочерних групп */}
      {childGroups.map(childGroup => 
        <GroupRenderer key={childGroup.uuid} groupUuid={childGroup.uuid} object={object} />
      )}
    </group>
  )
}

// PrimitiveRenderer резолвит материалы автоматически
const PrimitiveRenderer = ({ primitive, object }) => {
  const material = resolveMaterial(primitive, object)
  // Рендеринг с применением материала
}
```

---

## Рабочие процессы

### Создание объекта

1. Создать новый объект через `sceneAPI.createObject()`
2. Добавить примитивы через `PrimitiveManager`
3. Создать группы и организовать примитивы
4. Создать материалы через `MaterialManager`
5. Назначить материалы примитивам

### Работа с группами примитивов

1. **Создание группы**: Правый клик в `PrimitiveManager` → "Создать группу"
2. **Перемещение примитивов**: Drag-and-drop примитивов между группами
3. **Создание подгрупп**: Правый клик на группе → "Создать подгруппу"
4. **Трансформация группы**: Выбрать группу → изменить параметры в `GroupControlPanel`
5. **Импорт как группа**: Импортировать объект с сохранением структуры групп

### Редактирование примитива

1. Выбрать примитив в `PrimitiveManager` (в древовидной структуре)
2. Изменить параметры в `PrimitiveControlPanel`
3. Назначить материал из селектора
4. Изменения сохраняются автоматически

### Редактирование группы

1. Выбрать группу в `PrimitiveManager`
2. Изменить трансформации в `GroupControlPanel`
3. Настроить видимость группы
4. Переименовать или реорганизовать структуру

### Управление материалами

1. Перейти на вкладку "Материалы"
2. Создать новый материал или выбрать существующий
3. Настроить свойства в `MaterialControlPanel`
4. Применить к примитивам через селектор материалов

---

## Особенности реализации

### Валидация

- **Уникальность имен** материалов в рамках объекта
- **Типобезопасность** через TypeScript дискриминированные типы
- **Проверка ссылок** на материалы при удалении

### Производительность

- **Мемоизация** компонентов React
- **Селекторы** для оптимального re-render
- **Lazy loading** для больших объектов

### UX особенности

- **Автосохранение** изменений
- **Отмена действий** через браузерный undo
- **Drag & drop** для реорганизации
- **Горячие клавиши** — обрабатываются хуком `useOEKeyboardShortcuts`; см. [список](keyboard-shortcuts.md)

---

## Интеграция с другими системами

### AI интеграция

**ObjectChatInterface** обеспечивает интеллектуальную помощь в редактировании:

```typescript
// AI может создавать объекты с группами
const aiGeneratedObject = {
  name: "AI House", 
  materials: [...],
  primitives: [...],
  primitiveGroups: {
    'foundation-group': {
      uuid: 'foundation-group',
      name: 'Фундамент'
    },
    'walls-group': {
      uuid: 'walls-group',
      name: 'Стены',
      parentGroupUuid: 'foundation-group'
    }
  },
  primitiveGroupAssignments: {
    'primitive-1': 'foundation-group',
    'primitive-2': 'walls-group'
  }
}

// AI tools для редактирования объектов
const getObjectDataTool = {
  name: 'getObjectData',
  description: 'Получить полные данные текущего объекта включая группы',
  parameters: {}
}

const addPrimitivesTool = {
  name: 'addPrimitives',
  description: 'Добавить примитивы к объекту с возможностью создания групп',
  parameters: {
    primitives: GfxPrimitive[],
    groups?: GfxPrimitiveGroup[],           // Опциональные новые группы
    groupAssignments?: Record<string, string> // Привязка примитивов к группам
  }
}
```

**Контекстная помощь:**
- Анализ структуры текущего объекта и групп
- Предложения по логической организации примитивов в группы
- Помощь в создании иерархических структур
- Предложения по улучшению материалов
- Помощь в создании примитивов
- Автоматическая оптимизация параметров

### CAD импорт

```python
# Конвертер создает объекты с материалами
def convert_blender_object(blender_obj):
    return {
        'materials': extract_materials(blender_obj),
        'primitives': convert_primitives(blender_obj)
    }
```

---

## Документы

- [Система материалов](material-system.md) - Подробное описание системы материалов
- [Chat компоненты](../../api/components/chat-components.md) - Документация по ObjectChatInterface и системе панелей
- [AI Integration](../ai-integration/llm-integration.md) - Интеграция с AI для редактирования объектов
- [API Types](../../api/types/README.md) - Типы для редактирования объектов
