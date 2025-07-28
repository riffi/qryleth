# CAD2Qryleth Конвертер

Детальное описание работы конвертера `cad2qryleth/converter.py` для преобразования CAD-данных в формат Qryleth.

## Обзор

Конвертер CAD2Qryleth — это Python-скрипт, который преобразует CAD-геометрию (представленную в виде Python-скриптов с Blender API) в JSON-формат, совместимый с системой примитивов Qryleth.

## Принцип работы

### 1. Песочница (Sandbox)

Конвертер выполняет входные Python-скрипты в изолированной среде:
- Создается заглушка для модуля `bpy` (Blender Python API)
- Все вызовы `bpy.ops.mesh.primitive_*_add` перехватываются и записываются
- Поддерживаются все основные операции создания примитивов

### 2. Поддерживаемые примитивы

Конвертер поддерживает следующие типы примитивов:
- `sphere` / `uv_sphere` → тип `sphere`
- `cylinder` → тип `cylinder` 
- `cube` → тип `box`
- `torus` → тип `torus`
- `cone` → тип `cone`
- `plane` → тип `plane`

### 3. Структура данных

Каждый примитив преобразуется в структуру:

```json
{
  "type": "box",
  "name": "Cube.001",
  "geometry": {
    "width": 2.0,
    "height": 2.0,
    "depth": 2.0
  },
  "material": {
    "color": "#ff0000"
  },
  "transform": {
    "position": [0, 0, 0],
    "rotation": [0, 0, 0]
  }
}
```

### 4. Преобразование координат

- **По умолчанию**: Z-up → Y-up (стандарт Three.js)
- **Опция**: `--up z` для сохранения Z-up координат
- Автоматическое вычисление bounding box и центрирование

## Использование

### Основная команда

```bash
python converter.py input_file.py -o output.json --name ObjectName
```

### Параметры

- `input_file.py` - входной Python-скрипт с CAD-данными
- `-o, --output` - выходной JSON-файл
- `--name` - имя объекта в результирующем JSON
- `--up {y,z}` - направление "вверх" (по умолчанию: y)

### Пример использования

```bash
# Конвертация модели кофеварки
python converter.py input/CoffeeMaker.py -o output/CoffeeMaker.json --name "Coffee Maker"
```

## Структура выходного файла

Результирующий JSON содержит:

```json
{
  "name": "Object Name",
  "primitives": [
    {
      "type": "box",
      "name": "Component Name", 
      "geometry": {
        // Геометрические параметры специфичные для типа
      },
      "material": {
        "color": "#hexcolor"  // Опционально
      },
      "transform": {
        "position": [x, y, z],
        "rotation": [rx, ry, rz]
      }
    }
  ]
}
```

## Особенности реализации

### Геометрические параметры

Каждый тип примитива имеет специфичные параметры в объекте `geometry`:

- **Box**: `width`, `height`, `depth`
- **Sphere**: `radius`
- **Cylinder**: `radiusTop`, `radiusBottom`, `height`
- **Cone**: `radius`, `height`
- **Torus**: `majorRadius`, `minorRadius`
- **Plane**: `width`, `height`

### Материалы

- Извлекается цвет из первого материала объекта
- Конвертируется из RGB (0.0-1.0) в HEX-формат
- Если материал отсутствует, поле `material` не добавляется

### Трансформации

- Позиция и поворот читаются из объекта Blender
- Масштаб учитывается при вычислении размеров геометрии
- Координаты автоматически преобразуются из Z-up в Y-up

## Примеры входных файлов

### Простой куб

```python
import bpy

bpy.ops.mesh.primitive_cube_add(
    size=2.0,
    location=(0, 0, 0)
)
```

### Сложная модель

```python
import bpy
import bmesh

# Основание
bpy.ops.mesh.primitive_cylinder_add(
    radius=1.5,
    depth=0.3,
    location=(0, 0, 0)
)

# Корпус
bpy.ops.mesh.primitive_cylinder_add(
    radius=1.2,
    depth=2.0,
    location=(0, 0, 1.15)
)
```

## Интеграция с Qryleth

Сгенерированные JSON-файлы полностью совместимы с:
- Системой типов GfxPrimitive
- AI-инструментами для генерации объектов
- Редактором объектов Qryleth
- Системой рендеринга R3F

## Связанные файлы

- [README CAD Integration](README.md) - Обзор интеграции CAD
- [Типы примитивов](../../api/types/README.md) - Структура GfxPrimitive
- [Конвертер](../../../cad2qryleth/converter.py) - Исходный код