import { create } from 'zustand'

/**
 * Простое хранилище состояния библиотеки: поисковый запрос и вспомогательные поля.
 */
interface LibraryState {
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export const useLibraryStore = create<LibraryState>((set) => ({
  searchQuery: '',
  setSearchQuery: (q: string) => set({ searchQuery: q })
}))

