import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, CalendarRange, FileDown, FileSpreadsheet, Printer } from 'lucide-react'
import { rpc, mediaUrl } from '../../lib/supabase'
import { useData } from '../../context/DataContext'
import type { ReportData } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/misc'
import { useFeedback } from '../../components/ui/Feedback'
import { exportTable } from '../../lib/excel'
import { cn, num, signed } from '../../lib/format'
import { addDaysISO, formatHijri, formatHijriShort, formatWeekday, todayISO } from '../../lib/hijri'

// لوحة ألوان مُتحقق منها (تباين + عمى الألوان)
const PRESENT = '#0f8f72'
const LATE = '#b9770e'

export default function Reports() {
  const { toast } = useFeedback()
  const { seasons } = useData()
  const [from, setFrom] = useState(addDaysISO(todayISO(), -6))
  const [to, setTo] = useState(todayISO())
  const [data, setData] = useState<ReportData | null>(null)
  const [busy, setBusy] = useState(false)

  const presets: [string, () => void][] = [
    ['اليوم', () => { setFrom(todayISO()); setTo(todayISO()) }],
    ['آخر 7 أيام', () => { setFrom(addDaysISO(todayISO(), -6)); setTo(todayISO()) }],
    ['آخر 30 يوماً', () => { setFrom(addDaysISO(todayISO(), -29)); setTo(todayISO()) }],
    ...seasons.map((sn): [string, () => void] => [sn.name, () => { setFrom(sn.start_date); setTo(sn.end_date < todayISO() ? sn.end_date : todayISO()) }]),
  ]

  const generate = async () => {
    if (from > to) return toast('تاريخ البداية بعد تاريخ النهاية', 'error')
    setBusy(true)
    try {
      setData(await rpc<ReportData>('report', { p_from: from, p_to: to }))
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const exportXlsx = () => {
    if (!data) return
    void exportTable(
      `تقرير-${from}-${to}.xlsx`,
      'التقرير',
      ['رقم العضوية', 'الاسم', 'المجموعة', 'حضور', 'تأخر', 'غياب', 'نقاط الفترة', 'إجمالي النقاط', 'الكروت', 'ملاحظات'],
      data.members.map((m) => [m.member_no, m.name, m.group_name ?? '', m.present, m.late, m.absent, m.period_points, m.points,
        [m.yellow_cards ? `${m.yellow_cards} أصفر` : '', m.red_cards ? `${m.red_cards} أحمر` : ''].filter(Boolean).join(' / '), m.notes ?? '']),
    )
  }

  return (
    <div>
      <style>{`@media print { @page { size: A4 portrait; margin: 12mm 10mm; } }`}</style>
      <div className="no-print">
        <PageHeader icon={<BarChart3 className="h-6 w-6" />} title="التقارير والإحصائيات" />
        <div className="card mb-6 p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {presets.map(([l, fn]) => (
              <button key={l} onClick={fn} className="cursor-pointer rounded-full border border-line bg-white px-4 py-1.5 text-sm hover:border-primary-300 hover:bg-primary-50">{l}</button>
            ))}
          </div>
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <Input label="من تاريخ" hint={formatHijri(from)} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="إلى تاريخ" hint={formatHijri(to)} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button className="h-[46px]" loading={busy} icon={<CalendarRange className="h-4 w-4" />} onClick={() => void generate()}>إنشاء التقرير</Button>
          </div>
        </div>
        {data && (
          <div className="mb-6 flex flex-wrap justify-end gap-2">
            <Button variant="outline" icon={<FileSpreadsheet className="h-4 w-4" />} onClick={exportXlsx}>تصدير Excel</Button>
            <Button variant="outline" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>طباعة</Button>
            <Button icon={<FileDown className="h-4 w-4" />} onClick={() => window.print()}>حفظ PDF</Button>
          </div>
        )}
      </div>

      {data && <ReportDocument data={data} />}
    </div>
  )
}

function ReportDocument({ data }: { data: ReportData }) {
  const t = data.totals
  const totalSlots = data.members.reduce((s, m) => s + m.present + m.late + m.absent, 0)
  const rate = totalSlots ? Math.round((data.members.reduce((s, m) => s + m.present + m.late, 0) / totalSlots) * 100) : 0
  const days = data.session_days.map((d) => ({ ...d, label: formatHijriShort(d.date) }))

  return (
    <article className="mx-auto max-w-[210mm] rounded-3xl bg-white p-8 shadow-[var(--shadow-lift)] print:max-w-none print:rounded-none print:p-0 print:shadow-none sm:p-10">
      {/* الترويسة */}
      <header className="islamic-pattern-dark -mx-8 -mt-8 mb-8 rounded-t-3xl px-8 py-8 text-white print:mx-0 print:mt-0 print:rounded-2xl sm:-mx-10 sm:-mt-10 sm:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="font-display text-3xl font-bold text-gold-200">النشاط الثقافي</div>
            <div className="mt-1 text-sm tracking-[0.2em] text-gold-100/80">1448 هـ</div>
          </div>
          <div className="text-left">
            <div className="text-lg font-semibold">تقرير الفترة</div>
            <div className="text-sm text-white/75">من {formatHijri(data.from)}</div>
            <div className="text-sm text-white/75">إلى {formatHijri(data.to)}</div>
          </div>
        </div>
      </header>

      {/* الإحصائيات */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
        {[
          ['أيام النشاط', num(data.sessions), '#0F4C3A'],
          ['نسبة الحضور', `${rate}%`, PRESENT],
          ['النقاط المكتسبة', num(t.points_awarded), '#8e6a2b'],
          ['النقاط المخصومة', num(t.points_deducted), '#B42335'],
          ['عدد الأعضاء', num(t.members), '#0F4C3A'],
          ['الأوسمة الممنوحة', num(t.badges), '#8e6a2b'],
          ['الكروت الصفراء', num(t.yellow_cards), '#8a6a00'],
          ['الكروت الحمراء', num(t.red_cards), '#B42335'],
        ].map(([l, v, c]) => (
          <div key={l} className="rounded-2xl border border-line/80 bg-ivory/60 p-4 text-center" style={{ breakInside: 'avoid' }}>
            <div className="text-xs text-muted">{l}</div>
            <div className="tabular mt-1 text-2xl font-bold" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </section>

      {/* المجموعات */}
      <section className="mt-8" style={{ breakInside: 'avoid' }}>
        <SectionTitle>ترتيب المجموعات</SectionTitle>
        <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted"><tr className="border-b border-line"><th className="py-2 text-right">المجموعة</th><th className="py-2">الأعضاء</th><th className="py-2">نقاط الفترة</th><th className="py-2">الإجمالي</th></tr></thead>
            <tbody>
              {data.groups.map((g, i) => (
                <tr key={g.id} className="border-b border-line/50">
                  <td className="py-2.5"><span className="inline-flex items-center gap-2 font-medium"><span className="tabular text-muted">{i + 1}.</span><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />{g.name}</span></td>
                  <td className="tabular py-2.5 text-center">{num(g.members_count)}</td>
                  <td className="tabular py-2.5 text-center">{signed(g.period_points)}</td>
                  <td className="tabular py-2.5 text-center font-bold">{num(g.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="h-52" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.groups} margin={{ top: 16, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#efe8d8" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5f6b76', fontFamily: 'Readex Pro' }} axisLine={false} tickLine={false} reversed />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'rgba(15,76,58,0.05)' }} formatter={(v) => [num(Number(v)), 'نقاط الفترة']} contentStyle={{ borderRadius: 12, fontFamily: 'Readex Pro', direction: 'rtl' }} />
                <Bar dataKey="period_points" radius={[4, 4, 0, 0]} isAnimationActive={false} label={{ position: 'top', fontSize: 12, fill: '#16202b', fontFamily: 'Readex Pro' }}>
                  {data.groups.map((g) => <Cell key={g.id} fill={g.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* الحضور اليومي */}
      {days.length > 0 && (
        <section className="mt-8" style={{ breakInside: 'avoid' }}>
          <SectionTitle>الحضور في أيام النشاط</SectionTitle>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#efe8d8" />
                <XAxis dataKey="label" reversed tick={{ fontSize: 11, fill: '#5f6b76', fontFamily: 'Readex Pro' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5f6b76' }} axisLine={false} tickLine={false} orientation="right" />
                <Tooltip cursor={{ fill: 'rgba(15,76,58,0.05)' }} contentStyle={{ borderRadius: 12, fontFamily: 'Readex Pro', direction: 'rtl' }} />
                <Legend wrapperStyle={{ fontFamily: 'Readex Pro', fontSize: 12 }} />
                <Bar dataKey="present" name="حاضر" stackId="a" fill={PRESENT} stroke="#fff" strokeWidth={2} isAnimationActive={false} />
                <Bar dataKey="late" name="متأخر" stackId="a" fill={LATE} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {data.holidays.length > 0 && (
        <section className="mt-8" style={{ breakInside: 'avoid' }}>
          <SectionTitle>الإجازات خلال الفترة</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {data.holidays.map((h) => (
              <span key={h.name + h.start} className="rounded-xl border border-line bg-ivory/60 px-3 py-2 text-sm">
                <b>{h.name}</b> <span className="text-muted">· {h.start === h.end ? formatHijri(h.start) : `${formatHijriShort(h.start)} — ${formatHijri(h.end)}`}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* الفعاليات */}
      {data.posts.length > 0 && (
        <section className="mt-8">
          <SectionTitle>الفعاليات والأخبار خلال الفترة</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
            {data.posts.map((p) => {
              const img = mediaUrl(p.image_path)
              return (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-line" style={{ breakInside: 'avoid' }}>
                  {img && <img src={img} alt="" className="aspect-[16/9] w-full object-cover" />}
                  <div className="p-4">
                    <div className="text-xs font-medium text-gold-600">{p.category ? `${p.category} · ` : ''}{formatWeekday(p.event_date)} {formatHijri(p.event_date)}</div>
                    <div className="mt-1 font-bold">{p.title}</div>
                    {p.body && <p className="mt-1 line-clamp-3 text-sm text-muted">{p.body}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* قائمة الطلاب */}
      <section className="mt-8">
        <SectionTitle>قائمة الطلاب</SectionTitle>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-primary-700 text-white print:bg-primary-700">
              {['#', 'الاسم', 'المجموعة', 'حضور', 'تأخر', 'غياب', 'نقاط الفترة', 'الإجمالي', 'ملاحظات'].map((h, i) => (
                <th key={h} className={cn('px-2 py-2 font-medium', i <= 2 || i === 8 ? 'text-right' : 'text-center', i === 0 && 'rounded-tr-lg', i === 8 && 'rounded-tl-lg')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.members.map((m, i) => (
              <tr key={m.id} className={cn('border-b border-line/60', i % 2 === 1 && 'bg-ivory/70')} style={{ breakInside: 'avoid' }}>
                <td className="tabular px-2 py-1.5 text-muted">{m.member_no}</td>
                <td className="px-2 py-1.5 font-medium">{m.name}{m.excluded && <span className="mr-1 text-[11px] text-red-600">(مُقصى)</span>}</td>
                <td className="px-2 py-1.5"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.group_color ?? '#ccc' }} />{m.group_name ?? '—'}</span></td>
                <td className="tabular px-2 py-1.5 text-center text-emerald-700">{m.present}</td>
                <td className="tabular px-2 py-1.5 text-center text-amber-700">{m.late}</td>
                <td className="tabular px-2 py-1.5 text-center text-red-700">{m.absent}</td>
                <td className="tabular px-2 py-1.5 text-center">{signed(m.period_points)}</td>
                <td className="tabular px-2 py-1.5 text-center font-bold">{num(m.points)}</td>
                <td className="px-2 py-1.5 text-xs text-muted">{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-10 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
        <span>النشاط الثقافي — 1448 هـ</span>
        <span>أُنشئ في {formatHijri(new Date())}</span>
      </footer>
    </article>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-primary-800" style={{ breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
      <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-gold-300 to-gold-500" />
      {children}
      <span className="gold-divider flex-1" />
    </h2>
  )
}
