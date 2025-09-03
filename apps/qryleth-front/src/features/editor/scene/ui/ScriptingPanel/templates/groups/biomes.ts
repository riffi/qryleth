import type { TemplateGroup } from '../types'
import { forestStratifiedTemplate } from '../items/biomes/forest-stratified'
import { rockyScatterTemplate } from '../items/biomes/rocky-scatter'

/**
 * Группа «Биомы» — примеры создания и скаттеринга биомов через sceneApi.
 * Содержит шаблоны для стратифицированного леса (деревья/кустарники/трава)
 * и для каменистой россыпи (камни/валуны).
 */
export const biomesGroup: TemplateGroup = {
  id: 'biomes',
  emoji: '🌳',
  title: 'Биомы',
  templates: [forestStratifiedTemplate, rockyScatterTemplate]
}

