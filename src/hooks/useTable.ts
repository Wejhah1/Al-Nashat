import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { onReconnect, onTableChange } from '../lib/realtime'

interface Options {
  order?: { column: string; ascending?: boolean }
  key?: string
  enabled?: boolean
  select?: string
}

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

    const offChange = onTableChange(table, (p) => {
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
    const offReconnect = onReconnect(() => void load())

    return () => {
      alive = false
      offChange()
      offReconnect()
    }
  }, [table, key, enabled, select])

  return { rows, setRows, loading, error }
}
