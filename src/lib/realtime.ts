import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from './supabase'

type Payload = RealtimePostgresChangesPayload<Record<string, unknown>>
type Handler = (p: Payload) => void

const handlers = new Map<string, Set<Handler>>()
const reconnectListeners = new Set<() => void>()
let started = false

/** قناة Realtime واحدة لكل الجداول بدل قناة لكل جدول */
function start() {
  if (started) return
  started = true
  let firstSubscribe = true
  supabase
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, (p: Payload) => {
      handlers.get(p.table)?.forEach((h) => h(p))
    })
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      // أول اشتراك لا يحتاج إعادة تحميل؛ إعادة الاتصال تحتاج لتعويض ما فات
      if (firstSubscribe) firstSubscribe = false
      else reconnectListeners.forEach((l) => l())
    })
}

export function onTableChange(table: string, handler: Handler): () => void {
  start()
  let set = handlers.get(table)
  if (!set) handlers.set(table, (set = new Set()))
  set.add(handler)
  return () => set.delete(handler)
}

export function onReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener)
  return () => reconnectListeners.delete(listener)
}
