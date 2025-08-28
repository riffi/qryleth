import type { TemplateGroup } from '../types'
import { sandDunesTemplate } from '../items/specialLandscapes/sand-dunes'
import { lunarCratersTemplate } from '../items/specialLandscapes/lunar-craters'
import { canyonPlateauTemplate } from '../items/specialLandscapes/canyon-plateau'

/**
 * Группа «Специальные ландшафты» — пресеты с выраженной стилистикой
 * (дюны, кратеры, каньоны и т.д.).
 */
export const specialLandscapesGroup: TemplateGroup = {
  id: 'special-landscapes',
  title: 'Специальные ландшафты',
  templates: [sandDunesTemplate, lunarCratersTemplate, canyonPlateauTemplate]
}
