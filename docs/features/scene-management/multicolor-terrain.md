# Многоцветная окраска террейна

Система многоцветной окраски позволяет создавать реалистичные ландшафты с плавными цветовыми переходами по высоте.

## Основные возможности

### Параметр окраски

Окраска производится только по высоте поверхности:

- **`height`** - высота точки (в метрах)
- **`alpha`** - прозрачность цвета от 0 (полностью прозрачный) до 1 (полностью непрозрачный)

### Система палитры

Каждая конфигурация использует **palette** для плавных градиентных переходов по высоте:

```typescript
const multiColor: GfxMultiColorConfig = {
  palette: [
    { height: -2, color: '#2e5c8a', alpha: 0.8 },  // Полупрозрачная вода
    { height: 1, color: '#d4b896', alpha: 1.0 },   // Непрозрачный песок  
    { height: 3, color: '#4a7c59', alpha: 1.0 },   // Непрозрачная трава
    { height: 15, color: '#6b6b6b', alpha: 0.9 }   // Слегка прозрачные камни
  ]
}
```

## API для ScriptingPanel

### Основной метод

```javascript
const result = await sceneApi.createProceduralLayer({
  layer: { width: 200, depth: 200 },
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
const { multiColorApi } = await import('@/features/editor/scene/lib/sceneAPI.multicolor')

// Готовые конфигурации
const mountain = multiColorApi.getMountainHeightConfig()
const desert = multiColorApi.getDesertHeightConfig()

// Автоматическая генерация по диапазону
const auto = multiColorApi.createHeightBasedConfig(-5, 25, 6)

// Двухцветный градиент
const gradient = multiColorApi.createTwoColorGradient(
  '#2e5c8a', '#f0f8ff', 5
)

// Тропический/арктический ландшафт
const tropical = multiColorApi.createTropicalConfig(-8, 25)
const arctic = multiColorApi.createArcticConfig(-3, 25)

// Пользовательские цвета
const custom = multiColorApi.createCustomConfig(
  ['#8b4513', '#daa520', '#9acd32', '#228b22'], 
  0, 20
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


## Примеры использования

### Простой пример

```javascript
// Создание горного ландшафта с готовой конфигурацией
const { multiColorApi } = await import('@/features/editor/scene/lib/sceneAPI.multicolor')

const result = await sceneApi.createProceduralLayer({
  layer: { width: 200, depth: 200, edgeFade: 0.15 },
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
  multiColor: multiColorApi.getMountainHeightConfig()
})
```

### Комбинирование с операциями террейна

```javascript
const result = await sceneApi.createProceduralLayer({
  layer: { width: 180, depth: 180, edgeFade: 0.2 },
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
  multiColor: multiColorApi.createTropicalConfig(-8, 25)
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

### Палитра цветов
- Цвета и прозрачность интерполируются линейно между стопами палитры
- Минимум 2 стопа в палитре для корректной работы
- Стопы автоматически сортируются по высоте
- Поле `alpha` необязательно - по умолчанию 1.0 (полностью непрозрачный)
- При наличии прозрачных стопов материал автоматически переключается в режим `transparent`

## Архитектурные компоненты

- **`GfxMultiColorConfig`** - конфигурация многоцветной окраски
- **`MultiColorProcessor`** - основной процессор вычисления цветов
- **`colorUtils.ts`** - утилиты для расчета параметров поверхности
- **`multiColorExamples.ts`** - готовые примеры конфигураций
- **`MultiColorAPI`** - высокоуровневый API для ScriptingPanel

## Ограничения

- Максимум 10 стопов в палитре (рекомендация)
- Окраска производится только по высоте
- Цвета вычисляются только один раз при создании геометрии
