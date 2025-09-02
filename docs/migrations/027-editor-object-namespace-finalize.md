# Миграция: Финализация неймспейса редактора объекта (027)

Цель: завершить перенос функционала редактора объекта в `features/editor/object/*`, убрать избыточные реэкспорты и зафиксировать стабильный публичный API.

## Итого по изменениям

- Старый неймспейс `features/object-editor/*` — удалён из кода и запрещён ESLint‑правилом.
- Публичный API `features/editor/object` упрощён: из корневого индекса убраны избыточные реэкспорты `renderer/properties/chat`.
- Сняты промежуточные «прокладки»:
  - Удалены файлы-индексы:
    - `src/features/editor/object/renderer/index.ts`
    - `src/features/editor/object/properties/index.ts`
    - `src/features/editor/object/chat/index.ts`
- Обновлена документация «Getting Started» и оглавление миграций.

## Публичный API после миграции

- `@/features/editor/object` — основные UI-компоненты редактора (ObjectEditorR3F, панели, раскладки и т.п.).
- `@/features/editor/object/hooks` — публичные React‑хуки (включая глобальное состояние панелей).
- `@/features/editor/object/lib` — прикладные утилиты (например, `buildUpdatedObject`, `generateObjectPreview`, offscreen‑рендерер) и интеграции (AI‑инструменты и регистрация).
- `@/features/editor/object/model` — сторы/типы модели объекта.

Импорт из более глубоких путей внутри `ui/*` снаружи фичи не рекомендуется. Для внешних модулей используйте перечисленные точки входа.

## Инструкции по обновлению импортов

Если ранее использовались промежуточные подмодульные точки входа:

- Было: `@/features/editor/object/renderer` → Станет: `@/features/editor/object`
- Было: `@/features/editor/object/properties` → Станет: `@/features/editor/object`
- Было: `@/features/editor/object/chat` → Станет: `@/features/editor/object`

Хуки и утилиты продолжают импортироваться без изменений:

- `@/features/editor/object/hooks`
- `@/features/editor/object/lib`

## Проверки

1) Поиск запрещённых импортов:

```
rg -n "@/features/object-editor" apps
```

2) Поиск глубоких импортов из `ui/*` во внешних слоях (ожидается отсутствие):

```
rg -n "@/features/editor/object/ui/" apps
```

3) Сборка и запуск приложения для smoke‑теста:

```
cd apps/qryleth-front
npm run build && npm run dev
```

## Обратная совместимость

Снятые промежуточные индексы не использовались за пределами самой фичи; миграция не несёт breaking changes для внешних модулей. Если встретите обращение к удалённым путям — переведите импорт на корневую точку входа `@/features/editor/object`.

