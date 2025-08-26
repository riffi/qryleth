# AGENT_TASK: Рефакторинг хранения и генерации Landscape

## As Is

-   Геометрия слоя Landscape ранее создавалась через `createPerlinGeometry`;
    устаревшее поле массивов высот удалено в новой архитектуре.
-   Ранее в `LandscapeLayer` массивы высот сохранялись в слой при первом рендере — эта логика удалена.
-   В `ObjectPlacementUtils` высота для размещения объектов вычисляется
    независимо, но похожим образом.
-   В `GfxLayer` больше не хранится `noiseData?: number[]` — используйте `terrain`.

## To Be

###  **Единый источник высоты**
**Ввести типы** 
    
```typescript

// Данные perlinNoise
export interface PerlinParams {
  seed: number;
  octaveCount: number;
  amplitude: number;
  persistence: number;
  width: number; // в сегментах сетки, а не мировых координатах!
  height: number; // в сегментах сетки, а не мировых координатах!
}

// Данные heightmap
export interface HeightmapParams {
  assetId: string;        // ключ blob PNG в Dexie
  imgWidth: number;
  imgHeight: number;
  min: number;            // нормализация уровня моря/нуля
  max: number;            // максимальная высота
  wrap?: 'clamp'|'repeat';
}

// Данные геометрии слоя
export type TerrainSource =
| { kind: 'perlin'; params: PerlinParams }
| { kind: 'heightmap'; params: HeightmapParams }

// Одна «добавка» (операция модификации рельефа)
export interface TerrainOp {
  id: string;                 // для редактирования/удаления
  mode: 'add' | 'sub' | 'set';// как применять смещение
  center: [number, number];   // мировые координаты (x,z)
  radius: number;             // сферический радиус влияния (в мировых единицах)
  intensity: number;          // амплитуда изменения высоты (+/-)
  falloff?: 'smoothstep' | 'gauss' | 'linear';
  // Дополнительно (опционально):
  radiusZ?: number;           // если указан → эллипс rx=radius, rz=radiusZ
  rotation?: number;          // поворот эллипса (рад)
}


export interface TerrainConfig {
  worldWidth: number;
  worldHeight: number;
  edgeFade?: number;          // плавный спад к краю (0..1 доля от края)
  source: TerrainSource;
  ops?: TerrainOp[];          // МАССИВ «добавок» (если одна, то только она)
}

```
Принцип: если есть хотя бы одна «добавка», она применяется к базовой высоте. Нет добавок — базовая высота из источника.

Реализовать `HeightSampler` 
```typescript
export interface HeightSampler {
  getHeight(x: number, z: number): number;                  // мировые координаты
  getNormal(x: number, z: number): [number, number, number];// конечные разности
}
```
createHeightSampler(cfg: TerrainConfig):

1. База: берём высоту из source:
- perlin: адаптер seed-friendly шума (simplex/open-simplex + свой PRNG).
- heightmap: bilinear из ImageData (UV→px,py).

2. Применяем ops: для каждой TerrainOp вычисляем вклад:
- расстояние r от center с учётом эллипса (и rotation), нормируем t = clamp(1 - r, 0, 1),
- falloff(t): linear=t, smoothstep=t*t*(3-2*t), gauss=exp(-3*r*r),
- delta = intensity * falloff,
- mode: add → h+=delta, sub → h-=delta, set → h = base + delta.

3. Края: edgeFade (плавный спад высоты к 0 по периметру).
Нормаль: центральные/встречные разности через 2–4 вызова getHeight.

Важно: и рендер, и размещение используют этот же sampler.

Все вычисления высот (рендер и размещение объектов) должны идти через `HeightSampler`.

### Генерация геометрии
```typescript
export function buildTerrainGeometry(cfg: TerrainConfig, sampler: HeightSampler) {
  const segments = decideSegments(cfg.worldWidth, cfg.worldHeight) // 10..200
  const geom = new THREE.PlaneGeometry(cfg.worldWidth, cfg.worldHeight, segments, segments)
  geom.rotateX(-Math.PI/2)
  const arr = geom.attributes.position.array as Float32Array
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i], z = arr[i+2]
    arr[i+1] = sampler.getHeight(x, z)
  }
  geom.attributes.position.needsUpdate = true
  geom.computeVertexNormals()
  geom.computeBoundingBox()
  return geom
}
```
LandscapeLayer заменяет текущий `createPerlinGeometry` на пару sampler+buildTerrainGeometry. Сохранение устаревших массивов высот удалено.

### Размещение объектов
ObjectPlacementUtils использует только:

```typescript
const y = sampler.getHeight(x, z)
const n = sampler.getNormal(x, z)
```
Никакой самостоятельной математики высот/нормалей.
### Импорт heightmap
-  UI: «Загрузить PNG» → сохраняем blob в Dexie (assets) → получаем assetId.
- В воркере: createImageBitmap(blob) → OffscreenCanvas → ImageData (RGBA).
- HeightSampler для heightmap делает bilinear из яркости Y = 0.2126R+0.7152G+0.0722B, маппит в [min..max].

### Хранение в Dexie (новая структура слоя)
```typescript
export interface GfxLayer {
  // ...
  terrain?: TerrainConfig
}
```
- Новые слои: source.kind = 'perlin' | 'heightmap', ops?: TerrainOp[].
