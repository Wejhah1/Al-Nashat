import { useTable } from './useTable'
import type { Post } from '../lib/types'

export function usePosts() {
  const { rows, loading } = useTable<Post & Record<string, unknown>>('posts', { order: { column: 'event_date', ascending: false } })
  const posts = [...rows].sort((a, b) => b.event_date.localeCompare(a.event_date) || b.created_at.localeCompare(a.created_at))
  return { posts, loading }
}
