/**
 * Сохраняет данные в формате JSON в файл на стороне клиента
 * @param fileName имя файла для сохранения
 * @param data любые сериализуемые данные
 */
export function downloadJson(fileName: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
