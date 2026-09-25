import { motion } from 'motion/react'
import { Crown, Medal } from 'lucide-react'
import type { Member } from '../../lib/types'
import { useData } from '../../context/DataContext'
import { cn, initials, num } from '../../lib/format'

const PLACES = [
  { place: 2, height: 'h-20 sm:h-32', ring: 'from-slate-200 via-slate-100 to-slate-300', label: 'الفضي', medal: '#9aa4b2', order: 'order-1' },
  { place: 1, height: 'h-28 sm:h-44', ring: 'from-gold-200 via-gold-100 to-gold-400', label: 'الذهبي', medal: '#c9a24b', order: 'order-2' },
  { place: 3, height: 'h-14 sm:h-24', ring: 'from-orange-200 via-orange-100 to-orange-300', label: 'البرونزي', medal: '#b87333', order: 'order-3' },
]

export function Podium({ members, frozen, dark }: { members: Member[]; frozen?: boolean; dark?: boolean }) {
  const { groupsById } = useData()
  const top = members.slice(0, 3)

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4">
      {PLACES.map((p, idx) => {
        const m = top[p.place - 1]
        const group = m?.group_id ? groupsById.get(m.group_id) : null
        return (
          <motion.div
            key={p.place}
            className={cn('flex w-[31%] max-w-[210px] flex-col items-center', p.order)}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + idx * 0.12, type: 'spring', damping: 18 }}
          >
            {m ? (
              <>
                <div className="relative mb-3">
                  {p.place === 1 && (
                    <motion.div
                      className="absolute -top-7 left-1/2 -translate-x-1/2 text-gold-400"
                      animate={{ y: [0, -4, 0], rotate: [0, -4, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 3 }}
                    >
                      <Crown className="h-6 w-6" fill="currentColor" />
                    </motion.div>
                  )}
                  <div
                    className={cn(
                      'rounded-full bg-gradient-to-br p-[3px]',
                      p.ring,
                                          )}
                  >
                    <div
                      className={cn(
                        'grid place-items-center rounded-full font-bold text-white',
                        p.place === 1 ? 'h-16 w-16 text-xl sm:h-20 sm:w-20 sm:text-2xl' : 'h-12 w-12 text-lg sm:h-16 sm:w-16 sm:text-xl',
                      )}
                      style={{ background: `linear-gradient(145deg, ${group?.color ?? '#0F4C3A'}, ${group?.color ?? '#0F4C3A'}cc)` }}
                    >
                      {initials(m.name)}
                    </div>
                  </div>
                  <span
                    className="absolute -bottom-1 left-1/2 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full text-xs font-bold text-white shadow-md ring-2 ring-white"
                    style={{ backgroundColor: p.medal }}
                  >
                    {p.place}
                  </span>
                </div>
                <div className={cn('line-clamp-2 min-h-[2.5em] text-center text-[13px] font-semibold leading-tight sm:text-base', dark ? 'text-white' : 'text-ink')}>
                  {m.name}
                </div>
                {group && (
                  <div className={cn('mt-0.5 text-xs', dark ? 'text-white/60' : 'text-muted')}>{group.name}</div>
                )}
              </>
            ) : (
              <div className="mb-3 grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-line text-muted">
                <Medal className="h-6 w-6" />
              </div>
            )}
            <div
              className={cn(
                'relative mt-3 flex w-full flex-col items-center justify-start overflow-hidden rounded-t-2xl pt-3',
                p.height,
                p.place === 1
                  ? 'bg-gold-400'
                  : dark ? 'bg-gradient-to-b from-white/20 to-white/5' : 'bg-primary-700',
              )}
            >
              {m && !frozen && (
                <span className={cn('tabular relative text-lg font-bold sm:text-2xl', p.place === 1 ? 'text-primary-900' : 'text-white')}>
                  {num(m.points)}
                </span>
              )}
              <span className={cn('relative text-[11px] font-medium', p.place === 1 ? 'text-primary-900/70' : 'text-white/70')}>
                {frozen ? '؟؟' : 'نقطة'}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
