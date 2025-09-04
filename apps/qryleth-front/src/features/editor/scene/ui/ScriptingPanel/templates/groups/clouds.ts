import type { TemplateGroup } from '../types'
import { cloudsBasicTemplate } from '../items/clouds/basic-clouds'
import { cloudsBreezySunsetTemplate } from '../items/clouds/breezy-sunset'

/**
 * Группа «Облака» — скрипты для управления ветром и процедурной генерации облаков.
 */
export const cloudsGroup: TemplateGroup = {
  id: 'clouds',
  emoji: '☁️',
  title: 'Облака',
  templates: [
    cloudsBasicTemplate,
    cloudsBreezySunsetTemplate,
  ]
}

