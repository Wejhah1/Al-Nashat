import { useEffect, useRef, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Options {
  order?: { column: string; ascending?: boolean }
  key?: string
  enabled?: boolean
  select?: string
}

let channelSeq = 0

/** جدول كامل مع تحديث فوري عبر Realtime */
export function useTable<T extends Record<string, unknown>>(table: string, opts: Options = {}) {
  const { order, key = 'id', enabled = true, select = '*' } = opts
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const orderRef = useRef(order)
  orderRef.current = order

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let alive = true
    const load = async () => {
      let q = supabase.from(table).select(select)
      if (orderRef.current) q = q.order(orderRef.current.column, { ascending: orderRef.current.ascending ?? true })
      const { data, error } = await q.limit(5000)
      if (!alive) return
      if (error) setError(error.message)
      else {
        setRows((data ?? []) as unknown as T[])
        setError(null)
      }
      setLoading(false)
    }
    void load()
    let firstSubscribe = true

    const channel = supabase
      .channel(`rt-${table}-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (p: RealtimePostgresChangesPayload<T>) => {
        setRows((prev) => {
          if (p.eventType === 'INSERT') {
            const n = p.new as T
            return prev.some((r) => r[key] === n[key]) ? prev : [...prev, n]
          }
          if (p.eventType === 'UPDATE') {
            const n = p.new as T
            return prev.map((r) => (r[key] === n[key] ? { ...r, ...n } : r))
          }
          const o = p.old as Partial<T>
          return prev.filter((r) => r[key] !== o[key])
        })
      })
      .subscribe((status) => {
        // التحميل عند الاشتراك (وعند إعادة الاتصال) لضمان عدم فقدان أي تحديث
        // أول اشتراك لا يحتاج إعادة تحميل؛ إعادة الاتصال تحتاج
        if (status === 'SUBSCRIBED') {
          if (firstSubscribe) firstSubscribe = false
          else void load()
        }
      })

    return () => {
      alive = false
      void supabase.removeChannel(channel)
    }
  }, [table, key, enabled, select])

  return { rows, setRows, loading, error }
}
