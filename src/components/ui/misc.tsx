import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  Award, BookOpen, CalendarCheck, Crown, Flame, Gem, Heart, Lightbulb, Medal, Mic, PenTool, Rocket,
  Shield, Sparkles, Star, Target, Trophy, Users, Zap, type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/format'

export const BADGE_ICONS: Record<string, LucideIcon> = {
  award: Award, trophy: Trophy, medal: Medal, crown: Crown, star: Star, sparkles: Sparkles,
  'book-open': BookOpen, 'calendar-check': CalendarCheck, flame: Flame, gem: Gem, heart: Heart,
  lightbulb: Lightbulb, mic: Mic, 'pen-tool': PenTool, rocket: Rocket, shield: Shield, target: Target,
  users: Users, zap: Zap,
}

export function BadgeIcon({ icon, className }: { icon: string; className?: string }) {
  const I = BADGE_ICONS[icon] ?? Award
  return <I className={className} />
}

/** وسام دائري بإطار ذهبي */
export function BadgeMedal({ icon, color, size = 56, className }: { icon: string; color: string; size?: number; className?: string }) {
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 25%, ${color}dd, ${color})`,
        boxShadow: `0 0 0 3px #fff, 0 0 0 5px #dcb96b, 0 8px 18px -6px ${color}`,
      }}
    >
      <BadgeIcon icon={icon} className="text-white" />
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={cn('inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600', className)} />
  )
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner className="h-9 w-9" />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-sand', className)} />
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-primary-600">{icon}</div>}
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, icon, actions }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="flex items-center gap-3.5">
        {icon && (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-gold-200 shadow-[var(--shadow-lift)]">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted sm:text-[15px]">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </motion.div>
  )
}

export function Chip({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', className)}
      style={color ? { backgroundColor: `${color}18`, color } : undefined}
    >
      {children}
    </span>
  )
}

export function GroupDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white', className)} style={{ backgroundColor: color }} />
}

export function LeaderBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-gold-300 to-gold-400 px-2 py-0.5 text-[11px] font-semibold text-primary-900 shadow-sm', className)}>
      <Crown className="h-3 w-3" />
      قائد
    </span>
  )
}

export function CardsIndicator({ yellow, red }: { yellow: number; red: number }) {
  if (!yellow && !red) return null
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: yellow }).map((_, i) => (
        <span key={`y${i}`} className="h-4 w-3 rounded-[3px] bg-yellow-400 shadow-sm ring-1 ring-yellow-500/40" title="كرت أصفر" />
      ))}
      {Array.from({ length: red }).map((_, i) => (
        <span key={`r${i}`} className="h-4 w-3 rounded-[3px] bg-red-600 shadow-sm ring-1 ring-red-700/40" title="كرت أحمر" />
      ))}
    </span>
  )
}

export function StatCard({ label, value, icon, accent = '#0F4C3A', sub }: { label: string; value: ReactNode; icon?: ReactNode; accent?: string; sub?: ReactNode }) {
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="absolute -left-6 -top-6 h-20 w-20 rounded-full opacity-10" style={{ backgroundColor: accent }} />
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        {icon && <span style={{ color: accent }}>{icon}</span>}
      </div>
      <div className="tabular mt-2 text-3xl font-bold" style={{ color: accent }}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}
