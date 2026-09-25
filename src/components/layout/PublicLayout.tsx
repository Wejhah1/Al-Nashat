import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpenText, History, Home, LayoutDashboard, LogIn, Menu, Newspaper, Trophy, UserRound, X } from 'lucide-react'
import { Brand } from './Brand'
import { cn } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/', label: 'الرئيسية', icon: Home, end: true },
  { to: '/leaderboard', label: 'المتصدرون', icon: Trophy },
  { to: '/log', label: 'سجل النقاط', icon: History },
  { to: '/rules', label: 'لائحة النقاط', icon: BookOpenText },
  { to: '/news', label: 'الأخبار والفعاليات', icon: Newspaper },
]

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const loc = useLocation()
  const { admin } = useAuth()

  useEffect(() => setOpen(false), [loc.pathname])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <div className="islamic-pattern flex min-h-dvh flex-col">
      <header
        className={cn(
          'no-print sticky top-0 z-40 transition-all duration-300',
          scrolled ? 'border-b border-line/70 bg-ivory/85 shadow-[0_8px_30px_-18px_rgb(15_76_58/0.35)] backdrop-blur-xl' : 'bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6">
          <Brand />
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    'relative rounded-xl px-3.5 py-2 text-[15px] font-medium transition',
                    isActive ? 'text-primary-700' : 'text-ink/70 hover:bg-primary-50/70 hover:text-primary-700',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {n.label}
                    {isActive && (
                      <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-l from-gold-300 to-gold-500" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/me"
              className="hidden items-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-4 py-2 text-sm font-semibold text-primary-900 shadow-[0_6px_16px_-6px_rgb(176_134_55/0.7)] transition hover:brightness-105 sm:inline-flex"
            >
              <UserRound className="h-4 w-4" />
              متابعة تقدمي
            </Link>
            <Link
              to={admin ? '/admin' : '/admin/login'}
              className="hidden h-10 w-10 place-items-center rounded-xl border border-line bg-white/70 text-primary-700 transition hover:bg-primary-50 sm:grid"
              title={admin ? 'لوحة التحكم' : 'دخول المشرفين'}
            >
              {admin ? <LayoutDashboard className="h-[18px] w-[18px]" /> : <LogIn className="h-[18px] w-[18px]" />}
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-line bg-white/70 text-primary-700 lg:hidden"
              aria-label="القائمة"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-primary-900/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="islamic-pattern-dark absolute inset-y-0 right-0 flex w-[82%] max-w-xs flex-col p-5 text-white shadow-2xl"
            >
              <div className="mb-8 flex items-center justify-between">
                <Brand light />
                <button onClick={() => setOpen(false)} className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl bg-white/10" aria-label="إغلاق">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV.map((n, i) => (
                  <motion.div key={n.to} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                    <NavLink
                      to={n.to}
                      end={n.end}
                      className={({ isActive }) =>
                        cn('flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition', isActive ? 'bg-white/15 text-gold-200' : 'text-white/85 hover:bg-white/10')
                      }
                    >
                      <n.icon className="h-5 w-5" />
                      {n.label}
                    </NavLink>
                  </motion.div>
                ))}
              </nav>
              <div className="mt-auto space-y-2">
                <Link to="/me" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-4 py-3 font-semibold text-primary-900">
                  <UserRound className="h-5 w-5" />
                  متابعة تقدمي
                </Link>
                <Link to={admin ? '/admin' : '/admin/login'} className="flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-white/85">
                  {admin ? <LayoutDashboard className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                  {admin ? 'لوحة التحكم' : 'دخول المشرفين'}
                </Link>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="no-print mt-16 border-t border-line/70 bg-white/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-6 py-8 text-center">
          <span className="font-display text-lg font-semibold text-primary-700">النشاط الثقافي</span>
          <span className="gold-divider w-32" />
          <span className="text-sm text-muted">1448 هـ</span>
        </div>
      </footer>
    </div>
  )
}
