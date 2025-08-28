import type { TemplateGroup } from '../types'
import { mountainRangeTemplate } from '../items/advancedExamples/mountain-range'
import { coastalAreaTemplate } from '../items/advancedExamples/coastal-area'
import { multiStageTemplate } from '../items/advancedExamples/multi-stage'

/**
 * Группа «Продвинутые примеры» — более комплексные сценарии
 * с комбинациями операций, смещениями и осмысленными bias/step.
 */
export const advancedExamplesGroup: TemplateGroup = {
  id: 'advanced-examples',
  title: 'Продвинутые примеры',
  templates: [mountainRangeTemplate, coastalAreaTemplate, multiStageTemplate]
}
