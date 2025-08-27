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
  world: { width: 200, height: 200, edgeFade: 0.1 },
  base: { 
    seed: 42, 
    amplitude: 8, 
    octaveCount: 3, 
    persistence: 0.4, 
    width: 64, 
    height: 64 
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
  world: { width: 300, height: 200, edgeFade: 0.15 },
  base: { 
    seed: 1001, 
    octaveCount: 4, 
    amplitude: 6, 
    persistence: 0.5, 
    width: 80, 
    height: 60 
  },
  pool: {
    global: { intensityScale: 1.2, maxOps: 40 },
    recipes: [
      // Горная цепь по северному краю
      {
        kind: 'ridge',
        count: [8, 12],
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: 0, z: 160, width: 300, height: 40 }
        },
        radius: [15, 25],
        aspect: [0.3, 0.5],
        intensity: [8, 15],
        step: 20,
        falloff: 'smoothstep'
      },
      // Горы по южному краю
      {
        kind: 'hill',
        count: [6, 10],
        placement: { 
          type: 'uniform',
          area: { kind: 'rect', x: 0, z: 0, width: 300, height: 40 }
        },
        radius: [12, 20],
        intensity: [6, 12],
        falloff: 'gauss'
      },
      // Центральная долина
      {
        kind: 'valley',
        count: 1,
        placement: { type: 'uniform' },
        center: [150, 100],
        radius: 60,
        radiusZ: 40,
        intensity: 8,
        falloff: 'smoothstep'
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

**Что получится:** Продолговатая долина с пологими склонами, окруженная горными цепями с севера и юга.

### 2. Вулканический остров

```javascript
const islandSpec = {
  world: { width: 200, height: 200, edgeFade: 0.3 },
  base: { 
    seed: 2024, 
    octaveCount: 5, 
    amplitude: 4, 
    persistence: 0.6, 
    width: 64, 
    height: 64 
  },
  pool: {
    global: { intensityScale: 1.0, maxOps: 25 },
    recipes: [
      // Центральный вулкан
      {
        kind: 'crater',
        count: 1,
        placement: { type: 'ring', center: [100, 100], rMin: 0, rMax: 5 },
        radius: [25, 30],
        intensity: [15, 20],
        falloff: 'gauss'
      },
      // Холмы вокруг вулкана
      {
        kind: 'hill',
        count: [8, 12],
        placement: { type: 'ring', center: [100, 100], rMin: 40, rMax: 70 },
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
  world: { width: 400, height: 300, edgeFade: 0.2 },
  base: { 
    seed: 3333, 
    octaveCount: 3, 
    amplitude: 2, 
    persistence: 0.3, 
    width: 32, 
    height: 32,
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
        placement: { type: 'uniform', area: { kind: 'rect', x: 150, z: 120, width: 100, height: 80 } },
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
  world: { width: 250, height: 250, edgeFade: 0.1 },
  base: { 
    seed: 4444, 
    octaveCount: 4, 
    amplitude: 5, 
    persistence: 0.4, 
    width: 60, 
    height: 60 
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

#### `sceneApi.generateTerrainOpsFromPool(pool, seed, options?)`
Генерирует только операции модификации рельефа.

```javascript
const ops = await sceneApi.generateTerrainOpsFromPool({
  global: { maxOps: 30 },
  recipes: [/* рецепты */]
}, 12345, {
  worldWidth: 200,
  worldHeight: 200,
  area: { kind: 'circle', center: [100, 100], radius: 80 }
})

console.log(`Создано ${ops.length} операций:`, ops)
```

### Структура спецификации террейна

```javascript
const spec = {
  // Мир - размеры и общие настройки
  world: {
    width: 200,        // ширина в мировых единицах (метрах)
    height: 200,       // высота в мировых единицах
    edgeFade: 0.1      // затухание к краям (0-1), создает мягкую рамку
  },
  
  // База - подложка из шума Perlin
  base: {
    seed: 42,          // зерно для детерминированности
    octaveCount: 4,    // слои шума: больше = сложнее рельеф
    amplitude: 8,      // максимальная высота базы
    persistence: 0.5,  // затухание между слоями: меньше = глаже
    width: 64,         // разрешение сетки шума
    height: 64,
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
  
  seed: 42  // общий seed для воспроизводимости
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
  rotation: [0, Math.PI],   // поворот (радианы)
  falloff: 'smoothstep'     // как затухает к краям
}
```

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
  area: { kind: 'rect', x: 50, z: 50, width: 100, height: 100 }  // опционально
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

### Реалистичный горный массив

Скопируйте в **Scripting Panel**:

```javascript
const mountainRangeSpec = {
  world: { width: 500, height: 300, edgeFade: 0.2 },
  base: { 
    seed: 7777, 
    octaveCount: 6, 
    amplitude: 12, 
    persistence: 0.65, 
    width: 128, 
    height: 80 
  },
  pool: {
    global: { intensityScale: 1.3, maxOps: 70 },
    recipes: [
      // Главный хребет
      {
        kind: 'ridge',
        count: 1,
        placement: { type: 'uniform', center: [250, 150] },
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
        placement: { type: 'ring', center: [250, 150], rMin: 80, rMax: 150 },
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
  world: { width: 400, height: 200, edgeFade: 0.25 },
  base: { 
    seed: 9999, 
    octaveCount: 3, 
    amplitude: 3, 
    persistence: 0.4, 
    width: 64, 
    height: 32 
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
          area: { kind: 'rect', x: 200, z: 0, width: 200, height: 200 }
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
          area: { kind: 'rect', x: 150, z: 0, width: 100, height: 200 }
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
          area: { kind: 'rect', x: 280, z: 0, width: 120, height: 200 }
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
  world: { width: 100, height: 100 },  // маленький мир
  base: { 
    width: 32, height: 32,             // низкое разрешение
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
  world: { width: 300, height: 300 },
  base: { seed: 1000, octaveCount: 4, amplitude: 5, persistence: 0.4, width: 64, height: 64 },
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
  world: { width: 250, height: 250, edgeFade: 0.15 },
  base: { seed: 5555, octaveCount: 5, amplitude: 8, persistence: 0.5, width: 80, height: 80 },
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
