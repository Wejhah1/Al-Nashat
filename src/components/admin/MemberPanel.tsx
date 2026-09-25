import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight, Award, Check, Minus, PenLine, Plus, Undo2, X } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useFeedback } from '../ui/Feedback'
import { rpc } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { BadgeMedal, CardsIndicator, LeaderBadge } from '../ui/misc'
import { Modal } from '../ui/Modal'
import { cn, num, signed } from '../../lib/format'
import { playError, playSuccess } from '../../lib/sound'
import { useLogs } from '../../hooks/useLogs'
import { LogList } from '../shared/LogList'

type Result = { log_id?: number; converted?: boolean; excluded?: boolean }

export function MemberPanel({ memberId, onClose }: { memberId: string; onClose?: () => void }) {
  const { membersById, groupsById, groups, rules, badges, settings } = useData()
  const { toast, confirm } = useFeedback()
  const m = membersById.get(memberId)
  const [busy, setBusy] = useState<string | null>(null)
  const [lastLog, setLastLog] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [modal, setModal] = useState<null | 'transfer' | 'badge' | 'history'>(null)
  const logs = useLogs({ memberId }, 10)
  const sound = settings?.sound_enabled !== false

  const positiveRules = useMemo(() => rules.filter((r) => r.value > 0), [rules])
  const negativeRules = useMemo(() => rules.filter((r) => r.value < 0), [rules])

  if (!m) return <div className="card p-8 text-center text-muted">العضو غير موجود أو تم حذفه</div>
  const group = m.group_id ? groupsById.get(m.group_id) : null
  const color = group?.color ?? '#0F4C3A'

  const run = async (key: string, fn: () => Promise<Result>, success: string | ((r: Result) => string)) => {
    setBusy(key)
    try {
      const r = await fn()
      if (r?.log_id) setLastLog(r.log_id)
      playSuccess(sound)
      toast(typeof success === 'function' ? success(r) : success, 'success', r?.log_id ? { label: 'تراجع', onClick: () => void undo(r.log_id!) } : undefined)
      return r
    } catch (e) {
      playError(sound)
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const undo = async (logId: number) => {
    setBusy('undo')
    try {
      await rpc('undo_log', { p_log: logId })
      toast('تم التراجع عن العملية بنجاح', 'info')
      if (lastLog === logId) setLastLog(null)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const points = (delta: number, why?: string, ruleId?: string) =>
    run(`p${ruleId ?? delta}`, () => rpc<Result>('adjust_points', { p_member: m.id, p_delta: delta, p_reason: why ?? null, p_rule: ruleId ?? null }),
      `${signed(delta)} نقطة لـ ${m.name}`)

  const customPoints = async (sign: 1 | -1) => {
    const v = parseInt(custom, 10)
    if (!v || v <= 0) return toast('أدخل قيمة صحيحة', 'error')
    if (sign < 0 && !reason.trim()) return toast('اكتب سبب الخصم', 'error')
    if (v >= 100 && !(await confirm({ title: `تأكيد ${sign > 0 ? 'إضافة' : 'خصم'} ${num(v)} نقطة؟`, message: 'قيمة كبيرة — تأكد قبل المتابعة' }))) return
    const r = await points(sign * v, reason.trim() || undefined)
    if (r) {
      setCustom('')
      setReason('')
    }
  }

  const card = async (color: 'yellow' | 'red') => {
    const willConvert = color === 'yellow' && m.yellow_cards >= 1
    const ok = await confirm({
      title: color === 'yellow' ? (willConvert ? 'كرت أصفر ثانٍ = كرت أحمر' : 'إعطاء كرت أصفر') : 'إعطاء كرت أحمر',
      message: (
        <>
          لـ <b>{m.name}</b>
          {(color === 'red' || willConvert) && settings?.red_excludes && <div className="mt-2 font-medium text-red-600">سيتم إقصاء العضو تلقائياً</div>}
        </>
      ),
      confirmText: 'إعطاء الكرت',
      danger: color === 'red' || willConvert,
    })
    if (!ok) return
    await run(color, () => rpc<Result>('give_card', { p_member: m.id, p_color: color, p_reason: reason.trim() || null }), (r) =>
      r.converted ? 'تحوّل إلى كرت أحمر' + (r.excluded ? ' وتم الإقصاء' : '') : color === 'yellow' ? 'تم إعطاء كرت أصفر' : 'تم إعطاء كرت أحمر' + (r.excluded ? ' وتم الإقصاء' : ''))
  }

  const saveName = async () => {
    if (!name.trim() || name.trim() === m.name) return setEditing(false)
    const r = await run('name', () => rpc<Result>('rename_member', { p_member: m.id, p_name: name.trim() }), 'تم تعديل الاسم')
    if (r !== undefined) setEditing(false)
  }

  return (
    <div className="space-y-4">
      {/* بطاقة العضو */}
      <motion.div layout className="relative overflow-hidden rounded-3xl text-white shadow-[var(--shadow-lift)]" style={{ background: `linear-gradient(135deg, ${color}, #0B3B2D)` }}>
        <div className="islamic-pattern-dark absolute inset-0 opacity-40 mix-blend-overlay" />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void saveName()}
                    className="w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-lg font-bold text-white outline-none placeholder:text-white/50" />
                  <Button size="icon" variant="gold" loading={busy === 'name'} onClick={() => void saveName()} icon={<Check className="h-4 w-4" />} />
                  <Button size="icon" variant="white" onClick={() => setEditing(false)} icon={<X className="h-4 w-4" />} />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold">{m.name}</h2>
                  <button onClick={() => { setName(m.name); setEditing(true) }} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-white/10 hover:bg-white/20" title="تعديل الاسم">
                    <PenLine className="h-4 w-4" />
                  </button>
                  {m.is_leader && <LeaderBadge />}
                </div>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-white/75">
                <span>{group?.name ?? 'بدون مجموعة'}</span>
                <span className="tabular" dir="ltr">#{m.member_no}</span>
                <CardsIndicator yellow={m.yellow_cards} red={m.red_cards} />
                {m.excluded && <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold">مُقصى</span>}
              </div>
            </div>
            <div className="text-center">
              <motion.div key={m.points} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="tabular text-4xl font-bold text-gold-200">{num(m.points)}</motion.div>
              <div className="text-xs text-white/70">نقطة</div>
            </div>
            {onClose && (
              <button onClick={onClose} className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-white/10 hover:bg-white/20" aria-label="إغلاق">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {lastLog && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Button variant="outline" className="w-full border-rose-200 text-rose-700 hover:bg-rose-50" loading={busy === 'undo'} onClick={() => void undo(lastLog)} icon={<Undo2 className="h-4 w-4" />}>
              تراجع عن آخر عملية
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* نقاط مخصصة */}
      <div className="card p-4 sm:p-5">
        <div className="mb-3 text-sm font-semibold text-ink/80">نقاط مخصصة</div>
        <div className="flex gap-2">
          <Button variant="danger" size="icon" className="h-12 w-12" loading={busy?.startsWith('p-')} onClick={() => void customPoints(-1)} icon={<Minus className="h-5 w-5" />} />
          <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="القيمة"
            className="field h-12 flex-1 text-center text-xl font-bold tabular" />
          <Button size="icon" className="h-12 w-12" loading={busy?.startsWith('p') && !busy?.startsWith('p-')} onClick={() => void customPoints(1)} icon={<Plus className="h-5 w-5" />} />
        </div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="السبب (إلزامي عند الخصم)" className="field mt-2" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[5, 10, 15, 20, 50].map((v) => (
            <button key={v} onClick={() => setCustom(String(v))} className="tabular cursor-pointer rounded-lg bg-sand px-3 py-1 text-sm font-medium hover:bg-primary-50 hover:text-primary-700">{v}</button>
          ))}
        </div>
      </div>

      {/* من اللائحة */}
      {rules.length > 0 && (
        <div className="card p-4 sm:p-5">
          <div className="mb-3 text-sm font-semibold text-ink/80">من لائحة النقاط</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[...positiveRules, ...negativeRules].map((r) => (
              <button
                key={r.id}
                disabled={!!busy}
                onClick={() => void points(r.value, undefined, r.id)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-start text-sm transition active:scale-[0.98] disabled:opacity-50',
                  r.value > 0 ? 'border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50' : 'border-red-100 bg-red-50/40 hover:bg-red-50',
                )}
              >
                <span className="font-medium">{r.title}</span>
                <span className={cn('tabular font-bold', r.value > 0 ? 'text-emerald-700' : 'text-red-700')}>{signed(r.value)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الإجراءات */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ActionTile label="كرت أصفر" onClick={() => void card('yellow')} loading={busy === 'yellow'} icon={<span className="h-7 w-5 rounded-[4px] bg-yellow-400 shadow ring-1 ring-yellow-500/40" />} />
        <ActionTile label="كرت أحمر" onClick={() => void card('red')} loading={busy === 'red'} icon={<span className="h-7 w-5 rounded-[4px] bg-red-600 shadow ring-1 ring-red-700/40" />} />
        <ActionTile label="نقل لمجموعة" onClick={() => setModal('transfer')} icon={<ArrowLeftRight className="h-6 w-6 text-violet-600" />} />
        <ActionTile label="منح وسام" onClick={() => setModal('badge')} icon={<Award className="h-6 w-6 text-gold-500" />} />
      </div>

      <div className="card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink/80">آخر حركات العضو</span>
        </div>
        <LogList {...logs} onLoadMore={logs.loadMore} compact showMember={false} onUndo={(l) => void undo(l.id)} undoingId={null} />
      </div>

      <Modal open={modal === 'transfer'} onClose={() => setModal(null)} title="نقل العضو" subtitle={m.name}>
        <div className="grid gap-2">
          {groups.map((g) => (
            <button
              key={g.id}
              disabled={g.id === m.group_id || !!busy}
              onClick={async () => {
                const ok = await confirm({ title: `نقل ${m.name}؟`, message: <>من «{group?.name ?? '—'}» إلى «<b>{g.name}</b>» — ستنتقل نقاطه معه.</>, confirmText: 'نقل' })
                if (!ok) return
                await run('transfer', () => rpc<Result>('transfer_member', { p_member: m.id, p_group: g.id }), `تم النقل إلى ${g.name}`)
                setModal(null)
              }}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-4 text-start transition hover:border-primary-300 hover:bg-primary-50/50 disabled:cursor-default disabled:opacity-50"
            >
              <span className="h-10 w-2 rounded-full" style={{ backgroundColor: g.color }} />
              <span className="flex-1 font-semibold">{g.name}</span>
              {g.id === m.group_id && <span className="text-xs text-muted">المجموعة الحالية</span>}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={modal === 'badge'} onClose={() => setModal(null)} title="منح وسام أو إنجاز" subtitle={m.name} size="lg">
        {badges.length === 0 ? (
          <p className="py-6 text-center text-muted">لا توجد أوسمة. أضفها من صفحة الأوسمة والإنجازات.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {badges.map((b) => (
              <button
                key={b.id}
                disabled={!!busy}
                onClick={async () => {
                  await run('badge', () => rpc<Result>('award_badge', { p_member: m.id, p_badge: b.id }), `تم منح وسام «${b.name}»`)
                  setModal(null)
                }}
                className="flex cursor-pointer items-center gap-4 rounded-2xl border border-line p-4 text-start transition hover:border-gold-300 hover:bg-gold-50/60 disabled:opacity-50"
              >
                <BadgeMedal icon={b.icon} color={b.color} size={48} />
                <div className="flex-1">
                  <div className="font-semibold">{b.name}</div>
                  {b.description && <div className="text-xs text-muted">{b.description}</div>}
                </div>
                {b.points !== 0 && <span className="tabular font-bold text-gold-600">{signed(b.points)}</span>}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

function ActionTile({ label, icon, onClick, loading }: { label: string; icon: React.ReactNode; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="card flex cursor-pointer flex-col items-center justify-center gap-2 p-4 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] active:scale-[0.97] disabled:opacity-60"
    >
      <span className="grid h-10 place-items-center">{icon}</span>
      {label}
    </button>
  )
}
