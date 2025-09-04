import type { TemplateGroup } from '../types'
import { mountainWithForestTemplate } from '../items/advanced/mountain-with-forest'

/**
 * Группа «Расширенные» — комплексные сценарии, сочетающие несколько шагов.
 * Примеры: создание террейна + биомы с поверхностной маской, сложные пайплайны.
 */
export const advancedGroup: TemplateGroup = {
  id: 'advanced',
  emoji: '🧩',
  title: 'Расширенные',
  templates: [mountainWithForestTemplate]
}

