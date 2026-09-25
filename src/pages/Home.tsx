import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, BookOpenText, Crown, Newspaper, Sparkles, Trophy, UserRound } from 'lucide-react'
import { useData } from '../context/DataContext'
import { usePosts } from '../hooks/usePosts'
import { PostCard } from '../components/shared/PostCard'
import { LiveTicker } from '../components/leaderboard/LiveFeed'
import { cn, num } from '../lib/format'
import { formatHijri, formatWeekday } from '../lib/hijri'
import { Skeleton } from '../components/ui/misc'

export default function Home() {
  const { home, groupStats, ranked, settings, loading } = useData()
  const { posts, loading: postsLoading } = usePosts()
  const frozen = !!settings?.freeze_results
  const max = Math.max(1, ...groupStats.map((g) => g.points))
  const today = new Date()

  return (
    <div>
      {/* ===== البطل ===== */}
      <section className="relative px-4 pb-10 pt-4 sm:px-6">
        <div className="islamic-pattern-dark relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] px-6 py-14 text-center text-white shadow-[0_30px_80px_-30px_rgb(11_59_45/0.6)] sm:px-10 sm:py-20">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-primary-400/25 blur-3xl" />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-gold-300/30 bg-white/5 px-4 py-1.5 text-xs text-gold-100 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {formatWeekday(today)} · {formatHijri(today)}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="relative font-display text-5xl font-bold leading-tight sm:text-7xl"
          >
            <span className="gold-text">{home.title}</span>
          </motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="relative mt-3 flex items-center justify-center gap-3 text-gold-200">
            <span className="h-px w-10 bg-gradient-to-l from-gold-300 to-transparent" />
            <span className="text-base tracking-[0.25em] sm:text-lg">{home.subtitle}</span>
            <span className="h-px w-10 bg-gradient-to-r from-gold-300 to-transparent" />
          </motion.div>
          {home.tagline && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="relative mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              {home.tagline}
            </motion.p>
          )}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/me" className="inline-flex h-14 items-center gap-2.5 rounded-2xl bg-gradient-to-b from-gold-200 to-gold-400 px-7 text-lg font-semibold text-primary-900 shadow-[0_10px_30px_-8px_rgb(201_162_75/0.8)] transition hover:brightness-105 active:scale-[0.98]">
              <UserRound className="h-5 w-5" />
              متابعة تقدمي
            </Link>
            <Link to="/leaderboard" className="inline-flex h-14 items-center gap-2.5 rounded-2xl border border-white/25 bg-white/10 px-7 text-lg font-medium text-white backdrop-blur transition hover:bg-white/20">
              <Trophy className="h-5 w-5 text-gold-200" />
              المتصدرون
            </Link>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:px-6">
        {home.show_feed && settings?.show_live_feed !== false && <LiveTicker />}

        {/* ===== المجموعات ===== */}
        {home.show_groups && (
          <section>
            <SectionTitle icon={<Trophy className="h-5 w-5" />} title="ترتيب المجموعات" link={{ to: '/leaderboard', label: 'لوحة المتصدرين' }} />
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)
                : groupStats.map((g, i) => (
                    <motion.div
                      key={g.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07 }}
                      className="card card-hover relative overflow-hidden p-5"
                    >
                      <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: g.color }} />
                      <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full opacity-[0.08]" style={{ backgroundColor: g.color }} />
                      <div className="flex items-center justify-between">
                        <span className={cn('grid h-8 w-8 place-items-center rounded-xl text-sm font-bold', g.rank === 1 ? 'bg-gradient-to-br from-gold-200 to-gold-400 text-primary-900' : 'bg-sand text-ink/70')}>
                          {g.rank === 1 ? <Crown className="h-4 w-4" /> : g.rank}
                        </span>
                        <span className="text-xs text-muted">{num(g.members.length)} عضو</span>
                      </div>
                      <div className="mt-4 text-lg font-bold sm:text-xl" style={{ color: g.color }}>{g.name}</div>
                      <div className="tabular mt-1 text-3xl font-bold sm:text-4xl">{frozen ? '؟' : num(g.points)}</div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sand">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: g.color }} initial={{ width: 0 }} whileInView={{ width: frozen ? 0 : `${(g.points / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1 }} />
                      </div>
                    </motion.div>
                  ))}
            </div>
          </section>
        )}

        {/* ===== الأوائل ===== */}
        {!frozen && ranked.length > 0 && (
          <section className="grid gap-4 sm:grid-cols-3">
            {ranked.slice(0, 3).map((m, i) => {
              const g = groupStats.find((x) => x.id === m.group_id)
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className={cn('card flex items-center gap-4 p-4', i === 0 && 'shadow-[var(--shadow-gold)]')}>
                  <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-bold',
                    i === 0 ? 'bg-gradient-to-br from-gold-200 to-gold-400 text-primary-900' : i === 1 ? 'bg-gradient-to-br from-slate-100 to-slate-300 text-slate-700' : 'bg-gradient-to-br from-orange-100 to-orange-300 text-orange-900')}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{m.name}</div>
                    <div className="text-xs text-muted">{g?.name}</div>
                  </div>
                  <div className="tabular text-xl font-bold text-primary-700">{num(m.points)}</div>
                </motion.div>
              )
            })}
          </section>
        )}

        {/* ===== الأخبار ===== */}
        {home.show_news && (
          <section>
            <SectionTitle icon={<Newspaper className="h-5 w-5" />} title={home.news_title} link={{ to: '/news', label: 'كل الأخبار' }} />
            {postsLoading ? (
              <div className="grid gap-5 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>
            ) : posts.length === 0 ? (
              <div className="card p-10 text-center text-muted">لا توجد أخبار أو فعاليات منشورة بعد</div>
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
                {posts.slice(0, 6).map((p, i) => <PostCard key={p.id} post={p} index={i} />)}
              </div>
            )}
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <Link to="/rules" className="card card-hover group flex items-center gap-4 p-6">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-700"><BookOpenText className="h-7 w-7" /></span>
            <div className="flex-1">
              <div className="text-lg font-bold">لائحة النقاط</div>
              <div className="text-sm text-muted">تعرّف على طرق كسب النقاط والمخالفات</div>
            </div>
            <ArrowLeft className="h-5 w-5 text-muted transition group-hover:-translate-x-1 group-hover:text-primary-700" />
          </Link>
          <Link to="/log" className="card card-hover group flex items-center gap-4 p-6">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold-50 text-gold-600"><Sparkles className="h-7 w-7" /></span>
            <div className="flex-1">
              <div className="text-lg font-bold">سجل النقاط</div>
              <div className="text-sm text-muted">كل حركة على النقاط بشفافية تامة</div>
            </div>
            <ArrowLeft className="h-5 w-5 text-muted transition group-hover:-translate-x-1 group-hover:text-primary-700" />
          </Link>
        </section>
      </div>
    </div>
  )
}

export function SectionTitle({ icon, title, link }: { icon: React.ReactNode; title: string; link?: { to: string; label: string } }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 text-gold-200 shadow-md">{icon}</span>
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      </div>
      {link && (
        <Link to={link.to} className="group inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-600">
          {link.label}
          <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
        </Link>
      )}
    </div>
  )
}
