import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, USERNAME_DOMAIN } from '../lib/supabase'
import type { Admin } from '../lib/types'

interface AuthValue {
  session: Session | null
  admin: Admin | null
  loading: boolean
  isOwner: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAdmin = useCallback(async (s: Session | null) => {
    if (!s) {
      setAdmin(null)
      setLoading(false)
      return
    }
    const { data } = await supabase.from('admins').select('*').eq('user_id', s.user.id).maybeSingle()
    setAdmin((data as Admin) ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      void loadAdmin(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setTimeout(() => void loadAdmin(s), 0)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [loadAdmin])

  const login = useCallback(async (username: string, password: string) => {
    const u = username.trim().toLowerCase()
    const email = u.includes('@') ? u : `${u}@${USERNAME_DOMAIN}`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة')
    const { data: a } = await supabase.from('admins').select('*').eq('user_id', data.user.id).maybeSingle()
    if (!a) {
      await supabase.auth.signOut()
      throw new Error('هذا الحساب ليس لديه صلاحية الدخول')
    }
    setAdmin(a as Admin)
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setAdmin(null)
  }, [])

  return (
    <Ctx.Provider value={{ session, admin, loading, isOwner: admin?.role === 'owner', login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}
