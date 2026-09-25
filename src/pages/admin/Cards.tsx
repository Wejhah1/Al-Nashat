import { useMemo, useState } from 'react'
import { CheckSquare, CreditCard, Printer, Square } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { MemberIdCard } from '../../components/shared/MemberIdCard'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/misc'
import { cn, num } from '../../lib/format'

const PER_PAGE = 8

export default function Cards() {
  const { members, groups } = useData()
  const [groupId, setGroupId] = useState('')
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [q, setQ] = useState('')

  const pool = useMemo(() => members.filter((m) => !groupId || m.group_id === groupId).sort((a, b) => a.member_no - b.member_no), [members, groupId])
  const selected = picked ? pool.filter((m) => picked.has(m.id)) : pool
  const pages: (typeof selected)[] = []
  for (let i = 0; i < selected.length; i += PER_PAGE) pages.push(selected.slice(i, i + PER_PAGE))

  const toggle = (id: string) => {
    const s = new Set(picked ?? pool.map((m) => m.id))
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setPicked(s)
  }

  return (
    <div>
      <style>{`@media print { @page { size: A4 portrait; margin: 0; } }`}</style>
      <div className="no-print">
        <PageHeader icon={<CreditCard className="h-6 w-6" />} title="طباعة البطاقات" subtitle="A4 طولي · 8 بطاقات في الصفحة"
          actions={<Button icon={<Printer className="h-4 w-4" />} disabled={!selected.length} onClick={() => void document.fonts.ready.then(() => window.print())}>طباعة {num(selected.length)} بطاقة</Button>} />
        <div className="mb-6 grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="card space-y-3 p-4">
            <Select value={groupId} onChange={(e) => { setGroupId(e.target.value); setPicked(null) }}>
              <option value="">كل المجموعات</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث…" className="field" />
            <div className="flex gap-2 text-xs">
              <button className="cursor-pointer text-primary-700 hover:underline" onClick={() => setPicked(null)}>تحديد الكل</button>
              <span className="text-line">|</span>
              <button className="cursor-pointer text-primary-700 hover:underline" onClick={() => setPicked(new Set())}>إلغاء التحديد</button>
            </div>
            <ul className="scrollbar-thin max-h-80 space-y-0.5 overflow-y-auto">
              {pool.filter((m) => !q || m.name.includes(q)).map((m) => {
                const on = !picked || picked.has(m.id)
                return (
                  <li key={m.id}>
                    <button onClick={() => toggle(m.id)} className={cn('flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-primary-50', !on && 'text-muted')}>
                      {on ? <CheckSquare className="h-4 w-4 text-primary-600" /> : <Square className="h-4 w-4" />}
                      <span className="flex-1 truncate">{m.name}</span>
                      <span className="tabular text-xs text-muted">{m.member_no}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="card flex items-center justify-center p-4 text-sm text-muted">
            {num(selected.length)} بطاقة في {num(pages.length)} صفحة · المعاينة أدناه مطابقة للطباعة
          </div>
        </div>
      </div>

      <div className="print-area space-y-8 overflow-x-auto print:space-y-0">
        {pages.map((pg, i) => (
          <div key={i} className="mx-auto bg-white shadow-[var(--shadow-lift)] print:shadow-none"
            style={{ width: '210mm', height: '297mm', padding: '11.5mm 12mm', breakAfter: i < pages.length - 1 ? 'page' : 'auto', pageBreakAfter: i < pages.length - 1 ? 'always' : 'auto', boxSizing: 'border-box' }}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 90mm)', gridAutoRows: '64mm', gap: '6mm' }}>
              {pg.map((m) => <MemberIdCard key={m.id} name={m.name} code={m.code} memberNo={m.member_no} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
