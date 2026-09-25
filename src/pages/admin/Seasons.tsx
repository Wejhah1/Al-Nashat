import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarOff, CalendarRange, ChevronDown, Flag, PenLine, Plus, Trash2, Trophy } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { rpc, supabase, friendlyError } from '../../lib/supabase'
import type { Holiday, Season, SeasonResult } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Input, Toggle } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, PageHeader } from '../../components/ui/misc'
import { useFeedback } from '../../components/ui/Feedback'
import { cn, num } from '../../lib/format'
import { addDaysISO, formatHijri, formatHijriShort, fromDateOnly, todayISO } from '../../lib/hijri'

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function dayCount(a: string, b: string) {
  return Math.round((fromDateOnly(b).getTime() - fromDateOnly(a).getTime()) / 86400000) + 1
}

/** عدد أيام النشاط في الموسم (بدون الإجازات الأسبوعية والطارئة) */
function workingDays(s: Season, holidays: Holiday[], until?: string) {
  const end = until && until < s.end_date ? until : s.end_date
  let n = 0
  for (let d = s.start_date; d <= end; d = addDaysISO(d, 1)) {
    const dow = fromDateOnly(d).getUTCDay()
    if (s.weekly_off.includes(dow)) continue
    if (holidays.some((h) => d >= h.start_date && d <= h.end_date)) continue
    n++
  }
  return n
}

export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div>
      <span className="label">أيام الإجازة الأسبوعية</span>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((d, i) => {
          const on = value.includes(i)
          return (
            <button key={d} type="button" onClick={() => onChange(on ? value.filter((x) => x !== i) : [...value, i].sort())}
              className={cn('cursor-pointer rounded-xl border px-3.5 py-2 text-sm font-medium transition', on ? 'border-teal-600 bg-teal-600 text-white' : 'border-line bg-white text-ink/70 hover:border-teal-300')}>
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Seasons() {
  const { season, seasons, holidays } = useData()
  const [editing, setEditing] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [holidayOpen, setHolidayOpen] = useState(false)
  const seasonHolidays = holidays.filter((h) => h.season_id === season?.id)
  const past = seasons.filter((s) => !s.is_active)

  return (
    <div>
      <PageHeader icon={<CalendarRange className="h-6 w-6" />} title="المواسم والإجازات"
        actions={<Button variant="gold" icon={<Flag className="h-4 w-4" />} onClick={() => setNewOpen(true)}>موسم جديد</Button>} />

      {season ? (
        <CurrentSeason season={season} holidays={seasonHolidays} onEdit={() => setEditing(true)} />
      ) : (
        <div className="card"><EmptyState icon={<CalendarRange className="h-7 w-7" />} title="لا يوجد موسم نشط">ابدأ موسماً جديداً لتفعيل التحضير واحتساب النقاط</EmptyState></div>
      )}

      {season && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">الإجازات</h2>
            <Button variant="outline" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setHolidayOpen(true)}>إجازة</Button>
          </div>
          <HolidayList holidays={seasonHolidays} />
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">المواسم السابقة</h2>
          <div className="space-y-3">{past.map((s) => <PastSeason key={s.id} season={s} />)}</div>
        </section>
      )}

      {season && editing && <EditSeason season={season} onClose={() => setEditing(false)} />}
      <NewSeason open={newOpen} onClose={() => setNewOpen(false)} current={season} />
      <AddHoliday open={holidayOpen} onClose={() => setHolidayOpen(false)} season={season} />
    </div>
  )
}

function CurrentSeason({ season, holidays, onEdit }: { season: Season; holidays: Holiday[]; onEdit: () => void }) {
  const today = todayISO()
  const total = workingDays(season, holidays)
  const done = today < season.start_date ? 0 : workingDays(season, holidays, addDaysISO(today, -1))
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="islamic-pattern-dark overflow-hidden rounded-3xl p-6 text-white shadow-[var(--shadow-lift)] sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-medium text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />الموسم الحالي
          </span>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">{season.name}</h2>
          <p className="mt-1.5 text-sm text-white/70">{formatHijri(season.start_date)} — {formatHijri(season.end_date)}</p>
        </div>
        <Button variant="white" size="icon" onClick={onEdit} icon={<PenLine className="h-4 w-4" />} />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 text-center">
        {[[num(done), 'يوم نشاط مضى'], [num(total - done), 'يوم نشاط متبقٍ']].map(([v, l]) => (
          <div key={l} className="rounded-2xl bg-white/[0.08] py-4">
            <div className="tabular text-2xl font-bold text-gold-200 sm:text-3xl">{v}</div>
            <div className="mt-1 text-xs text-white/60">{l}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full rounded-full bg-gradient-to-l from-gold-200 to-gold-400" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {season.weekly_off.map((d) => <span key={d} className="rounded-full bg-white/10 px-3 py-1 text-white/80">إجازة كل {DAYS[d]}</span>)}
        {season.carried_points && <span className="rounded-full bg-gold-400/20 px-3 py-1 text-gold-100">نقاط مُرحّلة من الموسم السابق</span>}
      </div>
    </motion.div>
  )
}

function HolidayList({ holidays }: { holidays: Holiday[] }) {
  const { confirm, toast } = useFeedback()
  const today = todayISO()
  if (!holidays.length) return <div className="card p-8 text-center text-sm text-muted">لا توجد إجازات طارئة</div>

  const remove = async (h: Holiday) => {
    if (!(await confirm({ title: `إلغاء إجازة «${h.name}»؟`, confirmText: 'إلغاء الإجازة', danger: true }))) return
    try {
      await rpc('delete_holiday', { p_id: h.id })
      toast('تم إلغاء الإجازة')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <div className="card divide-y divide-line/50 overflow-hidden">
      {holidays.map((h) => {
        const days = dayCount(h.start_date, h.end_date)
        const isPast = h.end_date < today
        return (
          <div key={h.id} className={cn('flex items-center gap-4 px-5 py-4', isPast && 'opacity-55')}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><CalendarOff className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{h.name}</div>
              <div className="text-sm text-muted">
                {days === 1 ? formatHijri(h.start_date) : `${formatHijriShort(h.start_date)} — ${formatHijri(h.end_date)}`}
              </div>
            </div>
            <span className="tabular rounded-full bg-sand px-3 py-1 text-sm">{num(days)} {days === 1 ? 'يوم' : days === 2 ? 'يومان' : 'أيام'}</span>
            {!isPast && <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50" onClick={() => void remove(h)} icon={<Trash2 className="h-4 w-4" />} />}
          </div>
        )
      })}
    </div>
  )
}

function EditSeason({ season, onClose }: { season: Season; onClose: () => void }) {
  const { toast } = useFeedback()
  const [f, setF] = useState(season)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (f.end_date < f.start_date) return toast('تاريخ النهاية قبل البداية', 'error')
    setBusy(true)
    const { error } = await supabase.from('seasons').update({ name: f.name.trim(), start_date: f.start_date, end_date: f.end_date, weekly_off: f.weekly_off }).eq('id', f.id)
    setBusy(false)
    if (error) return toast(friendlyError(error.message), 'error')
    toast('تم حفظ الموسم')
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="تعديل الموسم" footer={<><Button variant="outline" onClick={onClose}>إلغاء</Button><Button loading={busy} onClick={() => void save()}>حفظ</Button></>}>
      <div className="space-y-5">
        <Input label="اسم الموسم" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="البداية" hint={formatHijriShort(f.start_date)} type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
          <Input label="النهاية" hint={formatHijriShort(f.end_date)} type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
        </div>
        <WeekdayPicker value={f.weekly_off} onChange={(v) => setF({ ...f, weekly_off: v })} />
      </div>
    </Modal>
  )
}

function NewSeason({ open, onClose, current }: { open: boolean; onClose: () => void; current: Season | null }) {
  const { toast, confirm } = useFeedback()
  const [f, setF] = useState({ name: '', start: todayISO(), end: addDaysISO(todayISO(), 90), weekly_off: current?.weekly_off ?? [5, 6], carry: false, reset: true })
  const [busy, setBusy] = useState(false)

  const start = async () => {
    if (!f.name.trim()) return toast('اسم الموسم مطلوب', 'error')
    const ok = await confirm({
      title: `بدء «${f.name.trim()}»؟`,
      message: (
        <div className="space-y-1.5 text-sm">
          {current && <div>سيُغلق «{current.name}» وتُحفظ نتائجه في الأرشيف.</div>}
          <div className="font-medium text-ink">{f.carry ? 'ستُرحّل نقاط الأعضاء إلى الموسم الجديد.' : 'ستبدأ نقاط جميع الأعضاء من الصفر.'}</div>
          {f.reset && <div>ستُصفّر الكروت ويُرفع الإقصاء.</div>}
        </div>
      ),
      confirmText: 'بدء الموسم',
      danger: !f.carry,
    })
    if (!ok) return
    setBusy(true)
    try {
      await rpc('start_season', { p_name: f.name.trim(), p_start: f.start, p_end: f.end, p_weekly_off: f.weekly_off, p_carry_points: f.carry, p_reset_cards: f.reset })
      toast('بدأ الموسم الجديد')
      onClose()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="موسم جديد" footer={<><Button variant="outline" onClick={onClose}>إلغاء</Button><Button variant="gold" loading={busy} onClick={() => void start()}>بدء الموسم</Button></>}>
      <div className="space-y-5">
        <Input label="اسم الموسم" placeholder="الفصل الدراسي الثاني" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="البداية" hint={formatHijriShort(f.start)} type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
          <Input label="النهاية" hint={formatHijriShort(f.end)} type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
        </div>
        <WeekdayPicker value={f.weekly_off} onChange={(v) => setF({ ...f, weekly_off: v })} />
        <div className="rounded-2xl border border-line">
          <Toggle checked={f.carry} onChange={(v) => setF({ ...f, carry: v })} label="ترحيل النقاط" description="الأصل أن تبدأ النقاط من الصفر" />
          <Toggle checked={f.reset} onChange={(v) => setF({ ...f, reset: v })} label="تصفير الكروت والإقصاء" />
        </div>
      </div>
    </Modal>
  )
}

function AddHoliday({ open, onClose, season }: { open: boolean; onClose: () => void; season: Season | null }) {
  const { toast } = useFeedback()
  const [f, setF] = useState({ name: '', start: todayISO(), end: todayISO() })
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (!f.name.trim()) return toast('اسم الإجازة مطلوب', 'error')
    setBusy(true)
    try {
      await rpc('add_holiday', { p_name: f.name.trim(), p_start: f.start, p_end: f.end < f.start ? f.start : f.end })
      toast('أُضيفت الإجازة')
      setF({ name: '', start: todayISO(), end: todayISO() })
      onClose()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="إجازة طارئة" subtitle={season?.name} size="sm"
      footer={<><Button variant="outline" onClick={onClose}>إلغاء</Button><Button loading={busy} onClick={() => void save()}>إضافة</Button></>}>
      <div className="space-y-4">
        <Input label="اسم الإجازة" placeholder="اليوم الوطني" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        <Input label="من" hint={formatHijriShort(f.start)} type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value, end: e.target.value > f.end ? e.target.value : f.end })} />
        <Input label="إلى" hint={formatHijriShort(f.end)} type="date" value={f.end} min={f.start} onChange={(e) => setF({ ...f, end: e.target.value })} />
      </div>
    </Modal>
  )
}

function PastSeason({ season }: { season: Season }) {
  const { groupsById } = useData()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<SeasonResult[] | null>(null)

  const toggle = async () => {
    setOpen(!open)
    if (!rows) {
      const { data } = await supabase.from('season_results').select('*').eq('season_id', season.id).order('points', { ascending: false })
      setRows((data as SeasonResult[]) ?? [])
    }
  }

  const groupTotals = useMemo(() => {
    const m = new Map<string, number>()
    rows?.forEach((r) => r.group_id && m.set(r.group_id, (m.get(r.group_id) ?? 0) + r.points))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  return (
    <div className="card overflow-hidden">
      <button onClick={() => void toggle()} className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-start">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sand text-muted"><Flag className="h-5 w-5" /></span>
        <div className="flex-1">
          <div className="font-semibold">{season.name}</div>
          <div className="text-sm text-muted">{formatHijriShort(season.start_date)} — {formatHijri(season.end_date)}</div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }}><ChevronDown className="h-5 w-5 text-muted" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="grid gap-6 border-t border-line/60 p-5 sm:grid-cols-2">
              <div>
                <div className="mb-3 text-sm font-semibold text-muted">المجموعات</div>
                {groupTotals.map(([gid, pts], i) => {
                  const g = groupsById.get(gid)
                  return (
                    <div key={gid} className="flex items-center gap-3 py-1.5">
                      <span className="tabular w-5 text-muted">{i + 1}</span>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g?.color }} />
                      <span className="flex-1">{g?.name ?? '—'}</span>
                      <span className="tabular font-bold">{num(pts)}</span>
                    </div>
                  )
                })}
              </div>
              <div>
                <div className="mb-3 text-sm font-semibold text-muted">الأوائل</div>
                {rows?.filter((r) => !r.excluded).slice(0, 5).map((r, i) => (
                  <div key={r.member_id} className="flex items-center gap-3 py-1.5">
                    {i === 0 ? <Trophy className="h-4 w-4 text-gold-500" /> : <span className="tabular w-4 text-center text-muted">{i + 1}</span>}
                    <span className="flex-1 truncate">{r.member_name}</span>
                    <span className="tabular font-bold text-primary-700">{num(r.points)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
