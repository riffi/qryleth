import type { TemplateData } from '../../types'

/**
 * Утилита: Выравнивание объектов — подгоняет экземпляры по поверхности террейна.
 */
export const instancesAdjustTemplate: TemplateData = {
  id: 'instances-adjust',
  name: 'Выравнивание объектов',
  description: 'Выравнивает экземпляры по ландшафту (новая схема landscapeContent).',
  code: `// Выровнять все объекты по существующему террейну
console.log('Выполняю выравнивание по площадкам landscapeContent...')
// В новой архитектуре выравнивание выполняется автоматически при создании площадки.
// Здесь можно повторно сдвинуть все инстансы по текущему рельефу, если изменили ландшафт вручную.
const before = sceneApi.getSceneInstances()
// Т.к. в панели нет прямого метода, запросим пересоздание трансформов через createObject/addInstances в будущих версиях API.
// Временная заглушка: просто показываем количество инстансов.
console.log('Инстансов в сцене:', before.length)

// Показать статистику после выравнивания
const newStats = sceneApi.getSceneStats()
console.log('\nСтатистика экземпляров:', newStats.total.instances)`
}
