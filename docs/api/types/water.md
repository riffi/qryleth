# Типы воды и водных поверхностей

Этот документ описывает доменные типы для подсистемы воды и поддерживаемые формы поверхностей на плоскости XZ.

## GfxWaterBody
- `id: string` — идентификатор водного объекта в пределах слоя.
- `name?: string` — человекочитаемое имя (UI).
- `visible?: boolean` — видимость водного объекта (по умолчанию true).
- `kind: 'sea' | 'lake' | 'river'` — тип водного объекта.
- `surface: GfxWaterSurface` — геометрия проекции на XZ (см. ниже).
- `altitudeY: number` — высота поверхности воды (мировая Y).
- `water: GfxWaterConfig` — параметры визуализации (яркость, тип шейдера и др.).

## GfxWaterSurface
Поддерживаются осевые прямоугольники, окружности и полигоны.

- Прямоугольник (Rect2D):
  - `{ kind: 'rect', x: number, z: number, width: number, depth: number }`
  - `x, z` — левый‑нижний угол на XZ; `width` — по X; `depth` — по Z.

- Круг (Circle2D):
  - `{ kind: 'circle', x: number, z: number, radius: number }`
  - `x, z` — центр; `radius` — радиус окружности.

- Полигон:
  - `{ kind: 'polygon', points: Array<[number, number]> }`
  - `points` — вершины в порядке обхода, каждая точка — `[x, z]`.

Примечание: исторические формы `xMin/xMax/zMin/zMax` и `center: [x,z]` удалены. Используйте `Rect2D`/`Circle2D`.

## Пример создания прямоугольного «моря»
```
const sea: GfxWaterBody = {
  id: 'sea-1',
  name: 'Южная бухта',
  kind: 'sea',
  surface: { kind: 'rect', x: -200, z: -100, width: 400, depth: 200 },
  altitudeY: 0,
  water: { type: 'realistic', brightness: 1.6 }
}
SceneAPI.addWaterBody('<water-layer-id>', sea)
```

