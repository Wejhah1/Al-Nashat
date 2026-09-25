import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { EyeOff, MonitorPlay, Search, Trophy, Users } from 'lucide-react'
import { useData } from '../context/DataContext'
import { Podium } from '../components/leaderboard/Podium'
import { GroupStandings } from '../components/leaderboard/GroupStandings'
import { LiveList, LiveTicker } from '../components/leaderboard/LiveFeed'
import { PageHeader, PageLoader, LeaderBadge } from '../components/ui/misc'
import { cn, num } from '../lib/format'

export default function Leaderboard() {
  const { groupStats, ranked, settings, loading, groupsById } = useData()
  const [q, setQ] = useState('')
  const frozen = !!settings?.freeze_results
  if (loading) return <PageLoader />

  const filtered = q ? ranked.filter((m) => m.name.includes(q.trim())) : ranked.slice(3, 30)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader
        icon={<Trophy className="h-6 w-6" />}
        title="لوحة المتصدرين"
        subtitle="تتحدث النتائج لحظياً مع كل نقطة تُضاف"
        actions={
          <Link to="/display" target="_blank" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-medium text-primary-700 hover:bg-primary-50">
            <MonitorPlay className="h-4 w-4" />
            وضع العرض
          </Link>
        }
      />

      {frozen && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gold-200 bg-gold-50 p-4 text-gold-600">
          <EyeOff className="h-5 w-5" />
          <span className="font-medium">النتائج مجمّدة حالياً استعداداً للحفل الختامي — ترقّبوا الإعلان!</span>
        </div>
      )}

      {settings?.show_live_feed !== false && <div className="mb-8"><LiveTicker /></div>}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <section className="card islamic-pattern overflow-hidden px-4 pb-0 pt-10 sm:px-10">
            <h2 className="mb-10 text-center text-lg font-bold text-primary-700">منصة التتويج</h2>
            {frozen ? (
              <div className="py-16 text-center text-muted">سيُكشف عن الأبطال قريباً ✨</div>
            ) : (
              <Podium members={ranked} />
            )}
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Users className="h-5 w-5 text-primary-600" />
              المجموعات
              <span className="text-sm font-normal text-muted">— اضغط على المجموعة لعرض أعضائها</span>
            </h2>
            <GroupStandings groups={groupStats} frozen={frozen} />
          </section>

          {!frozen && (
            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold">ترتيب الأعضاء</h2>
                <div className="relative sm:w-72">
                  <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن اسم…" className="field pr-10" />
                </div>
              </div>
              <div className="card divide-y divide-line/50 overflow-hidden">
                {filtered.map((m) => {
                  const rank = ranked.indexOf(m) + 1
                  const g = m.group_id ? groupsById.get(m.group_id) : null
                  return (
                    <motion.div layout key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <span className={cn('tabular w-8 text-center font-bold', rank <= 3 ? 'text-gold-500' : 'text-muted')}>{rank}</span>
                      <span className="h-8 w-1 rounded-full" style={{ backgroundColor: g?.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{m.name}</span>
                          {m.is_leader && <LeaderBadge />}
                        </div>
                        <div className="text-xs text-muted">{g?.name}</div>
                      </div>
                      <span className="tabular text-lg font-bold text-primary-700">{num(m.points)}</span>
                    </motion.div>
                  )
                })}
                {filtered.length === 0 && <div className="p-8 text-center text-muted">لا توجد نتائج</div>}
              </div>
            </section>
          )}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <LiveList limit={10} />
        </aside>
      </div>
    </div>
  )
}
