import type { TemplateGroup } from '../types'
import { simpleHillsTemplate } from '../items/quickStart/simple-hills'
import { testTerrainTemplate } from '../items/quickStart/test-terrain'

/**
 * Группа «Быстрый старт» — простые и быстрые примеры для начала работы.
 * Содержит минимальные сценарии создания террейна с понятными параметрами.
 */
export const quickStartGroup: TemplateGroup = {
  id: 'quick-start',
  title: 'Быстрый старт',
  templates: [simpleHillsTemplate, testTerrainTemplate]
}
