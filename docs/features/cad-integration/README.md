# CAD Integration / Интеграция CAD

Документация по интеграции CAD-данных в Qryleth через конвертер `cad2qryleth`.

## Обзор

CAD интеграция позволяет импортировать 3D модели из CAD-систем в формат Qryleth. Основным инструментом является Python-конвертер `cad2qryleth/converter.py`, который преобразует CAD-геометрию в JSON-формат, совместимый с системой примитивов Qryleth.

## Архитектура

```
cad2qryleth/
├── converter.py           # Основной конвертер
├── input/                 # Входные CAD-файлы (*.py)
└── output/               # Выходные JSON-файлы
```

## Формат данных

Конвертер генерирует JSON в формате, соответствующем новой структуре типов GfxPrimitive:

```json
{
  "name": "Object Name",
  "primitives": [
    {
      "type": "box",
      "geometry": {
        "width": 2.0,
        "height": 1.0,
        "depth": 1.5
      },
      "material": {
        "color": "#ff0000",
        "opacity": 1.0
      },
      "transform": {
        "position": [0, 0, 0],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1]
      }
    }
  ]
}
```

## Связанные документы

- [Конвертер CAD2Qryleth](converter.md) - Детальное описание работы конвертера
- [Формат GfxPrimitive](../../api/types/README.md) - Структура типов примитивов