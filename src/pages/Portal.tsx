import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Award, CalendarCheck, CalendarX, Clock, Crown, LogOut, Phone, QrCode, Sparkles, Trophy, UserRound } from 'lucide-react'
import { rpc } from '../lib/supabase'
import { onTableChange } from '../lib/realtime'
import type { PortalData } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Scanner } from '../components/scanner/Scanner'
import { BadgeMedal, CardsIndicator, EmptyState, LeaderBadge, PageLoader } from '../components/ui/misc'
import { LOG_TYPES } from '../components/shared/LogList'
import { cn, num, signed } from '../lib/format'
import { formatHijri, formatHijriShort, formatWeekday, relativeTime } from '../lib/hijri'

const STORAGE_KEY = 'nashat_portal_key'

function readKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}
function writeKey(v: string | null) {
  try {
    if (v) localStorage.setItem(STORAGE_KEY, v)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* تجاهل */
  }
}

export default function Portal() {
  const [key, setKey] = useState<string | null>(readKey)
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(!!key)

  const load = useCallback(async (k: string) => {
    const d = await rpc<PortalData | null>('student_portal', { p_key: k })
    return d
  }, [])

  useEffect(() => {
    if (!key) return
    let alive = true
    setLoading(true)
    void load(key)
      .then((d) => {
        if (!alive) return
        if (!d) {
          writeKey(null)
          setKey(null)
        } else setData(d)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [key, load])

  // تحديث فوري عند تغيّر بيانات الطالب
  const memberId = data?.member.id
  useEffect(() => {
    if (!memberId || !key) return
    const refresh = () => void load(key).then((d) => d && setData(d))
    const off1 = onTableChange('members', (p) => { if ((p.new as { id?: string })?.id === memberId) refresh() })
    const off2 = onTableChange('member_badges', (p) => { if ((p.new as { member_id?: string })?.member_id === memberId) refresh() })
    return () => { off1(); off2() }
  }, [memberId, key, load])

  if (loading) return <PageLoader />
  if (!key || !data) {
    return (
      <PortalLogin
        onLogin={(k, d) => {
          writeKey(k)
          setData(d)
          setKey(k)
        }}
        load={load}
      />
    )
  }
  return <PortalView data={data} onLogout={() => { writeKey(null); setKey(null); setData(null) }} />
}

function PortalLogin({ onLogin, load }: { onLogin: (k: string, d: PortalData) => void; load: (k: string) => Promise<PortalData | null> }) {
  const [mode, setMode] = useState<'phone' | 'scan'>('phone')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const attempt = async (k: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const d = await load(k)
      if (d) onLogin(k, d)
      else setError(mode === 'phone' ? 'لم نجد طالباً مسجلاً بهذا الرقم. تأكد من الرقم أو امسح بطاقتك.' : 'البطاقة غير معروفة')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="islamic-pattern-dark px-6 py-10 text-center text-white">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-gold-200 to-gold-400 text-primary-900 shadow-lg">
            <UserRound className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">متابعة تقدمي</h1>
          <p className="mt-2 text-sm text-white/70">اطّلع على نقاطك وحضورك وأوسمتك</p>
        </div>
        <div className="p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-sand p-1">
            {([['phone', 'رقم الجوال', Phone], ['scan', 'مسح البطاقة', QrCode]] as const).map(([m, label, Icon]) => (
              <button key={m} onClick={() => { setMode(m); setError(null) }}
                className={cn('relative flex cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition', mode === m ? 'text-primary-700' : 'text-muted')}>
                {mode === m && <motion.span layoutId="portal-tab" className="absolute inset-0 rounded-xl bg-white shadow-sm" />}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {mode === 'phone' ? (
              <motion.form key="phone" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                onSubmit={(e) => { e.preventDefault(); void attempt(phone) }} className="space-y-4">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  dir="ltr"
                  placeholder="05xxxxxxxx"
                  className="field h-14 text-center text-xl tracking-widest"
                  autoFocus
                />
                <Button type="submit" size="lg" className="w-full" loading={busy} disabled={phone.replace(/\D/g, '').length < 9}>دخول</Button>
              </motion.form>
            ) : (
              <motion.div key="scan" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <Scanner onScan={(t) => void attempt(t)} paused={busy} />
                <p className="mt-3 text-center text-sm text-muted">وجّه الكاميرا نحو رمز QR في بطاقتك</p>
              </motion.div>
            )}
          </AnimatePresence>
          {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">{error}</motion.p>}
          <p className="mt-5 text-center text-xs text-muted">سيتذكرك هذا الجهاز تلقائياً في المرة القادمة</p>
        </div>
      </motion.div>
    </div>
  )
}

function PortalView({ data, onLogout }: { data: PortalData; onLogout: () => void }) {
  const { member: m, attendance: a } = data
  const color = m.group_color ?? '#0F4C3A'
  const rate = a.total ? Math.round(((a.present + a.late) / a.total) * 100) : 0

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] text-white shadow-[0_30px_60px_-30px_rgb(11_59_45/0.6)]"
        style={{ background: `linear-gradient(135deg, ${color}, #0B3B2D)` }}>
        <div className="islamic-pattern-dark absolute inset-0 opacity-50 mix-blend-overlay" />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-10">
          <div className="flex flex-1 items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-white/15 text-3xl font-bold ring-2 ring-gold-300/60 backdrop-blur">
              {m.name.trim()[0]}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{m.name}</h1>
                {m.is_leader && <LeaderBadge />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/75">
                <span>مجموعة {m.group_name ?? '—'}</span>
                {data.season && <span>{data.season.name}</span>}
                <span className="tabular" dir="ltr">#{m.member_no}</span>
                <CardsIndicator yellow={m.yellow_cards} red={m.red_cards} />
              </div>
              {m.excluded && <span className="mt-2 inline-block rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold">مُقصى من المنافسة</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 px-6 py-4 text-center backdrop-blur">
              <div className="tabular text-4xl font-bold text-gold-200">{num(m.points)}</div>
              <div className="text-xs text-white/70">نقطة</div>
            </div>
            {data.rank && (
              <div className="rounded-2xl bg-white/10 px-5 py-4 text-center backdrop-blur">
                <div className="tabular flex items-center justify-center gap-1 text-3xl font-bold">
                  {data.rank <= 3 && <Crown className="h-5 w-5 text-gold-300" />}
                  {num(data.rank)}
                </div>
                <div className="text-xs text-white/70">ترتيبك</div>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="card col-span-3 flex items-center gap-4 p-5 sm:col-span-1">
          <RateRing value={rate} color={color} />
          <div>
            <div className="text-sm text-muted">نسبة الحضور</div>
            <div className="text-xs text-muted">{num(a.total)} يوم نشاط</div>
          </div>
        </div>
        <StatTile icon={<CalendarCheck className="h-5 w-5" />} label="حضور" value={a.present} tone="text-emerald-600 bg-emerald-50" />
        <StatTile icon={<Clock className="h-5 w-5" />} label="تأخر" value={a.late} tone="text-amber-600 bg-amber-50" />
        <StatTile icon={<CalendarX className="h-5 w-5" />} label="غياب" value={a.absent} tone="text-red-600 bg-red-50" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><CalendarCheck className="h-5 w-5 text-primary-600" />سجل الحضور</h2>
          {a.days.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">لم تبدأ أيام النشاط بعد</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {a.days.map((d) => (
                <div key={d.date} className={cn('rounded-xl border px-2 py-2.5 text-center text-xs',
                  d.status === 'present' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : d.status === 'late' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700')}>
                  <div className="font-semibold">{formatWeekday(d.date)}</div>
                  <div className="mt-0.5 opacity-80">{formatHijriShort(d.date)}</div>
                  <div className="mt-1 font-bold">{d.status === 'present' ? 'حاضر' : d.status === 'late' ? 'متأخر' : 'غائب'}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Award className="h-5 w-5 text-gold-500" />أوسمتي وإنجازاتي</h2>
          {data.badges.length === 0 ? (
            <EmptyState icon={<Trophy className="h-7 w-7" />} title="لا توجد أوسمة بعد">استمر في التميّز وستحصل على أول وسام قريباً!</EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {data.badges.map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className="flex flex-col items-center rounded-2xl border border-gold-100 bg-gradient-to-b from-gold-50/70 to-white p-4 text-center">
                  <BadgeMedal icon={b.icon} color={b.color} size={52} />
                  <div className="mt-3 text-sm font-bold">{b.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted">{formatHijri(b.awarded_at)}</div>
                  {b.points !== 0 && <div className="tabular mt-1 text-xs font-bold text-gold-600">{signed(b.points)}</div>}
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-primary-600" />آخر حركاتي</h2>
        {data.logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">لا توجد حركات بعد</p>
        ) : (
          <ul className="divide-y divide-line/50">
            {data.logs.map((l) => {
              const t = LOG_TYPES[l.type]
              return (
                <li key={l.id} className={cn('flex items-center gap-3 py-3', l.reverted_at && 'opacity-50')}>
                  <span className={cn('grid h-9 w-9 place-items-center rounded-xl', t.bg, t.color)}><t.icon className="h-4 w-4" /></span>
                  <div className="flex-1">
                    <div className={cn('text-sm font-medium', l.reverted_at && 'line-through')}>{l.title}</div>
                    <div className="text-xs text-muted">{relativeTime(l.ts)}{l.reverted_at && ' · أُلغيت'}</div>
                  </div>
                  {l.delta !== 0 && <span className={cn('tabular font-bold', l.delta > 0 ? 'text-emerald-600' : 'text-red-600')}>{signed(l.delta)}</span>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="flex justify-center">
        <Button variant="outline" onClick={onLogout} icon={<LogOut className="h-4 w-4" />}>تسجيل الخروج من هذا الجهاز</Button>
      </div>
    </div>
  )
}

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-4 text-center sm:flex-row sm:gap-4 sm:p-5 sm:text-start">
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl sm:h-12 sm:w-12', tone)}>{icon}</span>
      <div>
        <div className="tabular text-2xl font-bold">{num(value)}</div>
        <div className="text-sm text-muted">{label}</div>
      </div>
    </div>
  )
}

function RateRing({ value, color }: { value: number; color: string }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} stroke="#f2ecdf" strokeWidth="7" fill="none" />
        <motion.circle cx="32" cy="32" r={r} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (value / 100) * c }} transition={{ duration: 1.2 }} />
      </svg>
      <span className="tabular absolute inset-0 grid place-items-center text-sm font-bold">{value}%</span>
    </div>
  )
}
