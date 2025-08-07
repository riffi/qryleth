/**
 * Копирует произвольные данные в буфер обмена в формате JSON
 * @param data любые сериализуемые данные
 */
export async function copyJsonToClipboard(data: unknown): Promise<void> {
  const json = JSON.stringify(data, null, 2)
  await navigator.clipboard.writeText(json)
}

