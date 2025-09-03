import type { TemplateGroup, TemplateData } from './types'
import { quickStartGroup } from './groups/quickStart'
import { landscapesGroup } from './groups/landscapes'
import { utilitiesGroup } from './groups/utilities'
import { biomesGroup } from './groups/biomes'
export { getDefaultScript } from './defaultScript'

/**
 * Вернуть набор групп шаблонов для панели скриптинга.
 * Слева в навигации отображаются группы, справа — их содержимое.
 */
/**
 * Возвращает перечень групп для навигации в панели шаблонов.
 * Обновлено: введена единая группа «Ландшафты», в которую перенесены
 * все шаблоны из «Готовые решения» и «Специальные ландшафты», а также
 * «Горный массив» и «Прибрежная зона» из продвинутых примеров.
 */
export const getTemplateGroups = (): TemplateGroup[] => [
  quickStartGroup,
  landscapesGroup,
  biomesGroup,
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
