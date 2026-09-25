import { NavLink, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { LayoutGrid, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/format'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  external?: boolean
}

/** شريط تنقل سفلي هادئ للجوال */
export function BottomNav({ items, onMore, moreOpen }: { items: NavItem[]; onMore: () => void; moreOpen: boolean }) {
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {items.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => cn('relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors', isActive && !moreOpen ? 'text-primary-700' : 'text-muted')}>
            {({ isActive }) => (
              <>
                {isActive && !moreOpen && <motion.span layoutId="bottom-ind" className="absolute top-0 h-0.5 w-8 rounded-full bg-primary-700" />}
                <t.icon className="h-[21px] w-[21px]" strokeWidth={isActive && !moreOpen ? 2.2 : 1.8} />
                {t.label}
              </>
            )}
          </NavLink>
        ))}
        <button onClick={onMore} className={cn('relative flex cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-medium', moreOpen ? 'text-primary-700' : 'text-muted')}>
          {moreOpen && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary-700" />}
          <LayoutGrid className="h-[21px] w-[21px]" strokeWidth={moreOpen ? 2.2 : 1.8} />
          المزيد
        </button>
      </div>
    </nav>
  )
}

/** قائمة «المزيد» كورقة سفلية */
export function MoreSheet({ open, onClose, items, footer }: { open: boolean; onClose: () => void; items: NavItem[]; footer?: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <motion.div className="absolute inset-0 bg-black/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[calc(76px+env(safe-area-inset-bottom))] pt-2.5">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" />
            <ul>
              {items.map((n) => {
                const inner = (
                  <>
                    <n.icon className="h-5 w-5 text-muted" strokeWidth={1.8} />
                    <span className="flex-1">{n.label}</span>
                  </>
                )
                return (
                  <li key={n.to}>
                    {n.external ? (
                      <Link to={n.to} target="_blank" onClick={onClose} className="flex items-center gap-3.5 rounded-xl px-3 py-3 text-[15px] active:bg-sand">{inner}</Link>
                    ) : (
                      <NavLink to={n.to} end={n.end} onClick={onClose}
                        className={({ isActive }) => cn('flex items-center gap-3.5 rounded-xl px-3 py-3 text-[15px] active:bg-sand', isActive && 'bg-primary-50 font-medium text-primary-700')}>
                        {inner}
                      </NavLink>
                    )}
                  </li>
                )
              })}
            </ul>
            {footer && <div className="mt-2 border-t border-line/60 pt-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
