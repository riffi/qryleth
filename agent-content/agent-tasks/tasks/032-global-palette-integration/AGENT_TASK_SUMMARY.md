---
id: 32
epic: null
title: "Внедрение глобальной палитры цветов (PaletteRegistry, ColorSource, интеграция в сцену)"
status: in-progress
created: 2025-09-08
updated: 2025-09-08
owner: team-ui
tags: [palette, rendering, materials, terrain, water, editor, sceneAPI]
phases:
  total: 8
  completed: 2
---

# Внедрение глобальной палитры цветов

## Контекст
В проекте требуется ввести глобальные палитры цветов, влияющие на базовый цвет материалов и визуальные элементы сцены. По согласованной постановке:
- Ссылка на активную палитру хранится в `environmentContent.paletteUuid`.
- Палитра влияет на:
  - `properties.color` материалов объектов через новый источник `properties.colorSource` (fixed|role).
  - Цвета террейна в многоцветной окраске (стопы `GfxMultiColorPaletteStop` через `colorSource`).
  - Цвет простой воды (simple) — два униформа: base и осветлённый на +20% (HSV Value).
  - Фон сцены (`lighting.backgroundColor`) и туман (`lighting.fog.color`). Процедурный Sky не трогаем.
- Роли палитры: sky, fog, water, foliage, wood, rock, metal, sand, ground, snow, accent.
- Глобальные материалы WOOD→wood, METAL→metal, EARTH→ground, STONE→rock переводим на роли; glass/gold/copper/plastic/rubber/ceramic остаются fixed.
- Tint: диапазон [-1..+1], применяется в HSV (Value). Для террейна — сначала интерполяция, затем tint. Для стопов разрешён собственный tint.
- Backward compatibility: сцены без палитры открываются с QRYLETH_DEFAULT; существующие материалы считаются fixed, пока пользователь не переключит их на role.
- SceneAPI: нужны методы `listPalettes()` и `setPalette(uuid)`.
- CRUD пользовательских палитр не требуется на данном этапе (только предустановки: DEFAULT и AUTUMN).

## Цели
- Ввести типы палитр и реестр предустановок (PaletteRegistry) с быстрым доступом по uuid.
- Добавить поддержку источника цвета `properties.colorSource` для материалов и для стопов террейна.
- Реализовать корректный резолв ролей с учётом активной палитры и tint (HSV Value), с акцентом на производительность.
- Обеспечить реактивное обновление рендера при смене палитры (материалы, террейн-цвета, вода, фон/туман).
- Дополнить UI: выбор палитры в секции «Окружение», редактор материалов (fixed/role, выбор роли, слайдер tint) с живым предпросмотром.
- Расширить SceneAPI методами управления палитрой и её списком.
- Обновить документацию (типы, поведение, обратная совместимость).

## Критерии готовности
- Смена палитры из UI мгновенно обновляет: фон/туман, simple-воду, цвета материалов объектов (через role), террейн-палитру (при наличии role-стопов).
- Материалы с `fixed` не меняются при смене палитры; `role` — корректно резолвятся из активной палитры с учётом tint.
- MultiColorProcessor пересобирает цвета при смене палитры только если использованы role-стопы; tint у стопов применяется после интерполяции по высоте.
- SceneAPI предоставляет `listPalettes()` и `setPalette(uuid)`; по умолчанию активна QRYLETH_DEFAULT при отсутствии paletteUuid.
- Документация добавлена и отражает принятые решения.

## Риски и ограничения
- Пересборка террейна может быть дорогой на больших сетках — важно триггерить её только при необходимости и избегать лишних инвалидаций.
- Расширение типов материалов и террейна требует аккуратной миграции и обратной совместимости при загрузке старых сцен.
- Нужно внимательно следить за перерендерами при резолве ролей (мемоизация по ключам paletteUuid/role/tint/materialUuid).

## Изменения типов (точно и конкретно)

- `PaletteRole` — набор ролей цветов палитры:
  - Значения: `'sky' | 'fog' | 'water' | 'foliage' | 'wood' | 'rock' | 'metal' | 'sand' | 'ground' | 'snow' | 'accent'`.

- `GlobalPalette` — описание палитры:
  - Поля: `{ uuid: string; name: string; colors: Record<PaletteRole, string> }`.
  - Цвета — строки в HEX (`#rrggbb`).

- `ColorSource` — источник цвета для материалов и террейна:
  - `{ type: 'fixed' }` — использовать текущий `properties.color` (никакого влияния палитры).
  - `{ type: 'role'; role: PaletteRole; tint?: number }` — взять цвет из активной палитры по роли и применить `tint` (диапазон [-1..+1]) к HSV Value с клампингом в [0..1].

- Изменение `GfxMaterial` (apps/qryleth-front/src/entities/material/model/types.ts):
  - Добавить поле `properties.colorSource?: ColorSource`.
  - Правила разрешения: если `colorSource` не задан — используется `properties.color` (обратная совместимость). Если заданы оба — приоритет у `colorSource`.

- Изменение `GfxMultiColorPaletteStop` (apps/qryleth-front/src/entities/layer/model/types.ts):
  - Расширить тип стопа до `{ height: number; color?: string; colorSource?: ColorSource; alpha?: number }`.
  - Приоритет: если есть `colorSource` — он используется; иначе — `color`.
  - Тинт у стопов задаётся через `colorSource.tint` и применяется ПОСЛЕ интерполяции базовых цветов (см. ниже).

- Изменение `GfxEnvironmentContent` (apps/qryleth-front/src/entities/environment/model/types.ts):
  - Добавить `paletteUuid?: string` — ссылка на активную палитру сцены.
  - До завершения миграции фон сцены берётся из `lighting.backgroundColor` (мы синхронизируем его с ролью `sky`).

- SceneAPI (поддержка палитр):
  - `listPalettes(): GlobalPalette[]` — возвращает предустановленные палитры из реестра.
  - `setPalette(uuid: string): void` — сохраняет `environmentContent.paletteUuid = uuid`, синхронизирует `lighting.backgroundColor` и `lighting.fog.color` по ролям, триггерит реактивные обновления материалов/террейна/воды.

- Правила применения tint для террейна (MultiColor):
  - Сначала резолвим роли стопов в базовые цвета и применяем `tint` каждого стопа к его цвету в HSV Value (если `tint` не задан — считаем 0).
  - Затем выполняем интерполяцию по высоте между уже тонированными цветами соседних стопов.
  - После этого применяется `slopeBoost`.

## Базовые палитры (предустановки)

```
QRYLETH_DEFAULT = {
  uuid: 'default',
  name: 'Qryleth Default',
  colors: {
    sky:    '#7fb3ff',
    fog:    '#9fb8c8',
    water:  '#4aa3c7',
    foliage:'#4a7c59',
    wood:   '#6a4b3b',
    rock:   '#8a8a8a',
    metal:  '#9fa3a7',
    sand:   '#d9c18f',
    ground: '#6b4f36',
    snow:   '#ffffff',
    accent: '#d98f4a'
  }
}

QRYLETH_AUTUMN = {
  uuid: 'autumn',
  name: 'Qryleth Autumn',
  colors: {
    sky:    '#d0a36b', // тёплое осеннее небо, с золотистым оттенком
    fog:    '#c7a98c', // мягкий туман с бежево-серым оттенком
    water:  '#4a7c7c', // приглушённая вода для контраста
    foliage:'#c56b2c', // лиственно-оранжевый (золотая осень)
    wood:   '#8b5a2b', // насыщенно-коричневый
    rock:   '#7f7f7f', // серый камень
    metal:  '#9fa3a7', // нейтральный
    sand:   '#d8b56a', // песок теплее, золотистый
    ground: '#7c4a2d', // тёплый коричневый
    snow:   '#f2f2f2', // кремово-белый
    accent: '#e07a3c'  // тыквенно-оранжевый
  }
}
```

## Список фаз

### ✅ Фаза 1: Типы палитры и реестр предустановок — done
- Добавлены типы: `PaletteRole`, `GlobalPalette`, `ColorSource`.
- Реализован `PaletteRegistry` и предустановки `QRYLETH_DEFAULT`, `QRYLETH_AUTUMN`.
- Создана документация `docs/api/types/palette.md`.

### ✅ Фаза 2: Состояние сцены и инициализация палитры — done
- В `GfxEnvironmentContent` добавлено `paletteUuid?: string`; стор сцены инициализирует `'default'`.
- `initializePalettes()` вызывается при старте стора; при load/clear подставляется дефолт.
- Сериализация в Dexie совместима; обеспечена бэкомпат-нормализация.

### ⏳ Фаза 3: Резолвер материалов с учётом палитры
- Расширить `materialResolver` для поддержки `properties.colorSource` (fixed/role + tint HSV Value).
- Добавить мемоизацию резолва по ключам (paletteUuid, role, tint, materialUuid).
- Интегрировать в PrimitiveRenderer (без изменения API компонент, только резолв).

### ⏳ Фаза 4: Террейн — stop.colorSource и порядок tint → интерполяция
- Расширить `GfxMultiColorPaletteStop` полем `colorSource?: ColorSource` (приоритет над `color`).
- В `MultiColorProcessor`: резолв ролей стопов до цветов → применить tint стопов в HSV Value → интерполяция по высоте → затем slopeBoost.
- Триггер пересборки при смене палитры только при наличии role‑стопов.

### ⏳ Фаза 5: Вода и фон/туман сцены
- Simple‑вода: `color2 = base`, `color1 = base` с осветлением +20% (HSV Value) из роли `water`.
- Realistic‑вода: оставить текущую логику (смешивание с небом).
- При смене палитры устанавливать `lighting.backgroundColor = palette.colors.sky` и `lighting.fog.color = palette.colors.fog` (если fog включён).

### ⏳ Фаза 6: SceneAPI — управление палитрой
- Добавить `SceneAPI.listPalettes()` и `SceneAPI.setPalette(uuid)`.
- Обновить документацию SceneAPI и примеры.

### ⏳ Фаза 7: UI — «Окружение» и редактор материалов
- Секция «Окружение»: выпадающий список выбора палитры (предустановки из реестра).
- Редактор материалов: переключатель fixed/role, выбор роли и слайдер tint [-1..+1].
- Обеспечить живое обновление примитивов при изменении настроек материала (как для цвета сейчас).

### ⏳ Фаза 8: Документация, миграции и полировка
- Обновить архитектурные и API‑доки (ссылки, схемы, примеры).
- Описать политику обратной совместимости и миграции сохранённых сцен.
- Финальная проверка производительности и UX (перерисовки, плавность смены палитры).
