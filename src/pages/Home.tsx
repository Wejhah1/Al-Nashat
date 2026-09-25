import { Link } from 'react-router-dom'
import { ArrowLeft, Crown, Trophy, UserRound } from 'lucide-react'
import { useData } from '../context/DataContext'
import { usePosts } from '../hooks/usePosts'
import { PostCard } from '../components/shared/PostCard'
import { LiveTicker } from '../components/leaderboard/LiveFeed'
import { cn, num } from '../lib/format'
import { formatHijri, formatWeekday } from '../lib/hijri'
import { Skeleton } from '../components/ui/misc'

export default function Home() {
  const { home, groupStats, settings, loading } = useData()
  const { posts, loading: postsLoading } = usePosts()
  const frozen = !!settings?.freeze_results
  const max = Math.max(1, ...groupStats.map((g) => g.points))
  const today = new Date()

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
      {/* ===== البطل ===== */}
      <section className="islamic-pattern-dark relative overflow-hidden rounded-3xl px-5 py-10 text-center text-white sm:py-16">
        <div className="text-xs text-white/55 sm:text-sm">{formatWeekday(today)} · {formatHijri(today)}</div>
        <h1 className="mt-3 whitespace-nowrap font-display text-[clamp(2.1rem,10.5vw,4.25rem)] font-bold leading-tight">
          <span className="gold-text">{home.title}</span>
        </h1>
        <div className="mt-1 text-sm tracking-[0.3em] text-gold-200/90 sm:text-base">{home.subtitle}</div>
        {home.tagline && <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">{home.tagline}</p>}
        <div className="mx-auto mt-7 flex max-w-sm justify-center gap-2.5">
          <Link to="/me" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gold-300 text-sm font-semibold text-primary-900 transition active:scale-[0.98]">
            <UserRound className="h-4 w-4" />
            متابعة تقدمي
          </Link>
          <Link to="/leaderboard" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 text-sm font-medium text-white transition active:scale-[0.98]">
            <Trophy className="h-4 w-4" />
            المتصدرون
          </Link>
        </div>
      </section>

      <div className="mt-6 space-y-12 sm:mt-8 sm:space-y-16">
        {home.show_feed && settings?.show_live_feed !== false && <LiveTicker />}

        {/* ===== المجموعات ===== */}
        {home.show_groups && (
          <section>
            <SectionTitle title="ترتيب المجموعات" link={{ to: '/leaderboard', label: 'التفاصيل' }} />
            <div className="card divide-y divide-line/50">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-8" /></div>)
                : groupStats.map((g) => (
                    <div key={g.id} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5 sm:py-4">
                      <span className={cn('tabular grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-semibold',
                        g.rank === 1 ? 'bg-gold-100 text-gold-600' : 'bg-sand text-muted')}>
                        {g.rank === 1 ? <Crown className="h-4 w-4" /> : g.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate font-semibold">{g.name}</span>
                          <span className="tabular text-lg font-bold">{frozen ? '—' : num(g.points)}</span>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-sand">
                          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: frozen ? '0%' : `${(g.points / max) * 100}%`, backgroundColor: g.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </section>
        )}

        {/* ===== الأخبار ===== */}
        {home.show_news && (
          <section>
            <SectionTitle title={home.news_title} link={{ to: '/news', label: 'الكل' }} />
            {postsLoading ? (
              <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
            ) : posts.length === 0 ? (
              <div className="card p-8 text-center text-sm text-muted">لا توجد أخبار بعد</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {posts.slice(0, 6).map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export function SectionTitle({ title, link }: { title: string; link?: { to: string; label: string } }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4 sm:mb-4">
      <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
      {link && (
        <Link to={link.to} className="inline-flex items-center gap-1 text-sm text-primary-700">
          {link.label}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}
