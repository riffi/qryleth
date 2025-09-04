import type { TemplateGroup } from '../types'
import { forestStratifiedTemplate } from '../items/biomes/forest-stratified'
import { rockyScatterTemplate } from '../items/biomes/rocky-scatter'
import { treesGentleSlopesTemplate } from '../items/biomes/trees-gentle-slopes'
import { rocksOnRidgesTemplate } from '../items/biomes/rocks-on-ridges'

/**
 * Группа «Биомы» — примеры создания и скаттеринга биомов через sceneApi.
 * Содержит шаблоны для стратифицированного леса (деревья/кустарники/трава)
 * и для каменистой россыпи (камни/валуны).
 */
export const biomesGroup: TemplateGroup = {
  id: 'biomes',
  emoji: '🌳',
  title: 'Биомы',
  templates: [
    forestStratifiedTemplate,
    rockyScatterTemplate,
    treesGentleSlopesTemplate,
    rocksOnRidgesTemplate,
  ]
}
