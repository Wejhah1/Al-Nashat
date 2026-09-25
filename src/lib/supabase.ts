import { createClient } from '@supabase/supabase-js'
import { processLock } from '@supabase/auth-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://bjcnyecnffdscoyaozic.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_FU9k_0JiE8OQpuKEgJfyuw_rCp0jneh'

export const supabase = createClient(url, key, {
  // قفل داخل الصفحة بدل قفل المتصفح: يمنع تجمّد الطلبات بعد التنقل أو الرجوع للتطبيق
  auth: { persistSession: true, autoRefreshToken: true, lock: processLock },
  realtime: { params: { eventsPerSecond: 20 } },
})

export const USERNAME_DOMAIN = 'al-nashat.app'

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

/** يستدعي دالة RPC ويرمي رسالة عربية مفهومة عند الخطأ */
export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(friendlyError(error.message))
  return data as T
}

export function friendlyError(message: string): string {
  if (/Failed to fetch|NetworkError|network/i.test(message)) return 'تعذر الاتصال بالخادم، تحقق من الإنترنت'
  if (/JWT|not authenticated|permission denied/i.test(message)) return 'انتهت الجلسة أو لا تملك الصلاحية'
  if (/duplicate key/i.test(message)) return 'القيمة مستخدمة مسبقاً'
  return message
}
