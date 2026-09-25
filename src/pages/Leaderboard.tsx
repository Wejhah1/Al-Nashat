import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EyeOff, MonitorPlay, Search } from 'lucide-react'
import { useData } from '../context/DataContext'
import { Podium } from '../components/leaderboard/Podium'
import { GroupStandings } from '../components/leaderboard/GroupStandings'
import { LiveList } from '../components/leaderboard/LiveFeed'
import { PageHeader, PageLoader } from '../components/ui/misc'
import { SectionTitle } from './Home'
import { cn, num } from '../lib/format'

export default function Leaderboard() {
  const { groupStats, ranked, settings, loading, groupsById } = useData()
  const [q, setQ] = useState('')
  const frozen = !!settings?.freeze_results
  if (loading) return <PageLoader />

  const filtered = q ? ranked.filter((m) => m.name.includes(q.trim())) : ranked.slice(3, 30)

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <PageHeader
        title="المتصدرون"
        actions={
          <Link to="/display" target="_blank" className="hidden h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-primary-700 hover:bg-primary-50 sm:inline-flex">
            <MonitorPlay className="h-4 w-4" />
            وضع العرض
          </Link>
        }
      />

      {frozen && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-600">
          <EyeOff className="h-4 w-4" />
          النتائج مجمّدة حتى الحفل الختامي
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {!frozen && (
            <section className="card px-3 pt-10 sm:px-8">
              <Podium members={ranked} />
            </section>
          )}

          <section>
            <SectionTitle title="المجموعات" />
            <GroupStandings groups={groupStats} frozen={frozen} />
          </section>

          {!frozen && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold sm:text-xl">الترتيب العام</h2>
                <div className="relative w-44 sm:w-64">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث" className="field h-9 pr-9 text-sm" />
                </div>
              </div>
              <div className="card divide-y divide-line/50 overflow-hidden">
                {filtered.map((m) => {
                  const rank = ranked.indexOf(m) + 1
                  const g = m.group_id ? groupsById.get(m.group_id) : null
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={cn('tabular w-6 text-center text-sm font-semibold', rank <= 3 ? 'text-gold-500' : 'text-muted')}>{rank}</span>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: g?.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px]">{m.name}</div>
                      </div>
                      <span className="text-xs text-muted">{g?.name}</span>
                      <span className="tabular w-12 text-left font-semibold">{num(m.points)}</span>
                    </div>
                  )
                })}
                {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted">لا توجد نتائج</div>}
              </div>
            </section>
          )}
        </div>
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <LiveList limit={10} />
        </aside>
      </div>
    </div>
  )
}
