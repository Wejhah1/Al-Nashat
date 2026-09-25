import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight, Award, CalendarCheck, ChevronDown, PenLine, RotateCcw, Sparkles, Square, Undo2, History } from 'lucide-react'
import type { LogEntry, LogType } from '../../lib/types'
import { useData } from '../../context/DataContext'
import { formatHijri, formatTime } from '../../lib/hijri'
import { cn, signed } from '../../lib/format'
import { Button } from '../ui/Button'
import { EmptyState, GroupDot, Skeleton } from '../ui/misc'

export const LOG_TYPES: Record<LogType, { label: string; icon: typeof Sparkles; color: string; bg: string }> = {
  points: { label: 'نقاط', icon: Sparkles, color: 'text-primary-700', bg: 'bg-primary-50' },
  card: { label: 'كرت', icon: Square, color: 'text-amber-700', bg: 'bg-amber-50' },
  attendance: { label: 'تحضير', icon: CalendarCheck, color: 'text-sky-700', bg: 'bg-sky-50' },
  transfer: { label: 'نقل', icon: ArrowLeftRight, color: 'text-violet-700', bg: 'bg-violet-50' },
  badge: { label: 'وسام', icon: Award, color: 'text-gold-600', bg: 'bg-gold-50' },
  edit: { label: 'تعديل', icon: PenLine, color: 'text-slate-600', bg: 'bg-slate-100' },
  undo: { label: 'تراجع', icon: RotateCcw, color: 'text-rose-700', bg: 'bg-rose-50' },
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
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.day}>
          <div className="sticky top-16 z-10 mb-2 flex items-center gap-3">
            <span className="rounded-full border border-gold-200 bg-gold-50/95 px-3 py-1 text-xs font-semibold text-gold-600 backdrop-blur">{g.day}</span>
            <span className="gold-divider flex-1" />
          </div>
          <ul className="space-y-2">
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
                    layout
                    initial={{ opacity: 0, y: -8, backgroundColor: 'rgba(201,162,75,0.18)' }}
                    animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(255,255,255,0.92)' }}
                    transition={{ duration: 0.5 }}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border border-line/70 px-3.5 shadow-[var(--shadow-soft)]',
                      compact ? 'py-2.5' : 'py-3',
                      reverted && 'opacity-55',
                    )}
                  >
                    <span className={cn('relative grid h-10 w-10 shrink-0 place-items-center rounded-xl', t.bg, t.color)}>
                      {cardColor ? <span className={cn('h-5 w-3.5 rounded-[3px] shadow', cardColor)} /> : <Icon className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {showMember && l.member_name && <span className="font-semibold">{l.member_name}</span>}
                        {showMember && group && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <GroupDot color={group.color} className="h-2 w-2" />
                            {group.name}
                          </span>
                        )}
                      </div>
                      <div className={cn('text-sm text-ink/80', reverted && 'line-through')}>{l.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                        <span>{formatTime(l.ts)}</span>
                        {l.admin_name && <span>• بواسطة {l.admin_name}</span>}
                        {reverted && <span className="font-medium text-rose-600">• تم التراجع{l.reverted_by ? ` (${l.reverted_by})` : ''}</span>}
                      </div>
                    </div>
                    {l.delta !== 0 && (
                      <span
                        className={cn(
                          'tabular shrink-0 rounded-xl px-2.5 py-1 text-sm font-bold',
                          l.delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                        )}
                      >
                        {signed(l.delta)}
                      </span>
                    )}
                    {onUndo && !reverted && l.type !== 'undo' && l.inverse && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        title="تراجع"
                        loading={undoingId === l.id}
                        onClick={() => onUndo(l)}
                        icon={<Undo2 className="h-4 w-4" />}
                      />
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
          <Button variant="outline" onClick={onLoadMore} loading={loadingMore} icon={<ChevronDown className="h-4 w-4" />}>
            إظهار المزيد
          </Button>
        </div>
      )}
      {!hasMore && items.length > 20 && <p className="pt-2 text-center text-sm text-muted">— وصلت إلى بداية السجل —</p>}
    </div>
  )
}
