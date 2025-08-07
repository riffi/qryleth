/**
 * Генерация UUID версии 4.
 * Ранее использовался собственный алгоритм с Math.random,
 * что не гарантировало уникальность. Теперь применяется
 * встроенный `crypto.randomUUID`.
 * @returns Строка UUID
 */
export function generateUUID(): string {
  // Используем crypto.randomUUID для более надёжного
  // формирования уникальных идентификаторов
  return crypto.randomUUID();
}