# Глобальные палитры цветов

Документ описывает доменные типы глобальных палитр, их роли и источник цвета `ColorSource`,
который используется материалами и террейном. С учётом обновления поддерживаются дополнительные
корректировки оттенка и насыщенности для гибкой адаптации под активную палитру.

## Типы

- `PaletteRole` — роли палитры:
  `sky | fog | water | foliage | wood | rock | metal | sand | ground | snow | accent`.

- `GlobalPalette` — палитра:
  `{ uuid: string; name: string; colors: Record<PaletteRole, string> }`.
  Цвета указываются в HEX (`#rrggbb`).

- `ColorSource` — источник цвета:
  - `{ type: 'fixed' }` — использовать локальное поле цвета (например, `properties.color`).
  - `{ type: 'role'; role: PaletteRole; tint?: number; hueTowards?: { deg: number; t: number }; saturationShift?: number }`
    — взять цвет из активной палитры по роли и опционально применить корректировки:
    - `tint` — сдвиг яркости (компонента Value в HSV) в диапазоне `[-1..+1]`.
    - `hueTowards` — интерполяция оттенка по кратчайшей дуге к целевому значению:
      `H = H(role) + t * shortestArc(H(role) → deg)`, где `deg ∈ [0..360]`, `t ∈ [0..1]`.
      `t=0` — без сдвига, `t=1` — ровно целевой оттенок, промежуточные значения — частичный сдвиг.
    - `saturationShift` — аддитивный сдвиг насыщенности (S, HSV) в `[-1..+1]` с клампингом в `[0..1]`.

### Правила корректировок (tint, hueTowards, saturationShift)
- Все корректировки выполняются в HSV с клампингом в допустимые диапазоны.
- Порядок применения: сначала `hueTowards` (Hue), затем `saturationShift` (Saturation), затем `tint` (Value).
- Для террейна корректировки на стопах палитры применяются к базовым цветам стопов ДО интерполяции по высоте;
  затем выполняется интерполяция цвета/прозрачности и только после — модификация яркости от `slopeBoost`.

### Пример использования ColorSource (материал/террейн)

```ts
// Материал с цветом от роли foliage и корректировками под сезон
colorSource: {
  type: 'role',
  role: 'foliage',
  hueTowards: { deg: 79, t: 0.6 }, // 60% пути к целевому оттенку (жёлто‑зелёный)
  saturationShift: -0.1,           // слегка приглушить насыщенность
  tint: +0.12                      // немного осветлить
}

// Стоп палитры террейна, использующий роль с корректировками
{ height: 0, colorSource: { type: 'role', role: 'foliage', hueTowards: { deg: 79, t: 0.6 }, tint: 0.1 } }
```

## Предустановленные палитры

- `QRYLETH_DEFAULT` (`uuid: 'default'`):
  - sky `#7fb3ff`, fog `#9fb8c8`, water `#4aa3c7`, foliage `#4a7c59`, wood `#6a4b3b`,
    rock `#8a8a8a`, metal `#9fa3a7`, sand `#d9c18f`, ground `#6b4f36`, snow `#ffffff`, accent `#d98f4a`.

- `QRYLETH_AUTUMN` (`uuid: 'autumn'`):
  - sky `#d0a36b`, fog `#c7a98c`, water `#4a7c7c`, foliage `#c56b2c`, wood `#8b5a2b`,
    rock `#7f7f7f`, metal `#9fa3a7`, sand `#d8b56a`, ground `#7c4a2d`, snow `#f2f2f2`, accent `#e07a3c`.

## Реестр палитр (PaletteRegistry)

- Хранит предустановки и предоставляет быстрый доступ по `uuid`.
- Методы:
  - `registerWithUuid(palette)` — регистрирует палитру с фиксированным UUID (идемпотентно).
  - `get(uuid)` — вернуть палитру по идентификатору.
  - `list()` — вернуть все доступные палитры.
  - `remove(uuid)` — удалить палитру.
  - `clear()` — очистить реестр (для тестов).

Примечание: регистрация без явного UUID запрещена (требование стабильности ссылок в сценах).
