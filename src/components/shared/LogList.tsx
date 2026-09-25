import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight, Award, CalendarCheck, CalendarOff, ChevronDown, Flag, PenLine, RotateCcw, Sparkles, Square, Undo2, History } from 'lucide-react'
import type { LogEntry, LogType } from '../../lib/types'
import { useData } from '../../context/DataContext'
import { formatHijri, formatTime } from '../../lib/hijri'
import { cn, signed } from '../../lib/format'
import { Button } from '../ui/Button'
import { EmptyState, Skeleton } from '../ui/misc'

export const LOG_TYPES: Record<LogType, { label: string; icon: typeof Sparkles; color: string; bg: string }> = {
  points: { label: 'نقاط', icon: Sparkles, color: 'text-primary-700', bg: 'bg-primary-50' },
  card: { label: 'كرت', icon: Square, color: 'text-amber-700', bg: 'bg-amber-50' },
  attendance: { label: 'تحضير', icon: CalendarCheck, color: 'text-sky-700', bg: 'bg-sky-50' },
  transfer: { label: 'نقل', icon: ArrowLeftRight, color: 'text-violet-700', bg: 'bg-violet-50' },
  badge: { label: 'وسام', icon: Award, color: 'text-gold-600', bg: 'bg-gold-50' },
  edit: { label: 'تعديل', icon: PenLine, color: 'text-slate-600', bg: 'bg-slate-100' },
  undo: { label: 'تراجع', icon: RotateCcw, color: 'text-rose-700', bg: 'bg-rose-50' },
  season: { label: 'موسم', icon: Flag, color: 'text-primary-700', bg: 'bg-gold-50' },
  holiday: { label: 'إجازة', icon: CalendarOff, color: 'text-teal-700', bg: 'bg-teal-50' },
}

interface Props {
  items: LogEntry[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onUndo?: (log: LogEntry) => void
  undoingId?: number | null
  compact?: boolean
  showMember?: boolean
}

export function LogList({ items, loading, hasMore, loadingMore, onLoadMore, onUndo, undoingId, compact, showMember = true }: Props) {
  const { groupsById } = useData()

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  }
  if (!items.length) {
    return <EmptyState icon={<History className="h-7 w-7" />} title="لا توجد أحداث بعد">ستظهر هنا كل حركة تتم على النقاط فور حدوثها.</EmptyState>
  }

  // تجميع حسب اليوم الهجري
  const groups: { day: string; items: LogEntry[] }[] = []
  for (const it of items) {
    const day = formatHijri(it.ts)
    const g = groups[groups.length - 1]
    if (g?.day === day) g.items.push(it)
    else groups.push({ day, items: [it] })
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.day}>
          <div className="mb-2 px-1 text-xs font-medium text-muted">{g.day}</div>
          <ul className="card divide-y divide-line/50 overflow-hidden">
            <AnimatePresence initial={false}>
              {g.items.map((l) => {
                const t = LOG_TYPES[l.type] ?? LOG_TYPES.points
                const Icon = t.icon
                const group = l.group_id ? groupsById.get(l.group_id) : null
                const reverted = !!l.reverted_at
                const cardColor = l.type === 'card' ? (l.payload?.color === 'red' || l.payload?.converted ? 'bg-red-600' : 'bg-yellow-400') : null
                return (
                  <motion.li
                    key={l.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: reverted ? 0.5 : 1 }}
                    className={cn('flex items-center gap-3 px-4', compact ? 'py-2.5' : 'py-3')}
                  >
                    <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', t.bg, t.color)}>
                      {cardColor ? <span className={cn('h-4 w-3 rounded-[2px]', cardColor)} /> : <Icon className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {showMember && l.member_name ? (
                        <>
                          <div className="flex items-center gap-1.5 text-[15px]">
                            <span className="truncate font-medium">{l.member_name}</span>
                            {group && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />}
                          </div>
                          <div className={cn('truncate text-[13px] text-muted', reverted && 'line-through')}>{l.title}</div>
                        </>
                      ) : (
                        <div className={cn('truncate text-[15px]', !l.member_name && 'font-medium', reverted && 'line-through')}>{l.title}</div>
                      )}
                      <div className="mt-0.5 truncate text-[11px] text-muted/80">
                        {formatTime(l.ts)}
                        {l.admin_name && ` · ${l.admin_name}`}
                        {reverted && ' · أُلغي'}
                      </div>
                    </div>
                    {l.delta !== 0 && (
                      <span className={cn('tabular shrink-0 text-[15px] font-semibold', l.delta > 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {signed(l.delta)}
                      </span>
                    )}
                    {onUndo && !reverted && l.type !== 'undo' && l.inverse && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:bg-rose-50 hover:text-rose-600" title="تراجع"
                        loading={undoingId === l.id} onClick={() => onUndo(l)} icon={<Undo2 className="h-4 w-4" />} />
                    )}
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        </div>
      ))}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="ghost" onClick={onLoadMore} loading={loadingMore} icon={<ChevronDown className="h-4 w-4" />}>
            إظهار المزيد
          </Button>
        </div>
      )}
      {!hasMore && items.length > 20 && <p className="pt-2 text-center text-sm text-muted">— وصلت إلى بداية السجل —</p>}
    </div>
  )
}
