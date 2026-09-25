import { useLogs } from '../../hooks/useLogs'
import { useData } from '../../context/DataContext'
import { cn, signed } from '../../lib/format'
import { relativeTime } from '../../lib/hijri'

/** شريط الأحداث الحية (Marquee) */
export function LiveTicker({ dark }: { dark?: boolean }) {
  const { items } = useLogs({}, 15)
  const { groupsById } = useData()
  const list = items.filter((l) => !l.reverted_at && l.type !== 'undo' && l.type !== 'edit')
  if (!list.length) return null
  const row = (
    <div className="flex shrink-0 items-center gap-7 px-4">
      {list.map((l) => {
        const g = l.group_id ? groupsById.get(l.group_id) : null
        return (
          <span key={l.id} className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g?.color ?? '#c9a24b' }} />
            <span className="font-semibold">{l.member_name}</span>
            <span className={dark ? 'text-white/70' : 'text-muted'}>{l.title}</span>
            {l.delta !== 0 && (
              <span className={cn('tabular font-bold', l.delta > 0 ? (dark ? 'text-emerald-300' : 'text-emerald-600') : dark ? 'text-rose-300' : 'text-red-600')}>
                {signed(l.delta)}
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
  return (
    <div className={cn('relative flex items-center overflow-hidden rounded-xl border', dark ? 'border-white/10 bg-white/5 text-white' : 'border-line/60 bg-white')}>
      <div className={cn('z-10 flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs font-semibold', dark ? 'text-gold-200' : 'text-red-600')}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
        مباشر
      </div>
      <div className="relative flex-1 overflow-hidden py-2.5" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)' }}>
        <div className="marquee-track flex w-max">
          {row}
          {row}
        </div>
      </div>
    </div>
  )
}

/** قائمة آخر الأحداث بشكل عمودي */
export function LiveList({ limit = 8 }: { limit?: number }) {
  const { items, loading } = useLogs({}, limit)
  const { groupsById } = useData()
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
        آخر الأحداث
      </div>
      {loading ? (
        <div className="py-6 text-center text-sm text-muted">جاري التحميل…</div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted">لا توجد أحداث بعد</div>
      ) : (
        <ul className="space-y-3">
          {items.map((l) => {
            const g = l.group_id ? groupsById.get(l.group_id) : null
            return (
              <li key={l.id} className={cn('flex items-center gap-3', l.reverted_at && 'opacity-50')}>
                <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: g?.color ?? '#c9a24b' }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{l.member_name ?? '—'}</div>
                  <div className={cn('truncate text-xs text-muted', l.reverted_at && 'line-through')}>{l.title} · {relativeTime(l.ts)}</div>
                </div>
                {l.delta !== 0 && (
                  <span className={cn('tabular text-sm font-bold', l.delta > 0 ? 'text-emerald-600' : 'text-red-600')}>{signed(l.delta)}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
