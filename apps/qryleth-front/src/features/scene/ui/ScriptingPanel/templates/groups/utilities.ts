import type { TemplateGroup } from '../types'
import { sceneAnalyzerTemplate } from '../items/utilities/scene-analyzer'
import { instancesAdjustTemplate } from '../items/utilities/instances-adjust'
import { perfTestTemplate } from '../items/utilities/perf-test'

/**
 * Группа «Инструменты и утилиты» — сервисные скрипты для анализа, выравнивания
 * и оценки производительности процедурной генерации.
 */
export const utilitiesGroup: TemplateGroup = {
  id: 'utilities',
  title: 'Инструменты и утилиты',
  templates: [sceneAnalyzerTemplate, instancesAdjustTemplate, perfTestTemplate]
}

