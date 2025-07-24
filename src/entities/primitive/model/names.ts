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
export function getPrimitiveDisplayName(primitive: GfxPrimitive, index: number): string {
  return primitive.name && primitive.name.trim() !== ''
    ? primitive.name
    : generatePrimitiveName(primitive.type, index + 1)
}
