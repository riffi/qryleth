import type { TemplateGroup } from '../types'
import { multiStageTemplate } from '../items/advancedExamples/multi-stage'
import { multiColorTerrainTemplate } from '../items/advancedExamples/multicolor-terrain'

/**
 * Группа «Продвинутые примеры» — более комплексные сценарии
 * с комбинациями операций, смещениями и осмысленными bias/step.
 */
/**
 * Группа «Продвинутые примеры» — более комплексные сценарии с комбинациями
 * операций, смещениями и осмысленными bias/step. Из этой группы перенесены
 * ландшафтные примеры «Горный массив» и «Прибрежная зона» в группу «Ландшафты».
 */
export const advancedExamplesGroup: TemplateGroup = {
  id: 'advanced-examples',
  emoji: '🧠',
  title: 'Продвинутые примеры',
  templates: [multiStageTemplate, multiColorTerrainTemplate]
}
