import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertOctagon, CheckCircle2, Clock, Keyboard, Play, ScanQrCode, Undo2, UserX, Volume2, VolumeX, XCircle } from 'lucide-react'
import { Scanner } from '../../components/scanner/Scanner'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/misc'
import { useFeedback } from '../../components/ui/Feedback'
import { useData } from '../../context/DataContext'
import { rpc } from '../../lib/supabase'
import type { CheckInResult, MemberInfo } from '../../lib/types'
import { playError, playSuccess, unlockAudio } from '../../lib/sound'
import { cn, num } from '../../lib/format'
import { formatHijri, formatTime, formatWeekday } from '../../lib/hijri'
import { useTodayAttendance } from './Dashboard'

type Overlay =
  | { kind: 'ok'; member: MemberInfo; points: number; late: boolean }
  | { kind: 'duplicate'; member: MemberInfo; at?: string }
  | { kind: 'excluded'; member: MemberInfo }
  | { kind: 'not_found'; code: string }
  | { kind: 'error'; message: string }

interface Recent {
  logId?: number
  member: MemberInfo
  points: number
  late: boolean
  at: Date
  undone?: boolean
}

type LateMode = 'auto' | 'present' | 'late'
const OVERLAY_MS = 2000

export default function Attendance() {
  const { settings } = useData()
  const { toast } = useFeedback()
  const today = useTodayAttendance()
  const [started, setStarted] = useState(false)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [recent, setRecent] = useState<Recent[]>([])
  const [lateMode, setLateMode] = useState<LateMode>('auto')
  const [manual, setManual] = useState('')
  const [muted, setMuted] = useState(false)
  const busy = useRef(false)
  const seen = useRef(new Map<string, MemberInfo>())
  const timer = useRef<number | undefined>(undefined)
  const sound = settings?.sound_enabled !== false && !muted

  const show = useCallback((o: Overlay) => {
    setOverlay(o)
    if (o.kind === 'ok') playSuccess(sound)
    else playError(sound)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setOverlay(null)
      busy.current = false
    }, OVERLAY_MS)
  }, [sound])

  const handle = useCallback(async (raw: string) => {
    const code = raw.trim().toUpperCase()
    if (!code || busy.current) return
    busy.current = true
    // كشف التكرار الفوري داخل الجلسة دون انتظار الشبكة
    const cached = seen.current.get(code)
    if (cached) return show({ kind: 'duplicate', member: cached })
    try {
      const r = await rpc<CheckInResult>('check_in', { p_key: code, p_late: lateMode === 'auto' ? null : lateMode === 'late' })
      if (r.status === 'ok' && r.member) {
        seen.current.set(code, r.member)
        seen.current.set(r.member.code, r.member)
        seen.current.set(String(r.member.member_no), r.member)
        const late = r.attendance_status === 'late'
        setRecent((prev) => [{ logId: r.log_id, member: r.member!, points: r.points ?? 0, late, at: new Date() }, ...prev].slice(0, 50))
        show({ kind: 'ok', member: r.member, points: r.points ?? 0, late })
      } else if (r.status === 'duplicate' && r.member) {
        seen.current.set(code, r.member)
        show({ kind: 'duplicate', member: r.member, at: r.at })
      } else if (r.status === 'excluded' && r.member) {
        show({ kind: 'excluded', member: r.member })
      } else {
        show({ kind: 'not_found', code })
      }
    } catch (e) {
      show({ kind: 'error', message: (e as Error).message })
    }
  }, [lateMode, show])

  const undo = async (r: Recent) => {
    if (!r.logId) return
    try {
      await rpc('undo_log', { p_log: r.logId })
      ;[r.member.code, String(r.member.member_no)].forEach((k) => seen.current.delete(k))
      for (const [k, v] of seen.current) if (v.id === r.member.id) seen.current.delete(k)
      setRecent((prev) => prev.map((x) => (x === r ? { ...x, undone: true } : x)))
      toast(`أُلغي تحضير ${r.member.name}`, 'info')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  if (!started) {
    return (
      <div>
        <PageHeader icon={<ScanQrCode className="h-6 w-6" />} title="التحضير السريع" subtitle="مسح مستمر لبطاقات الأعضاء مع احتساب نقاط الحضور تلقائياً" />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="islamic-pattern-dark relative mx-auto max-w-xl overflow-hidden rounded-[2rem] p-10 text-center text-white shadow-[var(--shadow-lift)]">
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-gold-200 to-gold-400 text-primary-900 shadow-xl">
            <ScanQrCode className="h-12 w-12" />
          </div>
          <div className="text-white/70">{formatWeekday(new Date())} · {formatHijri(new Date())}</div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/10 p-4"><div className="tabular text-3xl font-bold text-gold-200">+{num(settings?.attendance_points ?? 25)}</div><div className="mt-1 text-white/70">نقاط الحضور</div></div>
            <div className="rounded-2xl bg-white/10 p-4"><div className="tabular text-3xl font-bold">{num(today)}</div><div className="mt-1 text-white/70">حضروا اليوم</div></div>
          </div>
          {settings?.late_after && <div className="mt-4 text-sm text-white/70">يُحتسب التأخر تلقائياً بعد الساعة {settings.late_after.slice(0, 5)} (+{num(settings.late_points)})</div>}
          <Button variant="gold" size="lg" className="mt-8 w-full" icon={<Play className="h-5 w-5" />} onClick={() => { unlockAudio(); setStarted(true) }}>
            بدء التحضير
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" /></span>
          <h1 className="text-xl font-bold">التحضير جارٍ</h1>
          <span className="tabular rounded-full bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">{num(today)} حاضر اليوم</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-line bg-white p-1 text-sm">
            {([['auto', 'تلقائي'], ['present', 'حاضر'], ['late', 'متأخر']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setLateMode(k)} className={cn('cursor-pointer rounded-lg px-3 py-1.5 font-medium transition', lateMode === k ? (k === 'late' ? 'bg-amber-500 text-white' : 'bg-primary-700 text-white') : 'text-muted')}>{l}</button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => setMuted(!muted)} icon={muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} title="الصوت" />
          <Button variant="outline" size="sm" onClick={() => setStarted(false)}>إنهاء</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <Scanner onScan={(t) => void handle(t)} paused={!!overlay} repeatDelay={2500} className="mx-auto max-w-[560px] shadow-[var(--shadow-lift)]" />
          <form onSubmit={(e) => { e.preventDefault(); void handle(manual); setManual('') }} className="mx-auto mt-4 flex max-w-[560px] gap-2">
            <div className="relative flex-1">
              <Keyboard className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="أو أدخل رقم العضوية يدوياً" inputMode="numeric" className="field h-12 pr-11" />
            </div>
            <Button type="submit" className="h-12" disabled={!manual.trim()}>تحضير</Button>
          </form>
        </div>

        <aside className="card flex max-h-[70vh] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line/60 px-5 py-3.5">
            <span className="font-semibold">حُضّروا في هذه الجلسة</span>
            <span className="tabular rounded-full bg-sand px-2.5 py-0.5 text-sm">{num(recent.filter((r) => !r.undone).length)}</span>
          </div>
          <ul className="scrollbar-thin flex-1 divide-y divide-line/50 overflow-y-auto">
            <AnimatePresence initial={false}>
              {recent.map((r) => (
                <motion.li key={`${r.member.id}-${r.at.getTime()}`} initial={{ opacity: 0, height: 0, backgroundColor: 'rgba(16,185,129,0.15)' }} animate={{ opacity: 1, height: 'auto', backgroundColor: 'rgba(255,255,255,0)' }}
                  className={cn('flex items-center gap-3 px-5 py-3', r.undone && 'opacity-40')}>
                  <span className="h-8 w-1 rounded-full" style={{ backgroundColor: r.member.group_color ?? '#ccc' }} />
                  <div className="min-w-0 flex-1">
                    <div className={cn('truncate text-sm font-semibold', r.undone && 'line-through')}>{r.member.name}</div>
                    <div className="text-xs text-muted">{formatTime(r.at)} · {r.member.group_name}{r.late && ' · متأخر'}</div>
                  </div>
                  <span className="tabular text-sm font-bold text-emerald-600">+{r.points}</span>
                  {!r.undone && r.logId && (
                    <button onClick={() => void undo(r)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-rose-500 hover:bg-rose-50" title="إلغاء التحضير">
                      <Undo2 className="h-4 w-4" />
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
            {recent.length === 0 && <li className="p-8 text-center text-sm text-muted">امسح أول بطاقة للبدء</li>}
          </ul>
        </aside>
      </div>

      <AnimatePresence>{overlay && <ScanOverlay o={overlay} onClose={() => { window.clearTimeout(timer.current); setOverlay(null); busy.current = false }} />}</AnimatePresence>
    </div>
  )
}

function ScanOverlay({ o, onClose }: { o: Overlay; onClose: () => void }) {
  const ok = o.kind === 'ok'
  const member = 'member' in o ? o.member : null
  const Icon = ok ? CheckCircle2 : o.kind === 'duplicate' ? AlertOctagon : o.kind === 'excluded' ? UserX : XCircle
  const title =
    o.kind === 'ok' ? (o.late ? 'تم التحضير (متأخر)' : 'تم التحضير بنجاح')
      : o.kind === 'duplicate' ? 'تم التحضير من قبل'
        : o.kind === 'excluded' ? 'العضو مُقصى'
          : o.kind === 'not_found' ? 'بطاقة غير معروفة'
            : 'تعذر التحضير'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className={cn('fixed inset-0 z-[80] flex cursor-pointer flex-col items-center justify-center p-6 text-center text-white',
        ok ? 'bg-gradient-to-b from-emerald-500 to-emerald-700' : 'bg-gradient-to-b from-red-500 to-red-700')}
    >
      <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Cg fill='none' stroke='%23fff' stroke-width='1.2'%3E%3Crect x='28' y='28' width='40' height='40'/%3E%3Crect x='28' y='28' width='40' height='40' transform='rotate(45 48 48)'/%3E%3C/g%3E%3C/svg%3E\")" }} />
      <motion.div initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12, stiffness: 260 }}
        className="relative mb-6 grid h-32 w-32 place-items-center rounded-full bg-white/20 ring-8 ring-white/10 sm:h-40 sm:w-40">
        <Icon className="h-20 w-20 sm:h-24 sm:w-24" strokeWidth={1.8} />
      </motion.div>
      <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="relative text-3xl font-bold sm:text-5xl">{title}</motion.h2>
      {member && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="relative mt-6">
          <div className="text-3xl font-bold sm:text-5xl">{member.name}</div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-lg sm:text-2xl">
            <span className="h-3 w-3 rounded-full ring-2 ring-white" style={{ backgroundColor: member.group_color ?? '#fff' }} />
            {member.group_name ?? 'بدون مجموعة'}
          </div>
          {o.kind === 'duplicate' && o.at && <div className="mt-4 flex items-center justify-center gap-2 text-white/85"><Clock className="h-5 w-5" />الساعة {formatTime(o.at)}</div>}
        </motion.div>
      )}
      {o.kind === 'ok' && (
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: 'spring' }}
          className="tabular relative mt-8 rounded-3xl bg-white px-10 py-4 text-5xl font-bold text-emerald-700 shadow-2xl sm:text-7xl">
          +{o.points}
        </motion.div>
      )}
      {o.kind === 'not_found' && <div className="relative mt-4 text-xl text-white/85" dir="ltr">{o.code}</div>}
      {o.kind === 'error' && <div className="relative mt-4 max-w-md text-lg text-white/85">{o.message}</div>}
      <motion.div className="absolute bottom-0 right-0 h-2 bg-white/60" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: OVERLAY_MS / 1000, ease: 'linear' }} />
    </motion.div>
  )
}
