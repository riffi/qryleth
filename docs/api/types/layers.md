# Слои сцены (GfxLayer, SceneLayer, GfxLayerType)

Документ описывает слой сцены, типы слоёв и правила их использования во фронтенде.

---

## Перечисление `GfxLayerType`

Перечисление типов слоёв заменяет ранее использовавшиеся строковые литералы. Это повышает типобезопасность и устраняет опечатки.

```ts
// Импорт
import { GfxLayerType } from '@/entities/layer'

// Значения перечисления
GfxLayerType.Object     // 'object'   — слой с обычными объектами
GfxLayerType.Landscape  // 'landscape' — слой ландшафта (террейн)
GfxLayerType.Water      // 'water'     — слой воды
```

Примечание: перечисление является строковым, поэтому сохраняется совместимость с UI элементами (например, `Select`), где `value` — строка.

---

## Перечисление `GfxLayerShape`

Перечисление форм ландшафтных слоёв. Заменяет строковые литералы `'plane' | 'terrain'`.

```ts
// Импорт
import { GfxLayerShape } from '@/entities/layer'

// Значения перечисления
GfxLayerShape.Plane    // 'plane'   — плоская поверхность
GfxLayerShape.Terrain  // 'terrain' — рельефная поверхность (террейн)
```

Примечание: значения также строковые для совместимости с UI и сериализацией.

---

## Базовый тип `GfxLayer`

```ts
interface GfxLayer {
  id: string
  name: string
  /** Тип слоя — перечисление GfxLayerType */
  type?: GfxLayerType

  // Параметры размеров/формы (актуальны для ландшафта и воды)
  width?: number
  height?: number
  /** Форма поверхности — перечисление GfxLayerShape */
  shape?: GfxLayerShape

  /**
   * 🆕 Конфигурация террейна (унифицированная система высот)
   * Используется для всех рельефных поверхностей (shape = 'terrain').
   * См. docs/api/types/terrain.md
  */
  terrain?: GfxTerrainConfig

  
  // Цвет поверхности (напр. цвет ландшафта)
  color?: string
}
```

---

## Слой в сцене `SceneLayer`

`SceneLayer` расширяет `GfxLayer` полями, необходимыми для отображения в редакторе:

```ts
interface SceneLayer extends GfxLayer {
  /** Видимость слоя в сцене */
  visible: boolean
  /** Порядок в списке слоёв */
  position: number
}
```

---

## Примеры использования

Создание слоя ландшафта:
```ts
import type { SceneLayer } from '@/entities/scene/types'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'

const layerData: Omit<SceneLayer, 'id'> = {
  name: 'landscape',
  type: GfxLayerType.Landscape,
  visible: true,
  position: 1,
  width: 100,
  height: 100,
  shape: GfxLayerShape.Terrain,
  color: '#4a7c59'
}
```

Фильтрация ландшафтных слоёв:
```ts
import { GfxLayerType } from '@/entities/layer'

const landscapeLayers = layers.filter(l => l.type === GfxLayerType.Landscape)
```

---

## Миграция с строковых типов на enum

- Было: `type?: 'object' | 'landscape' | 'water'`
- Стало: `type?: GfxLayerType`

Замены в коде:
- Сравнения вида `layer.type === 'landscape'` → `layer.type === GfxLayerType.Landscape`
- Значения по умолчанию: `'object'` → `GfxLayerType.Object`
- В UI (`Select`) — используйте `value={GfxLayerType.Object}` и приводите `onChange` к `GfxLayerType`.

Совместимость:
- Значения перечисления — строки, поэтому взаимодействие с хранилищем, сериализацией и UI остаётся прежним. 

---

## Где используется

- `@/features/editor/scene/model/sceneStore` — инициализация слоёв и операции с ними
- `@/features/editor/scene/ui/objectManager/*` — создание/редактирование слоёв и выбор типа в UI
- `@/features/editor/scene/ui/renderer/*` — фильтрация и отрисовка слоёв
- `@/features/editor/scene/lib/*` — размещение объектов с учётом ландшафта, SceneAPI
- 🆕 `@/features/editor/scene/lib/terrain/*` — `GfxHeightSampler`, `HeightmapUtils`
