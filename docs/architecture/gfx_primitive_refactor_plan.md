
# План изменений типов для `GfxPrimitive`

**Контекст**  
Сейчас все геометрические параметры хранятся на верхнем уровне `GfxPrimitive`, что усложняет поддержку и работу AI‑ассистента. Цель — сделать типы строгими и декларативными, выделив общие свойства и специфичную для каждого примитива геометрию.

---

## 1. Создание интерфейсов геометрии

| Примитив  | Интерфейс геометрии |
|-----------|--------------------|
| Box       | `BoxGeometry { width; height; depth }` |
| Sphere    | `SphereGeometry { radius }` |
| Cylinder  | `CylinderGeometry { radiusTop; radiusBottom; height; radialSegments? }` |
| Cone      | `ConeGeometry { radius; height; radialSegments? }` |
| Pyramid   | `PyramidGeometry { baseSize; height }` |
| Plane     | `PlaneGeometry { width; height }` |
| Torus     | `TorusGeometry { majorRadius; minorRadius; radialSegments?; tubularSegments? }` |

---

## 2. Общие свойства примитива

```ts
interface PrimitiveCommon {
  uuid?: string;
  name?: string;

  material?: {
    color?: string;
    opacity?: number;
    emissive?: string;
    emissiveIntensity?: number;
  };

  transform?: {
    position?: Vector3;
    rotation?: Vector3;
    scale?: Vector3;
  };
}
```

---

## 3. Дискриминированное объединение `GfxPrimitive`

```ts
export type GfxPrimitive =
  | ({ type: 'box';      geometry: BoxGeometry;      } & PrimitiveCommon)
  | ({ type: 'sphere';   geometry: SphereGeometry;   } & PrimitiveCommon)
  | ({ type: 'cylinder'; geometry: CylinderGeometry; } & PrimitiveCommon)
  | ({ type: 'cone';     geometry: ConeGeometry;     } & PrimitiveCommon)
  | ({ type: 'pyramid';  geometry: PyramidGeometry;  } & PrimitiveCommon)
  | ({ type: 'plane';    geometry: PlaneGeometry;    } & PrimitiveCommon)
  | ({ type: 'torus';    geometry: TorusGeometry;    } & PrimitiveCommon);
```

*Ключевой эффект:* у каждого примитива ровно один валидный под‑объект `geometry`, а не десятки `undefined`‑полей.

---

## 4. Обновление Zod‑схемы для AI‑агента

```ts
import { z } from 'zod';

const material = z.object({ ... }).partial();
const transform = z.object({ ... }).partial();

export const PrimitiveSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('box'),
    geometry: z.object({ width: z.number(), height: z.number(), depth: z.number() }),
  }).merge(material).merge(transform),

  // ...остальные варианты
]);
```

> Размер корневого объекта сократился, поскольку все специфичные поля переместились внутрь `geometry`.

---

## 5. Рефакторинг рендереров

* Заменить чтение плоских полей на `primitive.geometry.*`.
* Пример (`Cylinder3D.tsx`):

```diff
- const { radiusTop = 1, radiusBottom = 1, height = 1 } = primitive;
+ const { radiusTop = 1, radiusBottom = 1, height = 1 } = primitive.geometry;
```

---

## 6. Миграция сохранённых данных

1. Добавить функцию `upgradePrimitive(old)` в слой данных.  
2. При загрузке сцены конвертировать старый формат → новый.  
3. После первого сохранения данные будут храниться уже в новой форме.

---

## 7. Изменения в AI‑ассистенте

* Обновить описание `PrimitiveSchema` в tool.  
* Протестировать генерацию JSON для каждого типа примитива.  
* При необходимости добавить обратную совместимость (приём старых полей и конвертация на сервере).

---

## 8. Шаги внедрения

1. **Типизация**: добавить новые интерфейсы, обновить импорты.  
2. **Zod‑валидатор**: внедрить новую схему.  
3. **Рендер**: рефакторинг компонентов Three.js.  
4. **Хранилище**: реализовать миграцию данных Dexie → Spring Boot (при переезде).  
5. **Тесты**: юнит‑тесты на преобразования и интеграционные тесты сцены.  
6. **Документация**: обновить README, добавить примеры JSON до/после.

---

## 9. Контроль качества

* TypeScript strict mode, ESLint, Prettier.  
* Проверка AI‑интеграции: корректность генерируемых параметров.  
* Визуальное тестирование сцен в редакторе.

---

> **Итог:** переходим от «плоской» структуры к строгому дискриминированному типу, упрощая код, уменьшая вероятность ошибок и готовя базу для будущего расширения (инстанс‑масштабирование, новые примитивы, глобальная библиотека).
