import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Award, BarChart3, BookOpenText, CreditCard, ExternalLink, History, LayoutDashboard, LogOut, Newspaper,
  ScanLine, Settings, Shapes, Users, ScanQrCode, MonitorPlay, LayoutGrid, CalendarRange,
} from 'lucide-react'
import { Brand } from './Brand'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/format'
import { PageLoader } from '../ui/misc'
import { Button } from '../ui/Button'

export const ADMIN_NAV = [
  { section: 'العمليات' },
  { to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/admin/attendance', label: 'التحضير', icon: ScanQrCode },
  { to: '/admin/scan', label: 'إجراء سريع', icon: ScanLine },
  { to: '/admin/logs', label: 'سجل الأحداث', icon: History },
  { section: 'الإدارة', owner: true },
  { to: '/admin/members', label: 'الأعضاء', icon: Users, owner: true },
  { to: '/admin/seasons', label: 'المواسم والإجازات', icon: CalendarRange, owner: true },
  { to: '/admin/groups', label: 'المجموعات', icon: Shapes, owner: true },
  { to: '/admin/rules', label: 'لائحة النقاط', icon: BookOpenText, owner: true },
  { to: '/admin/badges', label: 'الأوسمة والإنجازات', icon: Award, owner: true },
  { to: '/admin/content', label: 'الأخبار والواجهة', icon: Newspaper, owner: true },
  { section: 'المخرجات' },
  { to: '/admin/cards', label: 'طباعة البطاقات', icon: CreditCard, owner: true },
  { to: '/admin/reports', label: 'التقارير والإحصائيات', icon: BarChart3 },
  { to: '/admin/settings', label: 'الإعدادات', icon: Settings, owner: true },
] as const

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { isOwner } = useAuth()
  return (
    <nav className="flex flex-col gap-0.5">
      {ADMIN_NAV.filter((n) => !('owner' in n && n.owner) || isOwner).map((n, i) =>
        'section' in n ? (
          <div key={n.section} className={cn('px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-gold-200/70', i > 0 && 'pt-5')}>
            {n.section}
          </div>
        ) : (
          <NavLink
            key={n.to}
            to={n.to}
            end={'end' in n ? n.end : undefined}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition',
                isActive ? 'bg-white/[0.13] text-white shadow-inner' : 'text-white/70 hover:bg-white/[0.07] hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="admin-active" className="absolute inset-y-2 right-0 w-1 rounded-full bg-gold-300" />}
                <n.icon className={cn('h-[18px] w-[18px]', isActive ? 'text-gold-200' : 'text-white/60 group-hover:text-white/90')} />
                {n.label}
              </>
            )}
          </NavLink>
        ),
      )}
    </nav>
  )
}

function SidebarFooter() {
  const { admin, logout } = useAuth()
  return (
    <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
      <div className="flex gap-2">
        <Link to="/" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/[0.07] px-3 py-2 text-xs text-white/80 hover:bg-white/15">
          <ExternalLink className="h-3.5 w-3.5" /> الموقع
        </Link>
        <Link to="/display" target="_blank" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/[0.07] px-3 py-2 text-xs text-white/80 hover:bg-white/15">
          <MonitorPlay className="h-3.5 w-3.5" /> البروجكتر
        </Link>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-black/15 p-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 font-bold text-primary-900">
          {admin?.display_name?.[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{admin?.display_name}</div>
          <div className="text-xs text-gold-200/80">{admin?.role === 'owner' ? 'المدير العام' : 'مشرف'}</div>
        </div>
        <button onClick={() => void logout()} className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white" title="تسجيل الخروج">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

const TABS = [
  { to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/admin/scan', label: 'إجراء', icon: ScanLine },
  { to: '/admin/attendance', label: 'التحضير', icon: ScanQrCode, main: true },
  { to: '/admin/logs', label: 'السجل', icon: History },
] as const

function BottomBar({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid h-[68px] max-w-lg grid-cols-5 items-center px-2">
        {TABS.map((t) =>
          'main' in t ? (
            <NavLink key={t.to} to={t.to} className="flex justify-center">
              {({ isActive }) => (
                <span className={cn('-mt-7 grid h-16 w-16 place-items-center rounded-[22px] text-white shadow-[0_10px_24px_-8px_rgb(15_76_58/0.7)] ring-4 ring-ivory transition active:scale-95',
                  isActive ? 'bg-gradient-to-b from-gold-300 to-gold-500 text-primary-900' : 'bg-gradient-to-b from-primary-600 to-primary-800')}>
                  <t.icon className="h-7 w-7" />
                </span>
              )}
            </NavLink>
          ) : (
            <NavLink key={t.to} to={t.to} end={'end' in t ? t.end : undefined}
              className={({ isActive }) => cn('flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition', isActive && !moreOpen ? 'text-primary-700' : 'text-muted')}>
              {({ isActive }) => (
                <>
                  <span className={cn('grid h-8 w-12 place-items-center rounded-full transition', isActive && !moreOpen && 'bg-primary-50')}>
                    <t.icon className="h-[22px] w-[22px]" />
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          ),
        )}
        <button onClick={onMore} className={cn('flex cursor-pointer flex-col items-center gap-1 py-2 text-[11px] font-medium', moreOpen ? 'text-primary-700' : 'text-muted')}>
          <span className={cn('grid h-8 w-12 place-items-center rounded-full', moreOpen && 'bg-primary-50')}><LayoutGrid className="h-[22px] w-[22px]" /></span>
          المزيد
        </button>
      </div>
    </nav>
  )
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isOwner, admin, logout } = useAuth()
  const tabPaths: string[] = TABS.map((t) => t.to)
  const items = ADMIN_NAV.filter((n): n is Extract<(typeof ADMIN_NAV)[number], { to: string }> => 'to' in n)
    .filter((n) => !tabPaths.includes(n.to) && (!('owner' in n && n.owner) || isOwner))
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <motion.div className="absolute inset-0 bg-primary-900/30 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-ivory px-5 pb-[calc(88px+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-line" />
            <div className="grid grid-cols-3 gap-3">
              {items.map((n) => (
                <NavLink key={n.to} to={n.to} onClick={onClose}
                  className={({ isActive }) => cn('flex flex-col items-center gap-2 rounded-2xl p-4 text-center text-xs font-medium transition', isActive ? 'bg-primary-700 text-white' : 'bg-white text-ink shadow-[var(--shadow-soft)]')}>
                  <n.icon className="h-6 w-6" />
                  {n.label}
                </NavLink>
              ))}
              <Link to="/display" target="_blank" className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center text-xs font-medium shadow-[var(--shadow-soft)]">
                <MonitorPlay className="h-6 w-6" />البروجكتر
              </Link>
              <Link to="/" className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center text-xs font-medium shadow-[var(--shadow-soft)]">
                <ExternalLink className="h-6 w-6" />الموقع
              </Link>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[var(--shadow-soft)]">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 font-bold text-primary-900">{admin?.display_name?.[0]}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{admin?.display_name}</div>
                <div className="text-xs text-muted">{admin?.role === 'owner' ? 'المدير العام' : 'مشرف'}</div>
              </div>
              <Button variant="ghost" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={() => void logout()}>خروج</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function AdminLayout() {
  const { admin, loading } = useAuth()
  const loc = useLocation()
  const [more, setMore] = useState(false)
  useEffect(() => setMore(false), [loc.pathname])

  if (loading) return <div className="islamic-pattern min-h-dvh"><PageLoader /></div>
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />

  return (
    <div className="islamic-pattern min-h-dvh lg:pr-72 print:!bg-none print:!p-0">
      <aside className="islamic-pattern-dark no-print fixed inset-y-0 right-0 z-30 hidden w-72 flex-col overflow-y-auto p-5 lg:flex">
        <div className="mb-8 px-2">
          <Brand light />
          <div className="mt-3 text-xs text-white/50">لوحة التحكم</div>
        </div>
        <NavItems />
        <div className="mt-auto">
          <SidebarFooter />
        </div>
      </aside>

      <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line/60 bg-ivory/85 px-5 backdrop-blur-xl lg:hidden">
        <Brand />
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">{admin.display_name}</span>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:py-10 print:m-0 print:max-w-none print:p-0">
        <Outlet />
      </main>

      <MoreSheet open={more} onClose={() => setMore(false)} />
      <BottomBar onMore={() => setMore(!more)} moreOpen={more} />
    </div>
  )
}

export function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { isOwner } = useAuth()
  if (!isOwner) return <Navigate to="/admin" replace />
  return <>{children}</>
}
