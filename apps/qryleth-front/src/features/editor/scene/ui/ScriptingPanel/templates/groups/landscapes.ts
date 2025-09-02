import type { TemplateGroup } from '../types'
// Импортируем все типовые ландшафты из «Готовые решения»
import { centralPlateauDefaultTemplate } from '../items/terrain/central-plateau-default'
import { centralPlateauExplicitFlatTemplate } from '../items/terrain/central-plateau-explicit-flat'
import { plateauStripeCoverAreaTemplate } from '../items/terrain/plateau-stripe-cover-area'
import { valleyStripeCoverAreaTemplate } from '../items/terrain/valley-stripe-cover-area'
import { valleyWithMountainsTemplate } from '../items/terrain/valley-with-mountains'
import { volcanicIslandTemplate } from '../items/terrain/volcanic-island'
import { archipelagoTemplate } from '../items/terrain/archipelago'
import { gentleHillsTemplate } from '../items/terrain/gentle-hills'
import { smoothMountainTemplate } from '../items/terrain/smooth-mountain'
// Импортируем стилизованные («специальные») ландшафты
import { sandDunesTemplate } from '../items/terrain/sand-dunes'
import { lunarCratersTemplate } from '../items/terrain/lunar-craters'
import { canyonPlateauTemplate } from '../items/terrain/canyon-plateau'
// Импортируем продвинутые примеры, которые тоже относятся к ландшафтам
import { mountainRangeTemplate } from '../items/terrain/mountain-range'
import { coastalAreaTemplate } from '../items/terrain/coastal-area'

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
