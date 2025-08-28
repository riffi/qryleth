import type { TemplateGroup, TemplateData } from './types'
import { quickStartGroup } from './groups/quickStart'
import { readySolutionsGroup } from './groups/readySolutions'
import { specialLandscapesGroup } from './groups/specialLandscapes'
import { advancedExamplesGroup } from './groups/advancedExamples'
import { utilitiesGroup } from './groups/utilities'
export { getDefaultScript } from './defaultScript'

/**
 * Вернуть набор групп шаблонов для панели скриптинга.
 * Слева в навигации отображаются группы, справа — их содержимое.
 */
export const getTemplateGroups = (): TemplateGroup[] => [
  quickStartGroup,
  readySolutionsGroup,
  specialLandscapesGroup,
  advancedExamplesGroup,
  utilitiesGroup
]

/**
 * Обратная совместимость: плоский объект в формате
 * { 'Группа: Имя шаблона': 'код' }.
 * Используется старыми вызовами до миграции UI.
 */
export const getProceduralTerrainTemplates = (): Record<string, string> => {
  const result: Record<string, string> = {}
  for (const group of getTemplateGroups()) {
    for (const tpl of group.templates) {
      result[`${group.title}: ${tpl.name}`] = tpl.code
    }
  }
  return result
}

/**
 * Утилита: получить код шаблона по id.
 * Удобно для прямого применения, если известны идентификаторы.
 */
export const findTemplateById = (id: string): TemplateData | undefined => {
  for (const group of getTemplateGroups()) {
    const found = group.templates.find(t => t.id === id)
    if (found) return found
  }
  return undefined
}
