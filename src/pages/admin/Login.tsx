import { useState } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'

export default function Login() {
  const { admin, login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (admin) return <Navigate to={loc.state?.from ?? '/admin'} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(username, password)
      nav(loc.state?.from ?? '/admin', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="islamic-pattern-dark relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gold-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-400/25 blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', damping: 22 }} className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-5xl font-bold"><span className="gold-text">النشاط الثقافي</span></h1>
          <div className="mt-2 tracking-[0.3em] text-gold-200">1448 هـ</div>
        </div>
        <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
          <h2 className="text-xl font-bold">دخول المشرفين</h2>
          <p className="mt-1 text-sm text-muted">أدخل بيانات حسابك للوصول إلى لوحة التحكم</p>
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="label">اسم المستخدم</span>
              <div className="relative">
                <User className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input value={username} onChange={(e) => setUsername(e.target.value)} className="field h-12 pr-11" dir="ltr" autoComplete="username" autoCapitalize="none" required />
              </div>
            </label>
            <label className="block">
              <span className="label">كلمة المرور</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={show ? 'text' : 'password'} className="field h-12 px-11" dir="ltr" autoComplete="current-password" required />
                <button type="button" onClick={() => setShow(!show)} className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted hover:text-ink">
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>
          </div>
          {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</motion.p>}
          <Button type="submit" size="lg" className="mt-6 w-full" loading={busy}>دخول</Button>
          <Link to="/" className="mt-5 flex items-center justify-center gap-1.5 text-sm text-muted hover:text-primary-700">
            <ArrowRight className="h-4 w-4" />
            العودة للموقع
          </Link>
        </form>
      </motion.div>
    </div>
  )
}
