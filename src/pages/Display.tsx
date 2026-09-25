import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Crown, Maximize, Minimize } from 'lucide-react'
import { useData } from '../context/DataContext'
import { Podium } from '../components/leaderboard/Podium'
import { LiveTicker } from '../components/leaderboard/LiveFeed'
import { cn, num } from '../lib/format'
import { formatHijri, formatTime } from '../lib/hijri'

/** وضع البروجكتر: شاشة كاملة بتحديث حي */
export default function Display() {
  const { groupStats, ranked, settings, home } = useData()
  const [now, setNow] = useState(new Date())
  const [full, setFull] = useState(false)
  const frozen = !!settings?.freeze_results
  const max = Math.max(1, ...groupStats.map((g) => g.points))

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000)
    const onFs = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      clearInterval(t)
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [])

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }

  return (
    <div className="islamic-pattern-dark flex h-dvh min-h-[640px] flex-col overflow-hidden p-5 text-white xl:p-8">
      <div className="pointer-events-none fixed -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-gold-400/15 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-primary-400/20 blur-3xl" />

      <header className="relative mb-5 flex items-center justify-between">
        <div>
          <h1 className="whitespace-nowrap font-display text-4xl font-bold xl:text-6xl"><span className="gold-text">{home.title}</span></h1>
          <div className="mt-2 tracking-[0.3em] text-gold-200 xl:text-xl">{home.subtitle}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-left">
            <div className="tabular text-3xl font-bold xl:text-5xl">{formatTime(now)}</div>
            <div className="text-sm text-white/60 xl:text-lg">{formatHijri(now)}</div>
          </div>
          <button onClick={toggleFull} className="grid h-12 w-12 cursor-pointer place-items-center rounded-xl bg-white/10 hover:bg-white/20" title="ملء الشاشة">
            {full ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div className="relative grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="flex min-h-0 flex-col rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur xl:p-8">
          <h2 className="mb-4 text-center text-2xl font-bold text-gold-200 xl:text-3xl">ترتيب المجموعات</h2>
          <div className="flex flex-1 flex-col justify-center gap-3 xl:gap-4">
            <AnimatePresence>
              {groupStats.map((g) => (
                <motion.div
                  key={g.id}
                  layout
                  transition={{ type: 'spring', damping: 22, stiffness: 150 }}
                  className={cn('relative overflow-hidden rounded-2xl border p-4 xl:p-5', g.rank === 1 ? 'border-gold-300/60 bg-gold-400/10 shadow-[0_0_40px_-10px_rgb(201_162_75/0.6)]' : 'border-white/10 bg-white/5')}
                >
                  <motion.div
                    className="absolute inset-y-0 right-0 opacity-25"
                    style={{ background: `linear-gradient(270deg, ${g.color}, transparent)` }}
                    animate={{ width: frozen ? '0%' : `${(g.points / max) * 100}%` }}
                    transition={{ duration: 1.2 }}
                  />
                  <div className="relative flex items-center gap-5">
                    <span className={cn('grid h-14 w-14 place-items-center rounded-2xl text-2xl font-bold xl:h-16 xl:w-16', g.rank === 1 ? 'bg-gradient-to-br from-gold-200 to-gold-400 text-primary-900' : 'bg-white/10')}>
                      {g.rank === 1 ? <Crown className="h-7 w-7" /> : g.rank}
                    </span>
                    <span className="h-10 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                    <span className="flex-1 text-2xl font-bold xl:text-4xl">{g.name}</span>
                    <motion.span key={g.points} initial={{ scale: 1.4, color: '#f5e9c9' }} animate={{ scale: 1, color: '#ffffff' }} className="tabular text-4xl font-bold xl:text-6xl">
                      {frozen ? '؟' : num(g.points)}
                    </motion.span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur xl:p-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-gold-200 xl:text-3xl">أبطال النشاط</h2>
          {frozen ? (
            <div className="grid flex-1 place-items-center text-3xl text-white/70">✨ سيُكشف عن الأبطال قريباً ✨</div>
          ) : (
            <>
              <Podium members={ranked} dark />
              <ul className="mt-5 grid gap-2">
                {ranked.slice(3, 6).map((m, i) => (
                  <motion.li layout key={m.id} className="flex items-center gap-4 rounded-xl bg-white/5 px-4 py-2.5 text-lg">
                    <span className="tabular w-6 text-white/50">{i + 4}</span>
                    <span className="flex-1 truncate">{m.name}</span>
                    <span className="tabular font-bold text-gold-200">{num(m.points)}</span>
                  </motion.li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="relative mt-5">
        <LiveTicker dark />
      </div>
    </div>
  )
}
