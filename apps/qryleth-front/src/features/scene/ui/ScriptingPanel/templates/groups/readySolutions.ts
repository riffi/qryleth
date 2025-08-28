import type { TemplateGroup } from '../types'
import { centralPlateauDefaultTemplate } from '../items/readySolutions/central-plateau-default'
import { centralPlateauExplicitFlatTemplate } from '../items/readySolutions/central-plateau-explicit-flat'
import { plateauStripeCoverAreaTemplate } from '../items/readySolutions/plateau-stripe-cover-area'
import { valleyStripeCoverAreaTemplate } from '../items/readySolutions/valley-stripe-cover-area'
import { valleyWithMountainsTemplate } from '../items/readySolutions/valley-with-mountains'
import { volcanicIslandTemplate } from '../items/readySolutions/volcanic-island'
import { archipelagoTemplate } from '../items/readySolutions/archipelago'
import { gentleHillsTemplate } from '../items/readySolutions/gentle-hills'

/**
 * Группа «Готовые решения» — практичные пресеты типовых ландшафтов.
 * Подходят для быстрых результатов «из коробки».
 */
export const readySolutionsGroup: TemplateGroup = {
  id: 'ready-solutions',
  title: 'Готовые решения',
  templates: [
    centralPlateauDefaultTemplate,
    centralPlateauExplicitFlatTemplate,
    plateauStripeCoverAreaTemplate,
    valleyStripeCoverAreaTemplate,
    valleyWithMountainsTemplate,
    volcanicIslandTemplate,
    archipelagoTemplate,
    gentleHillsTemplate
  ]
}
