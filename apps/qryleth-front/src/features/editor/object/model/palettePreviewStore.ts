import { create } from 'zustand'
import { invalidateTreeBillboards } from '@/shared/r3f/optimization/TreeBillboardBaker'
import { invalidateGrassBillboards } from '@/shared/r3f/optimization/GrassBillboardBaker'

/**
 * Стор предпросмотра палитры в ObjectEditor.
 *
 * Хранит выбранный UUID глобальной палитры, которая применяется ТОЛЬКО для отображения
 * (превью материалов и отрисовка примитивов в ObjectEditor). Сохранения этого выбора
 * в свойства объекта не происходит.
 */
interface PalettePreviewState {
  /** Текущий UUID палитры предпросмотра (по умолчанию — 'default') */
  paletteUuid: string
  /**
   * Устанавливает UUID палитры предпросмотра.
   * @param uuid UUID палитры из реестра палитр
   */
  setPaletteUuid: (uuid: string) => void
}

export const usePalettePreviewStore = create<PalettePreviewState>((set) => ({
  paletteUuid: 'default',
  setPaletteUuid: (uuid: string) => {
    try {
      // Смена палитры влияет на запечённый вид импосторов — сбрасываем кэши
      invalidateTreeBillboards()
      invalidateGrassBillboards()
    } catch {}
    set({ paletteUuid: uuid || 'default' })
  }
}))

/**
 * Хук-обёртка для удобного получения текущего UUID палитры предпросмотра.
 * Возвращает строку с UUID и автоматически подписывает компонент на изменения.
 */
export function usePalettePreviewUuid(): string {
  return usePalettePreviewStore(state => state.paletteUuid)
}

/**
 * Хук-обёртка для установки текущего UUID палитры предпросмотра.
 * Возвращает функцию, принимающую UUID палитры из реестра.
 */
export function useSetPalettePreviewUuid(): (uuid: string) => void {
  return usePalettePreviewStore(state => state.setPaletteUuid)
}

