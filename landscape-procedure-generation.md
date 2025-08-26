# Внедрение процедурной генерации ланшафта поверх perlinNoise

## Задача
Реализовать в sceneApi функции процедурной генерации ландшафта

## Что добавить в SceneAPI (минимум)
// 1) Сгенерировать полный террейн по рецепту (база + опсы)
```
generateProceduralTerrain(spec: ProceduralTerrainSpec): Promise<GfxTerrainConfig>
```

// 2) Досыпать опсы на уже существующий слой террейна (по маске/зоне)
```
generateTerrainOpsFromPool(pool: TerrainOpPool, seed: number, opts?: {
area?: { kind:'rect'|'circle'|'polygon', ... } // где можно спавнить «добавки»
sampler?: GfxHeightSampler                    // для bias по высоте/уклону
}): Promise<GfxTerrainOp[]>
```

## Схема параметров (что именно добавить)
1) База (Perlin/heightmap)
   type BasePerlin = {
   seed: number
   octaveCount: number        // 1..8
   amplitude: number          // м, пик высот
   persistence: number        // 0.2..0.7 (затухание)
   grid: { width: number, height: number } // 32..128 (детализация)
   edgeFade?: number          // 0..0.3 — плавное затухание к краям (есть в cfg)
   offset?: [number, number]  // сдвиг шума по XZ (вариации без смены seed)
   }


Это напрямую мапится на GfxTerrainConfig.source = { kind:'perlin', params }.

2) Пул «добавок» (опсы как макросы)

Каждая «добавка» — не одна операция, а рецепт, который порождает 1..N GfxTerrainOp в зависимости от seed и диапазонов.
```
type GfxTerrainOpPool = {
global?: {
intensityScale?: number        // умножитель для всех интенсивностей
maxOps?: number                // предохранитель
}
recipes: GfxTerrainOpRecipe[]
}


type GfxTerrainOpRecipe = {
kind: 'hill'|'basin'|'ridge'|'valley'|'crater'|'plateau'|'terrace'|'dune'|'noisePatch'|'stroke'
mode?: 'auto'|'add'|'sub'|'set'     // auto подставит типичноe (напр. hill=add)
count: number | [number, number]     // сколько штук/штрихов породить
placement: PlacementSpec             // как выбирать центры/траектории
radius: number | [number, number]    // базовый радиус (м)
aspect?: [number, number]            // отношение Rz/Rx (напр. 0.4..1.6)
intensity: number | [number, number] // амплитуда (м)
rotation?: [number, number]          // разброс угла (рад)
falloff?: 'smoothstep'|'gauss'|'linear'
bias?: GfxBiasSpec                      // предпочтения по рельефу (вниз/вверх/уклон)
jitter?: { center?: number }         // шумовой сдвиг центров (м)
step?: number                        // для stroke: шаг штампов вдоль линии (м)
}

Placement (где спавнить)
type GfxPlacementSpec =
| { type:'uniform' }                                    // равномерный рандом
| { type:'poisson', minDistance: number }               // «blue-noise» разрежение
| { type:'gridJitter', cell: number, jitter?: number }  // сетка с дрожью
| { type:'alongSpline', splineId: string, span?: [number,number] } // вдоль кривой
| { type:'ring', center:[number,number], rMin:number, rMax:number } // по кольцу

Bias (чтобы «добавки» учитывали рельеф)
type GfxBiasSpec = {
preferHeight?: { min?: number, max?: number, weight?: number } // «ищи выше/ниже»
preferSlope?:  { min?: number, max?: number, weight?: number } // по уклону
avoidOverlap?: boolean                                         // не пересекаться с уже сгенерёнными опсами
}
```


Все это разворачивается в массив GfxTerrainOp: mode, center, radius, radiusZ (из aspect), rotation, intensity, falloff — ты уже поддерживаешь такие поля.

## Как работает генератор (алгоритм)

**PRNG из seed**
- Раздели сид на подпотоки:
- rngBase, rngHills, rngRidges, … (через hash(seed, 'hills')). Это даст стабильные вариации по профилям.

**База**
Построй GfxTerrainConfig с Perlin-параметрами (или heightmap), edgeFade, worldWidth/Height.

**Область размещения**
area (весь мир / прямоугольник / полигон). По ней выбирай центры «добавок».

**Для каждого recipe**
- Определи count из диапазона.
- Сэмплируй центры по placement (Poisson → расстояние minDistance, вдоль сплайна → дискретизация с шагом).
- На каждый центр:
    - Выбери radius и aspect → radiusX=radius, radiusZ=radius*aspect.
    - Выбери rotation.
    - Вычисли intensity с учётом global.intensityScale.
    - Применяй bias: если точка не проходит по высоте/уклону (через GfxHeightSampler.getHeight/getNormal), пересэмплируй.
    - Сконструируй GfxTerrainOp (mode, center, radius, radiusZ, rotation, intensity, falloff).
- Для kind:'stroke' (хребет/долина): идёшь по линии, штампуешь серию эллипсов с step и небольшим джиттером → цепочка опсов.

**В конце**
Собери ops[], обрежь по maxOps и верни вместе с базовой cfg либо отдельным массивом для дозаправки существующего слоя.

## Готовые «рецепты» (что положить в пул)

Ниже — минимальный набор, который даёт очень разные ландшафты.

1) Холмы
   { kind:'hill', mode:'add',
   count:[8,16], placement:{type:'poisson', minDistance:20},
   radius:[8,20], aspect:[0.8,1.2], rotation:[0,Math.PI],
   intensity:[1.5,4], falloff:'smoothstep' }

2) Котловины/лужи/озёра
   { kind:'basin', mode:'sub',
   count:[3,6], placement:{type:'poisson', minDistance:35},
   radius:[10,24], aspect:[0.6,1.4], rotation:[0,Math.PI],
   intensity:[2,6], falloff:'gauss',
   bias:{ preferHeight:{ max: baseLevel, weight:0.6 } } }

3) Хребты (stroke вдоль линии)
   { kind:'stroke', mode:'add',
   count:2, placement:{type:'alongSpline', splineId:'ridgeSpline'},
   radius:[6,10], aspect:[0.2,0.5], rotation:[0,Math.PI],
   step:6, intensity:[2,5], falloff:'smoothstep' }

4) Долина (штрих «sub» вдоль линии)
   { kind:'stroke', mode:'sub',
   count:1, placement:{type:'alongSpline', splineId:'valleySpline'},
   radius:[10,16], aspect:[0.3,0.7], rotation:[0,Math.PI],
   step:8, intensity:[3,7], falloff:'gauss' }

5) Плато (ровные «столы»)
   { kind:'plateau', mode:'add',
   count:[2,4], placement:{type:'poisson', minDistance:30},
   radius:[14,22], aspect:[0.8,1.3], rotation:[0,Math.PI],
   intensity:[3,6], falloff:'linear' }

6) Террасы (ступени)
   { kind:'terrace', mode:'add',
   count:[1,2], placement:{type:'ring', center:[W/2,H/2], rMin:20, rMax:60},
   radius:[8,12], aspect:[0.9,1.1], rotation:[0,Math.PI],
   intensity:[0.8,1.2], falloff:'smoothstep' }

7) Кратеры (для пустынь/луны)
   { kind:'crater', mode:'sub',
   count:[5,12], placement:{type:'poisson', minDistance:18},
   radius:[6,12], aspect:[0.9,1.1], rotation:[0,Math.PI],
   intensity:[2,5], falloff:'gauss' }

8) Дюны (полосы add/sub чередуются)
   { kind:'dune', mode:'add',
   count:[10,18], placement:{type:'gridJitter', cell:16, jitter:0.5},
   radius:[10,14], aspect:[0.2,0.5], rotation:[-0.3,0.3],
   intensity:[1,2], falloff:'smoothstep' }


Внутри генератора kind — это просто сборник преднастроек, который разворачивается в одинаковые по форме GfxTerrainOp (эллипсы с falloff). Никакой магии.

## Параметры по умолчанию (рекомендованные диапазоны)
- radius: лес/равнина 6–14; горы 12–30
- aspect: 0.4–1.6 (чем дальше от 1, тем вытянутее)
- intensity: равнина 1–3; горы 4–8
- falloff: smoothstep — почти всегда лучший визуально (мягко), gauss — для выемок/кратеров, linear — для «жёстких форм»
- poisson.minDistance: ≈ mean(radius)*1.2…1.8
- gridJitter.jitter: 0.3–0.6

## Пример полного спека
```
const spec: ProceduralTerrainSpec = {
world: { width: 200, height: 200, edgeFade: 0.12 },
base: { // Perlin
seed: 1234, octaveCount: 4, amplitude: 7, persistence: 0.45,
grid: { width: 64, height: 64 }, offset: [0,0]
},
pool: {
global: { intensityScale: 1, maxOps: 400 },
recipes: [
// холмы + котловины
{ kind:'hill',   count:[10,18], placement:{type:'poisson',minDistance:22}, radius:[8,18], aspect:[0.8,1.3], intensity:[2,4], falloff:'smoothstep' },
{ kind:'basin',  count:[4,7],   placement:{type:'poisson',minDistance:30}, radius:[12,20],aspect:[0.6,1.2], intensity:[3,6], falloff:'gauss' },

      // центральная долина
      { kind:'stroke', mode:'sub', count:1, placement:{type:'alongSpline', splineId:'valley'}, radius:[10,16], aspect:[0.4,0.7], step:8, intensity:[4,7], falloff:'gauss' },

      // редкие плато
      { kind:'plateau', count:[2,3], placement:{type:'poisson',minDistance:35}, radius:[16,24], aspect:[0.9,1.1], intensity:[3,5], falloff:'linear' },
    ]
},
seed: 999 // верхнеуровневый seed; внутри делишь на подпотоки
}
```


Вызов:
```
const cfg = await sceneApi.generateProceduralTerrain(spec) // -> GfxTerrainConfig + ops[]
// дальше строишь сэмплер/геометрию как обычно
```

## Детали реализации (важные, но простые)

- Детерминизм. Сделай rng = mulberry32(hash(seed, scope)); для каждого recipe используй свой scope (e.g. 'hill', 'basin').

- Порядок применения. Сначала set, потом sub, затем add — предсказуемее композиция.

- Нормализация. Если опасаешься переполнения/ступенек, после сборки ops можешь «мягко» отнормировать амплитуды (clamp по перцентилю).

- Bias по уклону. preferSlope требует getNormal → рассчитай местный наклон (1-|ny|) и фильтруй кандидатов.

- Производительность. Генератор работает на метаданных (ops), а не перестраивает геометрию каждый раз. Геометрию пересобираешь уже после смены cfg.ops.
