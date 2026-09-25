import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Trophy, Users } from 'lucide-react'
import type { GroupStat } from '../../context/DataContext'
import { cn, num } from '../../lib/format'
import { CardsIndicator, LeaderBadge } from '../ui/misc'

const RANK_STYLES = [
  'from-gold-300 to-gold-500 text-primary-900',
  'from-slate-200 to-slate-400 text-slate-800',
  'from-orange-200 to-orange-400 text-orange-900',
  'from-primary-100 to-primary-200 text-primary-800',
]

export function GroupStandings({ groups, frozen, defaultOpen }: { groups: GroupStat[]; frozen?: boolean; defaultOpen?: string }) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null)
  const max = Math.max(1, ...groups.map((g) => g.points))

  return (
    <div className="grid gap-3 sm:gap-4">
      {groups.map((g, i) => {
        const isOpen = open === g.id
        return (
          <motion.div
            key={g.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, layout: { type: 'spring', damping: 24, stiffness: 220 } }}
            className="card overflow-hidden"
          >
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${g.color}55, ${g.color})` }} />
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : g.id)}
              className="flex w-full cursor-pointer items-center gap-3 p-4 text-start sm:gap-4 sm:p-5"
              aria-expanded={isOpen}
            >
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-lg font-bold shadow-sm', RANK_STYLES[Math.min(g.rank - 1, 3)])}>
                {g.rank === 1 ? <Trophy className="h-5 w-5" /> : g.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="truncate text-lg font-bold">{g.name}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ type: 'spring', damping: 18 }} className="grid h-7 w-7 place-items-center rounded-full bg-sand text-primary-700">
                    <ChevronDown className="h-4 w-4" />
                  </motion.span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{num(g.members.length)} عضو</span>
                  {g.leader && <span className="truncate">القائد: {g.leader.name}</span>}
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-sand">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${g.color}99, ${g.color})` }}
                    initial={{ width: 0 }}
                    animate={{ width: frozen ? '0%' : `${Math.max(4, (g.points / max) * 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-center">
                <motion.div key={g.points} initial={{ scale: 1.25, color: '#c9a24b' }} animate={{ scale: 1, color: g.color }} className="tabular text-2xl font-bold sm:text-3xl">
                  {frozen ? '؟' : num(g.points)}
                </motion.div>
                <div className="text-[11px] text-muted">نقطة</div>
              </div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 230 }}
                  className="overflow-hidden"
                >
                  <ul className="border-t border-line/60 bg-ivory/50 px-3 py-2 sm:px-5">
                    {g.members.length === 0 && <li className="py-4 text-center text-sm text-muted">لا يوجد أعضاء بعد</li>}
                    {g.members.map((m, idx) => (
                      <motion.li
                        key={m.id}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                        className={cn(
                          'flex items-center gap-3 border-b border-line/40 py-2.5 last:border-0',
                          m.is_leader && '-mx-2 rounded-xl border-transparent bg-gold-50/80 px-2',
                          m.excluded && 'opacity-50',
                        )}
                      >
                        <span className="tabular w-6 text-center text-sm font-semibold text-muted">{idx + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={cn('truncate font-medium', m.excluded && 'line-through')}>{m.name}</span>
                            {m.is_leader && <LeaderBadge />}
                            {m.excluded && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">مُقصى</span>}
                            <CardsIndicator yellow={m.yellow_cards} red={m.red_cards} />
                          </span>
                        </span>
                        <span className="tabular font-bold" style={{ color: g.color }}>{frozen ? '—' : num(m.points)}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}
