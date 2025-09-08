# Глобальные палитры цветов

Документ описывает доменные типы глобальных палитр, их роли и источник цвета `ColorSource`,
который используется материалами и террейном.

## Типы

- `PaletteRole` — роли палитры:
  `sky | fog | water | foliage | wood | rock | metal | sand | ground | snow | accent`.

- `GlobalPalette` — палитра:
  `{ uuid: string; name: string; colors: Record<PaletteRole, string> }`.
  Цвета указываются в HEX (`#rrggbb`).

- `ColorSource` — источник цвета:
  - `{ type: 'fixed' }` — использовать локальное поле цвета (например, `properties.color`).
  - `{ type: 'role'; role: PaletteRole; tint?: number }` — взять цвет из активной палитры по роли и применить `tint`.

### Правила tint
- Диапазон `tint` — от `-1` до `+1`.
- Преобразование выполняется в HSV: модифицируется компонент `Value` с клампингом в `[0..1]`.
- Для террейна tint на стопах применяется к цветам стопов ДО интерполяции по высоте,
  затем выполняется интерполяция и, после этого, применяется `slopeBoost`.

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
