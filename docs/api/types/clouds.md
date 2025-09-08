# Типы облаков и область размещения

Этот документ описывает доменные типы облачного слоя и формат задания области размещения на плоскости XZ.

## GfxCloudsConfig
- Назначение: конфигурация слоя облаков.
- Поля:
  - `items: GfxCloudItem[]` — список облаков (позиций и визуальных параметров).

## GfxCloudItem
- `id: string` — уникальный идентификатор облака в слое.
- `seed?: number` — индивидуальный сид для детерминизма параметров.
- `position: [number, number, number]` — мировые координаты центра облака `[x, y, z]`.
- `rotationY?: number` — поворот вокруг оси Y (радианы).
- `advancedOverrides?` — переопределения визуальных полей, рассчитанных генератором.

## Область размещения (GfxCloudPlacementArea)
Поддерживаются осевые прямоугольники и окружности. Форматы основаны на shared‑типах `Rect2D` и `Circle2D` из `shared/types/geo2d.ts`.

- Прямоугольник (Rect2D):
  - `{ kind: 'rect', x: number, z: number, width: number, depth: number }`
  - `x, z` — левый‑нижний угол прямоугольника на плоскости XZ.
  - `width` — размер по оси X; `depth` — размер по оси Z.

- Круг (Circle2D):
  - `{ kind: 'circle', x: number, z: number, radius: number }`
  - `x, z` — центр окружности; `radius` — радиус.

Примечание: исторические формы `xMin/xMax/zMin/zMax` и `center: [x,z]` удалены.

## Пример использования в SceneAPI
```
// Прямоугольная область (300×200), центрированная вокруг (0,0)
SceneAPI.generateProceduralClouds({
  placement: 'poisson',
  minDistance: 25,
  altitudeY: [120, 160],
  area: { kind: 'rect', x: -150, z: -100, width: 300, depth: 200 },
  appearance: { stylePreset: 'cumulus', sizeLevel: 3, variance: 0.5 }
})

// Круговая область радиуса 140 вокруг центра мира
SceneAPI.generateProceduralClouds({
  placement: 'poisson',
  minDistance: 22,
  altitudeY: [130, 170],
  area: { kind: 'circle', x: 0, z: 0, radius: 140 },
  appearance: { stylePreset: 'cumulus', dynamicsLevel: 0.5 }
})
```

