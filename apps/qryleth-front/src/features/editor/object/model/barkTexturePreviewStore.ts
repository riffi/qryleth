import { create } from 'zustand'

/**
 * Стор предпросмотра набора текстур коры в ObjectEditor.
 * Хранит выбранный идентификатор набора (WoodTextureEntry.id) для целей предпросмотра.
 * Этот выбор влияет только на ObjectEditor и не сохраняется в объект автоматически.
 */
interface BarkTexturePreviewState {
  /** Текущий id набора текстур коры (по умолчанию — 'bark014-1k-jpg') */
  barkTextureSetId: string
  /** Устанавливает id набора текстур коры для предпросмотра */
  setBarkTextureSetId: (id: string) => void
}

export const useBarkTexturePreviewStore = create<BarkTexturePreviewState>((set) => ({
  barkTextureSetId: 'bark014-1k-jpg',
  setBarkTextureSetId: (id: string) => set({ barkTextureSetId: id || 'bark014-1k-jpg' })
}))

/** Возвращает текущий id набора текстур коры для предпросмотра. */
export function useBarkTextureSetId(): string {
  return useBarkTexturePreviewStore(state => state.barkTextureSetId)
}

/** Возвращает сеттер id набора текстур коры для предпросмотра. */
export function useSetBarkTextureSetId(): (id: string) => void {
  return useBarkTexturePreviewStore(state => state.setBarkTextureSetId)
}

