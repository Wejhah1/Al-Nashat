import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { onTableChange } from '../lib/realtime'
import type { LogEntry, LogType } from '../lib/types'

export interface LogFilter {
  memberId?: string
  groupId?: string
  type?: LogType | ''
}

const PAGE = 20

/** سجل الأحداث: أول 20 ثم "إظهار المزيد" 20 إضافية، مع تحديث فوري */
export function useLogs(filter: LogFilter = {}, pageSize = PAGE) {
  const [items, setItems] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const filterRef = useRef(filter)
  filterRef.current = filter
  const key = JSON.stringify(filter)

  const query = useCallback(
    (beforeId?: number) => {
      const f = filterRef.current
      let q = supabase.from('logs').select('*').order('id', { ascending: false }).limit(pageSize)
      if (f.memberId) q = q.eq('member_id', f.memberId)
      if (f.groupId) q = q.eq('group_id', f.groupId)
      if (f.type) q = q.eq('type', f.type)
      if (beforeId) q = q.lt('id', beforeId)
      return q
    },
    [pageSize],
  )

  useEffect(() => {
    let alive = true
    setLoading(true)
    void query().then(({ data }) => {
      if (!alive) return
      const rows = (data ?? []) as LogEntry[]
      setItems(rows)
      setHasMore(rows.length === pageSize)
      setLoading(false)
    })
    const off = onTableChange('logs', (p) => {
      const f = filterRef.current
      if (p.eventType === 'INSERT') {
        const n = p.new as unknown as LogEntry
        if ((f.memberId && n.member_id !== f.memberId) || (f.groupId && n.group_id !== f.groupId) || (f.type && n.type !== f.type)) return
        setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]))
      } else if (p.eventType === 'UPDATE') {
        const n = p.new as unknown as LogEntry
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, ...n } : x)))
      } else if (p.eventType === 'DELETE') {
        const o = p.old as { id: number }
        setItems((prev) => prev.filter((x) => x.id !== o.id))
      }
    })
    return () => {
      alive = false
      off()
    }
  }, [key, query, pageSize])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const last = items[items.length - 1]
    const { data } = await query(last?.id)
    const rows = (data ?? []) as LogEntry[]
    setItems((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))])
    setHasMore(rows.length === pageSize)
    setLoadingMore(false)
  }, [items, loadingMore, hasMore, query, pageSize])

  return { items, loading, loadingMore, hasMore, loadMore }
}
