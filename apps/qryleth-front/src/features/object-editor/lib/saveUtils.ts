import { useObjectStore } from '../model/objectStore'
import type { GfxObject } from '@/entities/object'

/**
 * Формирует итоговый объект на основе текущего состояния редактора.
 * @param baseObject исходные данные редактируемого объекта
 * @returns объект с применёнными изменениями
 */
export const buildUpdatedObject = (baseObject: GfxObject): GfxObject => {
  const state = useObjectStore.getState()
  return {
    ...baseObject,
    primitives: state.primitives.map(p => ({ ...p })),
    boundingBox: state.boundingBox,
    materials: state.materials,
    primitiveGroups: state.primitiveGroups,
    primitiveGroupAssignments: state.primitiveGroupAssignments,
  }
}
