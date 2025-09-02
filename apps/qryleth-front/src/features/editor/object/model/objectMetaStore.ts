import { create } from 'zustand'
import type { GfxObject } from '@/entities/object'

/**
 * ObjectMetaStore — лёгкий zustand‑store для метаданных редактируемого объекта.
 *
 * Назначение:
 * - хранить и редактировать список тегов объекта, не смешивая их с примитивами/материалами
 * - предоставлять методы инициализации из исходного объекта и обновления списка тегов
 */
interface ObjectMetaState {
  /** Теги текущего объекта (локальная копия для редактирования). */
  tags: string[]
}

interface ObjectMetaActions {
  /** Полная замена списка тегов (значения предварительно триммятся). */
  setTags: (tags: string[]) => void
  /** Добавить тег, игнорируя пустые и дубликаты (регистр не учитывается). */
  addTag: (tag: string) => void
  /** Удалить тег (без учёта регистра). */
  removeTag: (tag: string) => void
  /** Инициализировать стор из объекта (копирует tags или ставит []). */
  loadFromObject: (obj?: GfxObject | null) => void
  /** Сбросить состояние (очистить теги). */
  clear: () => void
}

export const useObjectMetaStore = create<ObjectMetaState & ObjectMetaActions>((set, get) => ({
  tags: [],

  setTags: (tags: string[]) => {
    const normalized = (tags || []).map(t => t.trim().toLowerCase()).filter(Boolean)
    set({ tags: Array.from(new Set(normalized)) })
  },

  addTag: (tag: string) => {
    const t = tag.trim().toLowerCase()
    if (!t) return
    const current = get().tags
    if (current.includes(t)) return
    set({ tags: [...current, t] })
  },

  removeTag: (tag: string) => {
    const lower = tag.toLowerCase()
    set({ tags: get().tags.filter(t => t !== lower) })
  },

  loadFromObject: (obj?: GfxObject | null) => {
    const tags = (obj?.tags || []).map(t => t.trim().toLowerCase()).filter(Boolean)
    set({ tags })
  },

  clear: () => set({ tags: [] })
}))
