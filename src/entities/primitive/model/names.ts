import type { GfxPrimitive } from './types'

/**
 * Генерирует резервное имя примитива на основе его типа и порядкового номера.
 * Используется, когда имя примитива отсутствует.
 *
 * @param type тип примитива
 * @param index порядковый номер (начиная с 1)
 */
export function generatePrimitiveName(type: GfxPrimitive['type'], index: number): string {
  return `${type}-${index}`
}

/**
 * Возвращает имя примитива для отображения.
 * Если имя не задано, формирует его с помощью {@link generatePrimitiveName}.
 *
 * @param primitive примитив, название которого требуется получить
 * @param index порядковый номер примитива в списке
 * @returns осмысленное название примитива
 */
export function getPrimitiveDisplayName(
  primitive: Pick<GfxPrimitive, 'type' | 'name'>,
  index: number
): string {
  return primitive.name && primitive.name.trim() !== ''
    ? primitive.name
    : generatePrimitiveName(primitive.type, index + 1)
}

/**
 * Заполняет отсутствующие имена примитивов в списке.
 * Позволяет корректно работать со старыми данными,
 * где поле {@link GfxPrimitive.name} могло отсутствовать.
 *
 * @param primitives массив примитивов для обработки
 * @returns новый массив примитивов с гарантированными именами
 */
export function ensurePrimitiveNames<T extends { type: GfxPrimitive['type']; name?: string }>(
  primitives: T[]
): T[] {
  return primitives.map((p, i) =>
    p.name && p.name.trim() !== ''
      ? p
      : ({ ...p, name: generatePrimitiveName(p.type, i + 1) } as T)
  )
}
