# Многоцветная окраска террейна

Система многоцветной окраски позволяет создавать реалистичные ландшафты с плавными цветовыми переходами на основе параметров поверхности.

## Основные возможности

### Параметры окраски

Поддерживается окраска по трем параметрам поверхности:

- **`height`** - высота точки (в метрах)
- **`slope`** - наклон поверхности (0-1, где 0 = горизонтально, 1 = вертикально)  
- **`curvature`** - кривизна поверхности (0-1, где 0 = плоско, 1 = максимальная кривизна)

### Зональная система

Каждая конфигурация состоит из **цветовых зон** с плавными **градиентными переходами**:

```typescript
const multiColor: GfxMultiColorConfig = {
  parameter: 'height',
  blendWidth: 1.5, // ширина зоны градиентного перехода
  zones: [
    { id: 'water', name: 'Вода', color: '#2e5c8a', min: -2, max: 0.5 },
    { id: 'sand', name: 'Песок', color: '#d4b896', min: 1, max: 2.5 },
    { id: 'grass', name: 'Трава', color: '#4a7c59', min: 3, max: 8 },
    { id: 'rocks', name: 'Камни', color: '#6b6b6b', min: 15, max: 25 }
  ]
}
```

## API для ScriptingPanel

### Основной метод

```javascript
const result = await sceneApi.createProceduralLayer({
  world: { width: 200, depth: 200 },
  base: { seed: 1000, octaveCount: 4, amplitude: 10 },
  pool: { recipes: [] },
  seed: 1000
}, {
  name: 'Многоцветный ландшафт',
  multiColor: multiColorConfig // <- новый параметр
})
```

### Утилиты MultiColorAPI

```javascript
// Импорт утилит
const { multiColorApi } = await import('@/features/scene/lib/sceneAPI.multicolor')

// Готовые конфигурации
const mountain = multiColorApi.getMountainHeightConfig(1.5)
const desert = multiColorApi.getDesertHeightConfig(2.0)
const slope = multiColorApi.getSlopeBasedConfig(0.1)
const curvature = multiColorApi.getCurvatureBasedConfig(0.02)

// Автоматическая генерация по диапазону
const auto = multiColorApi.createHeightBasedConfig(-5, 25, 6, 1.2)

// Двухцветный градиент
const gradient = multiColorApi.createTwoColorGradient(
  'height', '#2e5c8a', '#f0f8ff', 5, 2.0
)

// Тропический/арктический ландшафт
const tropical = multiColorApi.createTropicalConfig(-8, 25, 1.8)
const arctic = multiColorApi.createArcticConfig(-3, 25, 0.8)

// Пользовательские цвета
const custom = multiColorApi.createCustomConfig(
  'height',
  ['#8b4513', '#daa520', '#9acd32', '#228b22'], 
  0, 20, 1.0,
  ['Пустыня', 'Степь', 'Луга', 'Лес']
)
```

## Готовые preset'ы

### Горный ландшафт
```javascript
multiColorApi.getMountainHeightConfig()
```
Переходы: глубокая вода → мелководье → пляж → луга → лес → камни → снег

### Пустынный ландшафт  
```javascript
multiColorApi.getDesertHeightConfig()
```
Переходы: оазис → низкие пески → дюны → скалы → утесы

### По наклону поверхности
```javascript
multiColorApi.getSlopeBasedConfig()
```
Выделяет: равнины → холмы → склоны → утесы

### По кривизне поверхности
```javascript
multiColorApi.getCurvatureBasedConfig()  
```
Выделяет: впадины → плоские участки → изгибы → острые хребты

## Примеры использования

### Простой пример

```javascript
// Создание горного ландшафта с готовой конфигурацией
const { multiColorApi } = await import('@/features/scene/lib/sceneAPI.multicolor')

const result = await sceneApi.createProceduralLayer({
  world: { width: 200, depth: 200, edgeFade: 0.15 },
  base: { 
    seed: 2000, 
    octaveCount: 5, 
    amplitude: 12,
    heightOffset: -2
  },
  pool: { recipes: [] },
  seed: 2000
}, { 
  name: 'Горный ландшафт',
  multiColor: multiColorApi.getMountainHeightConfig(1.5)
})
```

### Комбинирование с операциями террейна

```javascript
const result = await sceneApi.createProceduralLayer({
  world: { width: 180, depth: 180, edgeFade: 0.2 },
  base: { 
    seed: 4000, 
    octaveCount: 6, 
    amplitude: 15,
    heightOffset: -5
  },
  pool: {
    recipes: [
      { 
        kind: 'hill', 
        count: [3, 5], 
        placement: { type: 'center' }, 
        radius: [30, 45], 
        intensity: [8, 15]
      }
    ]
  },
  seed: 4000
}, { 
  name: 'Тропический остров',
  multiColor: multiColorApi.createTropicalConfig(-8, 25, 1.8)
})
```

## Технические особенности

### Производительность
- Цвета вычисляются один раз при создании геометрии
- Используются vertex colors для эффективного рендеринга
- Нет влияния на производительность во время выполнения

### Обратная совместимость
- Поле `color` продолжает работать для одноцветных слоев
- При наличии `multiColor` поле `color` игнорируется
- Старые слои работают без изменений

### Параметры blendWidth
- **Маленькие значения** (0.1-0.5): резкие переходы между зонами
- **Средние значения** (1.0-2.0): плавные натуральные переходы  
- **Большие значения** (3.0+): очень мягкие размытые границы

## Архитектурные компоненты

- **`GfxMultiColorConfig`** - конфигурация многоцветной окраски
- **`MultiColorProcessor`** - основной процессор вычисления цветов
- **`colorUtils.ts`** - утилиты для расчета параметров поверхности
- **`multiColorExamples.ts`** - готовые примеры конфигураций
- **`MultiColorAPI`** - высокоуровневый API для ScriptingPanel

## Ограничения

- Максимум 10 цветовых зон в одной конфигурации (рекомендация)
- Параметр `curvature` может быть вычислительно затратным на очень больших сетках
- Параметр `slope` работает корректно только с рельефными поверхностями