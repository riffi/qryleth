import { useMemo } from 'react'

/**
 * Простой хук фильтрации по строке поиска (без учёта регистра)
 * с пользовательским селектором полей.
 */
export function useLibrarySearch<T>(items: T[], query: string, selectText: (item: T) => string) {
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => selectText(it)?.toLowerCase().includes(q))
  }, [items, query, selectText])
}

