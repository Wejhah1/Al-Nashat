import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { BookOpenText, History, Home, LayoutDashboard, LogIn, Newspaper, Trophy, UserRound } from 'lucide-react'
import { Brand } from './Brand'
import { BottomNav, MoreSheet, type NavItem } from './BottomNav'
import { cn } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../ui/misc'

const NAV = [
  { to: '/', label: 'الرئيسية', icon: Home, end: true },
  { to: '/leaderboard', label: 'المتصدرون', icon: Trophy },
  { to: '/log', label: 'سجل النقاط', icon: History },
  { to: '/rules', label: 'لائحة النقاط', icon: BookOpenText },
  { to: '/news', label: 'الأخبار', icon: Newspaper },
]

const TABS: NavItem[] = [
  { to: '/', label: 'الرئيسية', icon: Home, end: true },
  { to: '/leaderboard', label: 'المتصدرون', icon: Trophy },
  { to: '/me', label: 'تقدّمي', icon: UserRound },
  { to: '/log', label: 'السجل', icon: History },
]

export function PublicLayout() {
  const [more, setMore] = useState(false)
  const loc = useLocation()
  const { admin } = useAuth()
  useEffect(() => setMore(false), [loc.pathname])

  const moreItems: NavItem[] = [
    { to: '/rules', label: 'لائحة النقاط', icon: BookOpenText },
    { to: '/news', label: 'الأخبار والفعاليات', icon: Newspaper },
    admin ? { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard } : { to: '/admin/login', label: 'دخول المشرفين', icon: LogIn },
  ]

  return (
    <div className="islamic-pattern flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-40 border-b border-line/60 bg-ivory/95">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <Brand />
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => cn('relative rounded-lg px-3 py-2 text-[15px] transition', isActive ? 'font-medium text-primary-700' : 'text-ink/65 hover:text-primary-700')}>
                {({ isActive }) => (
                  <>
                    {n.label}
                    {isActive && <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-primary-700" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Link to="/me" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-medium text-white transition hover:bg-primary-600">
              <UserRound className="h-4 w-4" />
              متابعة تقدمي
            </Link>
            <Link to={admin ? '/admin' : '/admin/login'} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-sand hover:text-primary-700"
              title={admin ? 'لوحة التحكم' : 'دخول المشرفين'}>
              {admin ? <LayoutDashboard className="h-[18px] w-[18px]" /> : <LogIn className="h-[18px] w-[18px]" />}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 lg:pb-0">
        <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
      </main>

      <footer className="no-print hidden border-t border-line/60 lg:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted">
          <span className="font-display text-primary-700">النشاط الثقافي</span>
          <span>1448 هـ</span>
        </div>
      </footer>

      <MoreSheet open={more} onClose={() => setMore(false)} items={moreItems} />
      <BottomNav items={TABS} onMore={() => setMore(!more)} moreOpen={more} />
    </div>
  )
}
