import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Crown } from 'lucide-react'
import type { GroupStat } from '../../context/DataContext'
import { cn, num } from '../../lib/format'
import { CardsIndicator } from '../ui/misc'

export function GroupStandings({ groups, frozen, defaultOpen }: { groups: GroupStat[]; frozen?: boolean; defaultOpen?: string }) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null)
  const max = Math.max(1, ...groups.map((g) => g.points))

  return (
    <div className="card divide-y divide-line/50 overflow-hidden">
      {groups.map((g) => {
        const isOpen = open === g.id
        return (
          <div key={g.id}>
            <button type="button" onClick={() => setOpen(isOpen ? null : g.id)} aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-start transition-colors active:bg-sand/60 sm:px-5 sm:py-4">
              <span className={cn('tabular grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-semibold',
                g.rank === 1 ? 'bg-gold-100 text-gold-600' : 'bg-sand text-muted')}>
                {g.rank === 1 ? <Crown className="h-4 w-4" /> : g.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-1.5 truncate font-semibold">
                    {g.name}
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-200', isOpen && 'rotate-180')} />
                  </span>
                  <span className="tabular text-lg font-bold">{frozen ? '—' : num(g.points)}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-sand">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: frozen ? '0%' : `${(g.points / max) * 100}%`, backgroundColor: g.color }} />
                  </div>
                  <span className="shrink-0 text-xs text-muted">{num(g.members.length)} عضو</span>
                </div>
              </div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="overflow-hidden">
                  <ul className="bg-ivory/70 px-4 py-1 sm:px-5">
                    {g.members.length === 0 && <li className="py-4 text-center text-sm text-muted">لا يوجد أعضاء</li>}
                    {g.members.map((m, idx) => (
                      <li key={m.id} className={cn('flex items-center gap-3 border-b border-line/40 py-2.5 text-[15px] last:border-0', m.excluded && 'opacity-45')}>
                        <span className="tabular w-5 text-center text-xs text-muted">{idx + 1}</span>
                        <span className={cn('min-w-0 flex-1 truncate', m.excluded && 'line-through')}>{m.name}</span>
                        {m.is_leader && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gold-100 px-1.5 py-0.5 text-[11px] font-medium text-gold-600">
                            <Crown className="h-3 w-3" />قائد
                          </span>
                        )}
                        <CardsIndicator yellow={m.yellow_cards} red={m.red_cards} />
                        <span className="tabular w-12 text-left font-semibold">{frozen ? '—' : num(m.points)}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
