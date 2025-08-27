# Система террейнов (ландшафтные слои) в ScriptingPanel

> **Создавайте реалистичные ландшафты программно** — от простых холмов до сложных архипелагов с помощью процедурной генерации в панели скриптинга Qryleth.

---

## 🎮 Что такое Scripting Panel?

**Scripting Panel** — встроенная панель программирования в Qryleth, где вы можете писать JavaScript-код для управления сценой в реальном времени.

> 📖 **Полная документация:** [ScriptingPanel](scripting-panel.md) - подробное описание архитектуры, функций автодополнения, ИИ-генерации и всех возможностей панели.

**Где найти:** В интерфейсе Qryleth откройте панель "Скриптинг" (обычно справа или внизу экрана).

**Что доступно в скриптах:**
- `sceneApi` — основной объект для управления сценой и террейнами
- `console` — для вывода результатов в консоль браузера (F12)
- Стандартные JavaScript объекты (Math, Array, Object, etc.)

**Особенности выполнения:**
- Код выполняется мгновенно по нажатию "Выполнить"
- Поддерживается `await` для асинхронных операций
- Результаты видны сразу в сцене и в консоли браузера
- Все ошибки показываются в консоли

---

## 🚀 Быстрый старт

### Способы создания террейнов в Qryleth:

#### А) 📱 Простой способ (через UI)
1. Scene Manager → "Добавить слой" → "Форма поверхности" → "Рельефная поверхность"
2. Выберите "Perlin" → установите параметры
3. Нажмите "Создать"

#### Б) 💻 Программный способ (через ScriptingPanel)
Откройте **Scripting Panel** и вставьте код:

```javascript
// Создать простые холмы за 30 секунд
const result = await sceneApi.createProceduralLayer({
  // Координаты центрированы: X ∈ [-width/2..+width/2], Z ∈ [-depth/2..+depth/2]
  world: { width: 200, depth: 200, edgeFade: 0.1 },
  base: { 
    seed: 42, 
    amplitude: 8, 
    octaveCount: 3, 
    persistence: 0.4, 
    width: 128, 
    height: 128 
  },
  pool: { recipes: [] }, // без дополнительных операций
  seed: 42
}, { 
  name: 'Мои первые холмы', 
  visible: true 
})

console.log('Результат:', result)
```

Нажмите **"Выполнить"** — террейн появится в сцене мгновенно!

---

## 🎯 Готовые решения для копирования

### 1. Долина с горами по краям

Вставьте в **Scripting Panel**:

```javascript
const valleySpec = {
  // Мир 300×200 (X×Z). Диапазоны: X [-150..150], Z [-100..100]
  world: { width: 300, depth: 200, edgeFade: 0.15 },
  base: {
    seed: 1001,
    octaveCount: 4,
    amplitude: 6,
    persistence: 0.5,
    width: 128,
    height: 128
  },
  pool: {
    // Увеличиваем бюджет операций, чтобы все рецепты попали в результат
    global: { intensityScale: 1.2, maxOps: 150 },
    recipes: [
      // Центральная долина на всю ширину — сначала, чтобы гарантировать попадание в бюджет
      {
        kind: 'valley',
        count: 1,
        // Центр в (0,0), один длинный штрих вдоль X (rotation по умолчанию = 0)
        placement: { type: 'ring', center: [0, 0], rMin: 0, rMax: 0 },
        radius: 50,                 // больше радиус — лучше перекрытие штрихов
        aspect: [0.7, 0.9],         // толщина долины по Z
        intensity: 8,
        step: 50,                   // 5 центров: [-100, -50, 0, 50, 100] → укладываются в ширину 300
        falloff: 'smoothstep'
      },
      // Горы по южному краю — чуть дальше от края, чтобы edgeFade не гасил высоту
      {
        kind: 'hill',
        count: [8, 12],
        placement: {
          type: 'uniform',
          area: { kind: 'rect', x: -150, z: -80, width: 300, depth: 40 }
        },
        radius: [14, 22],
        intensity: [7, 14],
        falloff: 'gauss'
      },
      // Горная цепь по северному краю — гряды толще по Z и длиннее
      {
        kind: 'ridge',
        count: [10, 14],
        placement: {
          type: 'uniform',
          area: { kind: 'rect', x: -150, z: 60, width: 300, depth: 40 }
        },
        radius: [18, 26],
        aspect: [0.9, 1.3],
        intensity: [8, 15],
        step: 25,
        falloff: 'smoothstep'
        // rotation: [-0.05, 0.05],
        // randomRotationEnabled: true
      }
    ]
  },
  seed: 1001
}

const layer = await sceneApi.createProceduralLayer(valleySpec, {
  name: 'Долина Драконов',
  visible: true
})

console.log('Создана долина:', layer)
```

**Что получится:** Долина, проходящая через весь мир вдоль оси X, с пологими склонами; южные холмы ясно видимы (вынесены от края), северные гряды — более «толстые» по Z и протяжённые.

### 2. Вулканический остров

```javascript
const islandSpec = {
  // Круглый остров, центр мира — [0,0]
  world: { width: 200, depth: 200, edgeFade: 0.3 },
  base: { 
    seed: 2024, 
    octaveCount: 5, 
    amplitude: 4, 
    persistence: 0.6, 
    width: 128, 
    height: 128 
  },
  pool: {
    global: { intensityScale: 1.0, maxOps: 25 },
    recipes: [
      // Центральный вулкан
      {
        kind: 'crater',
        count: 1,
        placement: { type: 'ring', center: [0, 0], rMin: 0, rMax: 5 },
        radius: [25, 30],
        intensity: [15, 20],
        falloff: 'gauss'
      },
      // Холмы вокруг вулкана
      {
        kind: 'hill',
        count: [8, 12],
        placement: { type: 'ring', center: [0, 0], rMin: 40, rMax: 70 },
        radius: [8, 15],
        intensity: [4, 8],
        falloff: 'smoothstep',
        bias: { avoidOverlap: true }
      },
      // Прибрежные утесы
      {
        kind: 'ridge',
        count: [4, 6],
        placement: { type: 'ring', center: [100, 100], rMin: 80, rMax: 95 },
        radius: [6, 12],
        aspect: [0.2, 0.4],
        intensity: [3, 6],
        step: 15,
        falloff: 'linear'
      }
    ]
  },
  seed: 2024
}

const island = await sceneApi.createProceduralLayer(islandSpec, {
  name: 'Вулканический остров',
  visible: true
})

console.log('Создан остров:', island)
```

**Что получится:** Круглый остров с кратером в центре, окруженным холмами и прибрежными утесами.

### 3. Архипелаг (группа островов)

```javascript
const archipelagoSpec = {
  // Мир 400×300 (X×Z). Диапазоны: X [-200..200], Z [-150..150]
  world: { width: 400, depth: 300, edgeFade: 0.2 },
  base: { 
    seed: 3333, 
    octaveCount: 3, 
    amplitude: 2, 
    persistence: 0.3, 
    width: 128, 
    height: 128,
    // Ключ: опускаем базовый уровень ниже 0,
    // чтобы над водой оставались только острова.
    heightOffset: -1.5
  },
  pool: {
    global: { intensityScale: 1.5, maxOps: 60 },
    recipes: [
      // Главный остров
      {
        kind: 'hill',
        count: 1,
        // Прямоугольник в пределах Z: [70..150], X: [150..250]
        placement: { type: 'uniform', area: { kind: 'rect', x: 150, z: 70, width: 100, depth: 80 } },
        radius: [40, 50],
        intensity: [12, 18],
        falloff: 'smoothstep'
      },
      // Средние острова
      {
        kind: 'plateau',
        count: [3, 5],
        placement: { type: 'poisson', minDistance: 80 },
        radius: [20, 35],
        intensity: [6, 10],
        falloff: 'linear',
        bias: { preferHeight: { min: -1, max: 2, weight: 0.7 } }
      },
      // Мелкие островки
      {
        kind: 'hill',
        count: [8, 15],
        placement: { type: 'uniform' },
        radius: [5, 12],
        intensity: [2, 5],
        falloff: 'gauss',
        bias: { 
          preferHeight: { min: -2, max: 1, weight: 0.8 },
          avoidOverlap: true 
        }
      }
    ]
  },
  seed: 3333
}

const archipelago = await sceneApi.createProceduralLayer(archipelagoSpec, {
  name: 'Тропический архипелаг',
  visible: true
})

console.log('Создан архипелаг:', archipelago)
```

**Что получится:** Группа островов разного размера, рассеянных по водной поверхности. Благодаря `base.heightOffset < 0` база находится ниже нулевого уровня (под водой), а над водой видны только возвышенности.

### 4. Холмистая местность

```javascript
const hillsSpec = {
  world: { width: 250, depth: 250, edgeFade: 0.1 },
  base: { 
    seed: 4444, 
    octaveCount: 4, 
    amplitude: 5, 
    persistence: 0.4, 
    width: 128, 
    height: 128 
  },
  pool: {
    global: { intensityScale: 0.8, maxOps: 50 },
    recipes: [
      // Крупные холмы
      {
        kind: 'hill',
        count: [12, 18],
        placement: { type: 'poisson', minDistance: 25 },
        radius: [15, 25],
        aspect: [0.8, 1.2],
        intensity: [4, 8],
        falloff: 'smoothstep',
        rotation: [0, Math.PI * 2]
      },
      // Мелкие холмики для детализации
      {
        kind: 'hill',
        count: [20, 30],
        placement: { type: 'uniform' },
        radius: [5, 12],
        intensity: [1, 3],
        falloff: 'gauss',
        bias: { avoidOverlap: true }
      }
    ]
  },
  seed: 4444
}

const hills = await sceneApi.createProceduralLayer(hillsSpec, {
  name: 'Пасторальные холмы',
  visible: true
})

console.log('Созданы холмы:', hills)
```

**Что получится:** Мягкие перекатывающиеся холмы различной высоты, создающие естественный пасторальный ландшафт.

---

## 📚 Руководство по программированию в ScriptingPanel

### Доступные методы sceneApi

В **Scripting Panel** вам доступен объект `sceneApi` с методами для управления террейнами:

#### `sceneApi.createProceduralLayer(spec, layerData?)`
**Основной метод** — создает слой террейна и размещает объекты.

```javascript
const result = await sceneApi.createProceduralLayer(
  spec,      // спецификация террейна (объект ниже)
  layerData  // опциональные данные слоя: { name?, visible?, position? }
)

console.log(result) // { success: boolean, layerId?: string, error?: string }
```

#### `sceneApi.generateProceduralTerrain(spec)`
Генерирует только конфигурацию террейна без создания слоя.

```javascript
const config = await sceneApi.generateProceduralTerrain(spec)
console.log('Конфигурация террейна:', config)
```

#### `sceneApi.generateTerrainOpsFromPool(pool, seed?, options?)`
Генерирует только операции модификации рельефа.

```javascript
const ops = await sceneApi.generateTerrainOpsFromPool({
  global: { maxOps: 30 },
  recipes: [/* рецепты */]
}, 12345, {
  worldWidth: 200,
  worldDepth: 200,
  area: { kind: 'circle', x: 100, z: 100, radius: 80 }
})

console.log(`Создано ${ops.length} операций:`, ops)

// Можно не указывать seed — он будет сгенерирован автоматически:
const opsAuto = await sceneApi.generateTerrainOpsFromPool({
  global: { maxOps: 30 },
  recipes: [/* рецепты */]
}, undefined, {
  worldWidth: 200,
  worldDepth: 200
})
```

### Структура спецификации террейна

```javascript
const spec = {
  // Мир - размеры и общие настройки
  world: {
    width: 200,        // ширина в мировых единицах (метрах)
    depth: 200,        // глубина по оси Z (мировые единицы)
    edgeFade: 0.1      // затухание к краям (0-1), создает мягкую рамку
  },
  
  // База - подложка из шума Perlin
  base: {
    seed: 42,          // зерно для детерминированности
    octaveCount: 4,    // слои шума: больше = сложнее рельеф
    amplitude: 8,      // максимальная высота базы
    persistence: 0.5,  // затухание между слоями: меньше = глаже
    width: 128,        // разрешение сетки шума
    height: 128,
    heightOffset: 0    // смещение базового уровня (может быть отрицательным)
  },
  
  // Пул операций - что добавляем поверх базы
  pool: {
    global: {
      intensityScale: 1.0,  // общий множитель высот
      maxOps: 50           // максимум операций
    },
    recipes: [/* массив рецептов ниже */]
  },
  
  seed: 42  // общий seed для воспроизводимости (опционально)
}
```

### Рецепты рельефа в ScriptingPanel

**hill (холм)** - поднимает рельеф в форме холма:
```javascript
{
  kind: 'hill',
  count: [5, 10],           // сколько холмов создать
  radius: [10, 20],         // размер по X
  aspect: [0.8, 1.2],       // отношение Z/X (1.0 = круглый)
  intensity: [4, 8],        // высота подъема
  rotation: [0, Math.PI],   // поворот (радианы). Если не задан, по умолчанию 0
  falloff: 'smoothstep'     // как затухает к краям
}
```

Примечание по `rotation`:
- Поле задаёт угол поворота в плоскости XZ: 0 — вдоль оси X, `π/2` — вдоль оси Z.
- Допустимо фиксированное значение через диапазон одинаковых границ: например, `[0, 0]`.
- Нюанс исправлен: нулевой угол теперь обрабатывается как «реальный 0», а не случайный поворот. То есть `rotation: [0, 0]` фиксирует направление строго вдоль оси X.
- По умолчанию, если `rotation` не указан, угол считается равным 0 (ориентация вдоль X).
- Чтобы включить случайный поворот по умолчанию, укажите `randomRotationEnabled: true`. Если задан и `rotation`, и флаг — приоритет у `rotation`.

**valley (долина)** - понижает рельеф:
```javascript
{
  kind: 'valley',
  step: 25,                 // если указан - создает серию "штрихов"
  // остальные параметры как у hill
}
```

**crater (кратер)** - выемка с валом по краю:
```javascript
{
  kind: 'crater',
  radius: 30,               // размер кратера
  intensity: 10,            // глубина + высота вала
  falloff: 'gauss'          // острые края
}
```

**plateau (плато)** - плоская возвышенность:
```javascript
{
  kind: 'plateau',
  falloff: 'linear'         // для более "плоской" вершины
}
```

**ridge, basin, dune, terrace** - другие доступные типы рельефа.

### Размещение: где создавать рельеф

**uniform** - случайно по всему миру или области:
```javascript
placement: { 
  type: 'uniform',
  area: { kind: 'rect', x: 50, z: 50, width: 100, depth: 100 }  // опционально
}
```

**poisson** - разреженно с минимальной дистанцией:
```javascript
placement: { 
  type: 'poisson', 
  minDistance: 30  // избегает скучивания
}
```

**ring** - кольцом вокруг точки:
```javascript
placement: { 
  type: 'ring', 
  center: [100, 100], 
  rMin: 20, 
  rMax: 50 
}
```

**gridJitter** - сетка с дрожанием:
```javascript
placement: { 
  type: 'gridJitter', 
  cell: 25,      // размер ячейки
  jitter: 0.5    // размах дрожания (0-1)
}
```

### Умные фильтры (bias) в ScriptingPanel

```javascript
bias: {
  // Предпочитать определенные высоты
  preferHeight: { min: 2, max: 8, weight: 0.8 },
  
  // Предпочитать определенные склоны (требует sampler)
  preferSlope: { min: 0, max: 0.2, weight: 0.6 },
  
  // Избегать пересечений
  avoidOverlap: true
}
```

### Функции затухания

- **smoothstep** (по умолчанию) - плавные края, универсальный выбор
- **gauss** - острый пик с быстрым спадом, для "драматических" форм
- **linear** - жесткие края, для плато и ступеней

Примечание: затухание по краям мира (`edgeFade`) интерполирует высоту к
базовому уровню источника (для Perlin это `base.heightOffset`, если задан, иначе 0),
а не к жёсткому нулю. Это позволяет корректно опускать базу ниже уровня воды.

---

## 🎨 Продвинутые примеры для ScriptingPanel

### Параметр step для ridge/valley (как тянуть гряды и долины)

Параметр `step` используется ТОЛЬКО для типов `ridge` и `valley`. Если он задан (`> 0`), рецепт генерирует серию из пяти эллипсов вдоль линии через центр:

- Центры располагаются с шагом `step` на позициях `i = -2, -1, 0, +1, +2` относительно центральной точки.
- Направление линии задаёт `rotation` (0 — вдоль X, `π/2` — вдоль Z). Если `rotation` не указан, по умолчанию 0.
- Каждый из пяти эллипсов берёт параметры `radius`, `aspect`, `intensity`, `falloff` рецепта.
- Если `step` не указан или `<= 0` — создаётся один эллипс (короткая «клякса», а не протяжённая гряда/долина).

Практика и формулы
- Оценка длины «штриха» (вдоль направления линии): примерно `4*step + 2*radiusX`, где `radiusX = radius` (главный радиус вдоль оси вращения до учёта `rotation`).
- Чтобы крайние эллипсы не «выпали» за границы мира при центре в (0,0), держите: `2*step + radiusX ≤ world.width/2` (для `rotation ≈ 0`).
- Толщина гряды/долины поперёк линии управляется `aspect` (отношение `Rz/Rx`). Значения `< 1` делают форму уже по Z, `> 1` — толще по Z.

Примеры
- «Один длинный штрих через весь мир» (ширина 300): `radius: 50`, `step: 50`, `rotation: [0, 0]` → центры на `x ≈ [-100, -50, 0, 50, 100]` — вся ширина покрыта.
- «Короткие гряды» для детализации: `radius: [12, 18]`, `step: 12..18`, `aspect: [0.8, 1.2]` — локальные вытянутые формы без полного «прохода».

Советы
- Сначала добейтесь правильного направления (`rotation`) и шага (`step`), затем подстраивайте `radius` и `aspect` для визуальной слитности.
- Если видите «три ямы» вместо одной долины на всю ширину — крайние центры вышли за пределы мира или их «съел» `edgeFade`. Уменьшите `step` или увеличьте `radius`.

### Бюджет операций (global.maxOps) — что это и как применять

`pool.global.maxOps` ограничивает ОБЩЕЕ число операций рельефа ПОСЛЕ развёртки рецептов. Это важно, поскольку некоторые рецепты порождают несколько операций на один центр:

- `ridge`, `valley` с `step > 0` → 5 операций на один центр.
- `crater` → 2 операции (яма + вал).
- `terrace` → несколько концентрических «ступеней» (обычно 4).
- `hill`, `basin`, `plateau`, `dune` → 1 операция.

Генератор идёт по рецептам по порядку и добавляет выбранные операции, пока не достигнут `maxOps`. Остальные отсекаются. Поэтому порядок рецептов влияет на результат.

Рекомендации
- Критически важные формы (например, «долина на всю ширину») ставьте первыми в `recipes`.
- Оценивайте бюджет: `примерноОп = Σ(кол-во центров × операцийНаЦентр)` и выбирайте `maxOps` с запасом.
- Типичные ориентиры (для небольших сцен 200–300 м):
  - Базовая сцена с несколькими грядами и холмами: `maxOps: 80–120`.
  - Много мелкой детализации (кратеры/террасы): `maxOps: 120–200`.
- Если сцена «не дотягивает» по формам — увеличьте `maxOps` или уменьшите `count` у «прожорливых» рецептов (`ridge/valley/crater/terrace`).
- Помните, что bias-фильтры и ограничение областей (`placement.area`) могут уменьшить фактическое число операций — это нормально.


### Реалистичный горный массив

Скопируйте в **Scripting Panel**:

```javascript
const mountainRangeSpec = {
  world: { width: 500, depth: 300, edgeFade: 0.2 },
  base: {
    seed: 7777, 
    octaveCount: 6, 
    amplitude: 12, 
    persistence: 0.65, 
    width: 128, 
    height: 128 
  },
  pool: {
    global: { intensityScale: 1.3, maxOps: 70 },
    recipes: [
      // Главный хребет
      {
        kind: 'ridge',
        count: 1,
        // Главный хребет в центре мира
        placement: { type: 'ring', center: [0, 0], rMin: 0, rMax: 2 },
        radius: 120,
        aspect: 0.25,
        intensity: 20,
        step: 30,
        rotation: Math.PI * 0.15,
        falloff: 'smoothstep'
      },
      // Боковые отроги
      {
        kind: 'ridge',
        count: [6, 10],
        placement: { type: 'ring', center: [0, 0], rMin: 80, rMax: 150 },
        radius: [25, 50],
        aspect: [0.2, 0.4],
        intensity: [8, 15],
        step: [15, 25],
        rotation: [0, Math.PI * 2],
        falloff: 'gauss',
        bias: { preferHeight: { min: 8, max: 25, weight: 0.7 } }
      },
      // Пики
      {
        kind: 'hill',
        count: [10, 15],
        placement: { type: 'poisson', minDistance: 35 },
        radius: [8, 15],
        intensity: [6, 12],
        falloff: 'gauss',
        bias: { 
          preferHeight: { min: 15, max: 40, weight: 0.9 },
          preferSlope: { min: 0.1, max: 0.6, weight: 0.5 }
        }
      }
    ]
  },
  seed: 7777
}

const mountains = await sceneApi.createProceduralLayer(mountainRangeSpec, {
  name: 'Горный массив Драконьи Зубы',
  visible: true
})

console.log('Горный массив создан:', mountains)
```

### Прибрежная зона с бухтами

```javascript
const coastalSpec = {
  world: { width: 400, depth: 200, edgeFade: 0.25 },
  base: { 
    seed: 9999, 
    octaveCount: 3, 
    amplitude: 3, 
    persistence: 0.4, 
    width: 128, 
    height: 128 
  },
  pool: {
    global: { intensityScale: 1.1, maxOps: 45 },
    recipes: [
      // Береговая линия (суша)
      {
        kind: 'plateau',
        count: [3, 5],
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: 0, z: -100, width: 200, depth: 200 }
        },
        radius: [40, 70],
        aspect: [0.6, 1.4],
        intensity: [5, 8],
        falloff: 'linear',
        rotation: [Math.PI * 0.4, Math.PI * 0.6]
      },
      // Бухты (углубления)
      {
        kind: 'basin',
        count: [4, 7],
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: -50, z: -100, width: 100, depth: 200 }
        },
        radius: [20, 35],
        aspect: [1.2, 2.0],
        intensity: [4, 7],
        falloff: 'smoothstep',
        bias: { preferHeight: { min: 2, max: 6, weight: 0.8 } }
      },
      // Прибрежные скалы
      {
        kind: 'ridge',
        count: [2, 4],
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: -200, z: -100, width: 120, depth: 200 }
        },
        radius: [15, 25],
        aspect: [0.1, 0.3],
        intensity: [8, 15],
        step: [20, 30],
        falloff: 'linear',
        bias: { avoidOverlap: true }
      }
    ]
  },
  seed: 9999
}

const coast = await sceneApi.createProceduralLayer(coastalSpec, {
  name: 'Изрезанное побережье',
  visible: true
})

console.log('Прибрежная зона создана:', coast)
```

---

## 🔧 Управление созданными террейнами в ScriptingPanel

### Получить информацию о сцене

```javascript
// Общая информация о сцене
const overview = sceneApi.getSceneOverview()
console.log('Общая информация:', overview)

// Статистика сцены
const stats = sceneApi.getSceneStats()
console.log('Статистика:', stats)

// Доступные слои
const layers = sceneApi.getAvailableLayers()
console.log('Слои:', layers)
```

### Выровнять существующие объекты по новому террейну

```javascript
// После создания террейна выровнять все объекты
const terrainResult = await sceneApi.createProceduralLayer(spec, { name: 'Новый террейн' })

if (terrainResult.success && terrainResult.layerId) {
  // Выровнять объекты по новому террейну
  const adjustResult = sceneApi.adjustInstancesForPerlinTerrain(terrainResult.layerId)
  console.log('Выравнивание объектов:', adjustResult)
}
```

### Работа с существующими объектами

```javascript
// Получить все объекты сцены
const objects = sceneApi.getSceneObjects()
objects.forEach(obj => {
  console.log(`Объект: ${obj.name}, экземпляров: ${obj.instanceCount}`)
})

// Добавить экземпляры объектов на террейн
if (objects.length > 0) {
  const instanceResult = sceneApi.addInstances(
    objects[0].uuid,     // UUID первого объекта
    undefined,           // layerId - автоопределение
    5,                   // количество экземпляров
    { strategy: 'RandomNoCollision' }  // без пересечений
  )
  console.log('Созданы экземпляры:', instanceResult)
}
```

---

## 💡 Советы по работе в ScriptingPanel

### Отладка и тестирование

```javascript
// Создать только операции для проверки
const ops = await sceneApi.generateTerrainOpsFromPool(pool, seed, options)
console.log(`Будет создано ${ops.length} операций:`, ops)

// Проверить результат создания
const result = await sceneApi.createProceduralLayer(spec, layerData)
if (result.success) {
  console.log(`✓ Террейн создан с ID: ${result.layerId}`)
} else {
  console.error(`✗ Ошибка: ${result.error}`)
}

// Посмотреть статистику после изменений
const newStats = sceneApi.getSceneStats()
console.log('Новая статистика:', newStats)
```

### Производительность в ScriptingPanel

```javascript
// Начинайте с низкого разрешения для тестирования
const testSpec = {
  world: { width: 100, depth: 100 },  // маленький мир
  base: { 
    width: 128, height: 128,           // детальное разрешение
    octaveCount: 3                     // меньше слоев
  },
  pool: { global: { maxOps: 20 } }     // меньше операций
}

// После проверки увеличивайте параметры
```

### Многоэтапное создание террейнов

```javascript
// Этап 1: Создать базовый ландшафт
const baseResult = await sceneApi.createProceduralLayer({
  world: { width: 300, depth: 300 },
  base: { seed: 1000, octaveCount: 4, amplitude: 5, persistence: 0.4, width: 128, height: 128 },
  pool: { recipes: [] },
  seed: 1000
}, { name: 'Базовый ландшафт' })

console.log('Базовый ландшафт:', baseResult)

// Этап 2: Добавить детали поверх базы
const detailOps = await sceneApi.generateTerrainOpsFromPool({
  recipes: [
    { kind: 'hill', count: [10, 15], placement: { type: 'poisson', minDistance: 20 }, radius: [8, 15], intensity: [2, 5] }
  ]
}, 2000)

console.log('Операции деталей:', detailOps)

// Этап 3: Создать объекты на террейне
const objects = sceneApi.getSceneObjects()
if (objects.length > 0) {
  sceneApi.addInstances(objects[0].uuid, undefined, 10, { strategy: 'RandomNoCollision' })
}
```

### Сохранение конфигураций

```javascript
// Сохранить удачную конфигурацию в переменной для повторного использования
const myFavoriteSpec = {
  world: { width: 250, depth: 250, edgeFade: 0.15 },
  base: { seed: 5555, octaveCount: 5, amplitude: 8, persistence: 0.5, width: 128, height: 128 },
  pool: {
    global: { intensityScale: 1.2, maxOps: 60 },
    recipes: [
      { kind: 'hill', count: [15, 25], placement: { type: 'poisson', minDistance: 20 }, radius: [10, 18], intensity: [3, 7], falloff: 'smoothstep' },
      { kind: 'valley', count: [3, 5], placement: { type: 'uniform' }, radius: [20, 30], intensity: [4, 8] }
    ]
  },
  seed: 5555
}

// Использовать в любой момент:
const terrain1 = await sceneApi.createProceduralLayer(myFavoriteSpec, { name: 'Копия ландшафта 1' })
const terrain2 = await sceneApi.createProceduralLayer({...myFavoriteSpec, seed: 6666}, { name: 'Вариация' })
```

---

## ⚡ Горячие клавиши и ускорения

### Быстрые действия в ScriptingPanel

- **Ctrl+Enter** — Выполнить текущий скрипт
- **F12** — Открыть консоль браузера для просмотра результатов
- **Ctrl+A** — Выделить весь код
- **Ctrl+/** — Закомментировать/раскомментировать строку

### Шаблоны кода

В **Scripting Panel** используйте встроенные шаблоны:
- "Быстрый старт" → базовый пример
- "Процедурные террейны" → готовые решения
- "Продвинутые примеры" → сложные ландшафты

---

*Документация создана для работы в Scripting Panel — встроенной панели программирования Qryleth. Все примеры готовы к копированию и выполнению.*
