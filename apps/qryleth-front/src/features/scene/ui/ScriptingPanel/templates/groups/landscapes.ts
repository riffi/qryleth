import type { TemplateGroup } from '../types'
// Импортируем все типовые ландшафты из «Готовые решения»
import { centralPlateauDefaultTemplate } from '../items/readySolutions/central-plateau-default'
import { centralPlateauExplicitFlatTemplate } from '../items/readySolutions/central-plateau-explicit-flat'
import { plateauStripeCoverAreaTemplate } from '../items/readySolutions/plateau-stripe-cover-area'
import { valleyStripeCoverAreaTemplate } from '../items/readySolutions/valley-stripe-cover-area'
import { valleyWithMountainsTemplate } from '../items/readySolutions/valley-with-mountains'
import { volcanicIslandTemplate } from '../items/readySolutions/volcanic-island'
import { archipelagoTemplate } from '../items/readySolutions/archipelago'
import { gentleHillsTemplate } from '../items/readySolutions/gentle-hills'
import { smoothMountainTemplate } from '../items/readySolutions/smooth-mountain'
// Импортируем стилизованные («специальные») ландшафты
import { sandDunesTemplate } from '../items/specialLandscapes/sand-dunes'
import { lunarCratersTemplate } from '../items/specialLandscapes/lunar-craters'
import { canyonPlateauTemplate } from '../items/specialLandscapes/canyon-plateau'
// Импортируем продвинутые примеры, которые тоже относятся к ландшафтам
import { mountainRangeTemplate } from '../items/advancedExamples/mountain-range'
import { coastalAreaTemplate } from '../items/advancedExamples/coastal-area'

/**
 * Группа «Ландшафты» — единая витрина для всех ландшафтных шаблонов, чтобы
 * избежать распыления между «Готовые решения» и «Специальные ландшафты».
 * Сюда также перенесены «Горный массив» и «Прибрежная зона» из продвинутых примеров.
 */
export const landscapesGroup: TemplateGroup = {
  id: 'landscapes',
  emoji: '🏞️',
  title: 'Ландшафты',
  templates: [
    // Готовые решения (типовые ландшафты)
    centralPlateauDefaultTemplate,
    centralPlateauExplicitFlatTemplate,
    plateauStripeCoverAreaTemplate,
    valleyStripeCoverAreaTemplate,
    valleyWithMountainsTemplate,
    volcanicIslandTemplate,
    archipelagoTemplate,
    gentleHillsTemplate,
    smoothMountainTemplate,
    // Специальные ландшафты (стилизованные пресеты)
    sandDunesTemplate,
    lunarCratersTemplate,
    canyonPlateauTemplate,
    // Продвинутые примеры, относящиеся к ландшафтам
    mountainRangeTemplate,
    coastalAreaTemplate
  ]
}
