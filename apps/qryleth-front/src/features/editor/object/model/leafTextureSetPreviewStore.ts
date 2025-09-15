import { create } from 'zustand'

/**
 * Стор предпросмотра набора текстур листвы в ObjectEditor.
 *
 * Хранит выбранный идентификатор набора текстур листьев (LeafTextureSet.id) для целей предпросмотра
 * и генератора деревьев. Этот выбор влияет только на ObjectEditor и не сохраняется в объект.
 */
interface LeafTextureSetPreviewState {
  /** Текущий id набора текстур листвы (по умолчанию — 'leafset019-1k-jpg') */
  leafTextureSetId: string
  /**
   * Устанавливает id набора текстур листвы для предпросмотра в ObjectEditor.
   * @param id Стабильный идентификатор набора, зарегистрированного в реестре
   */
  setLeafTextureSetId: (id: string) => void
}

export const useLeafTextureSetPreviewStore = create<LeafTextureSetPreviewState>((set) => ({
  leafTextureSetId: 'leafset019-1k-jpg',
  setLeafTextureSetId: (id: string) => set({ leafTextureSetId: id || 'leafset019-1k-jpg' })
}))

/**
 * Хук получения текущего id набора текстур листвы для предпросмотра в ObjectEditor.
 */
export function useLeafTextureSetId(): string {
  return useLeafTextureSetPreviewStore(state => state.leafTextureSetId)
}

/**
 * Хук для установки текущего набора текстур листвы в ObjectEditor.
 */
export function useSetLeafTextureSetId(): (id: string) => void {
  return useLeafTextureSetPreviewStore(state => state.setLeafTextureSetId)
}

