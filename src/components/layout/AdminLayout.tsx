import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Award, BarChart3, BookOpenText, CreditCard, ExternalLink, History, LayoutDashboard, LogOut, Menu, Newspaper,
  ScanLine, Settings, Shapes, Users, X, ScanQrCode, MonitorPlay,
} from 'lucide-react'
import { Brand } from './Brand'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/format'
import { PageLoader } from '../ui/misc'

export const ADMIN_NAV = [
  { section: 'العمليات' },
  { to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/admin/attendance', label: 'التحضير', icon: ScanQrCode },
  { to: '/admin/scan', label: 'الإجراءات السريعة', icon: ScanLine },
  { to: '/admin/logs', label: 'سجل الأحداث', icon: History },
  { section: 'الإدارة', owner: true },
  { to: '/admin/members', label: 'الأعضاء', icon: Users, owner: true },
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

export function AdminLayout() {
  const { admin, loading } = useAuth()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [loc.pathname])

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

      <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line/70 bg-ivory/85 px-4 backdrop-blur-xl lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-line bg-white text-primary-700" aria-label="القائمة">
          <Menu className="h-5 w-5" />
        </button>
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
              className="islamic-pattern-dark absolute inset-y-0 right-0 flex w-[84%] max-w-xs flex-col overflow-y-auto p-5 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <Brand light />
                <button onClick={() => setOpen(false)} className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl bg-white/10 text-white" aria-label="إغلاق">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavItems onNavigate={() => setOpen(false)} />
              <div className="mt-auto">
                <SidebarFooter />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10 print:m-0 print:max-w-none print:p-0">
        <Outlet />
      </main>
    </div>
  )
}

export function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { isOwner } = useAuth()
  if (!isOwner) return <Navigate to="/admin" replace />
  return <>{children}</>
}
