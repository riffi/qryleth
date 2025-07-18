# Фаза 1: Исследование

Исследована текущая структура проекта `src/`. Используются папки `components`, `features`, `hooks`, `layouts`, `pages`, `shared`, `stores`, `utils` и др. Некоторые части кода уже находятся в `features`, например `features/object-editor` и `features/scene`, но отсутствуют выделенные слои `entities`, `widgets`, `boundaries` и `app` в соответствии с FSD.

Код UI расположен в `components` и `features/*/ui`. Сторы находятся в `stores` и не разделены по слоям. В целом наблюдаются смешанные зависимости и не полностью соблюдается правило доступа слоев.

## Рекомендации для следующих фаз
- Создать недостающие слои `app`, `pages`, `widgets`, `entities`, `shared`, `boundaries`.
- Переместить существующие компоненты и модули по слоям, начав с `entities` (типы и модели) и `shared` (общие UI и утилиты).
- Выделить из `stores` zustand‑модули в `features` и `entities`.
- Продумать структуру каждой фичи: `ui`, `model`, `api`, `lib`.
