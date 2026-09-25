import { useMemo, useState } from 'react'
import { BookOpenText, PenLine, Plus, Trash2 } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { supabase, friendlyError } from '../../lib/supabase'
import type { PointRule } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, PageHeader } from '../../components/ui/misc'
import { useFeedback } from '../../components/ui/Feedback'
import { cn, signed } from '../../lib/format'

export default function RulesAdmin() {
  const { rules } = useData()
  const { toast, confirm } = useFeedback()
  const [editing, setEditing] = useState<Partial<PointRule> | null>(null)
  const [kind, setKind] = useState<1 | -1>(1)
  const [busy, setBusy] = useState(false)
  const categories = useMemo(() => [...new Set(rules.map((r) => r.category))], [rules])

  const open = (r: Partial<PointRule>) => {
    setKind((r.value ?? 1) < 0 ? -1 : 1)
    setEditing({ ...r, value: r.value !== undefined ? Math.abs(r.value) : undefined })
  }

  const save = async () => {
    if (!editing?.title?.trim() || !editing.value) return toast('العنوان والقيمة مطلوبان', 'error')
    setBusy(true)
    const payload = {
      title: editing.title.trim(),
      description: editing.description?.trim() || null,
      value: kind * Math.abs(editing.value),
      category: editing.category?.trim() || (kind > 0 ? 'عام' : 'المخالفات'),
      sort: editing.sort ?? rules.length + 1,
    }
    const { error } = editing.id ? await supabase.from('point_rules').update(payload).eq('id', editing.id) : await supabase.from('point_rules').insert(payload)
    setBusy(false)
    if (error) return toast(friendlyError(error.message), 'error')
    toast('تم الحفظ')
    setEditing(null)
  }

  const remove = async (r: PointRule) => {
    if (!(await confirm({ title: `حذف «${r.title}»؟`, confirmText: 'حذف', danger: true }))) return
    const { error } = await supabase.from('point_rules').delete().eq('id', r.id)
    if (error) toast(friendlyError(error.message), 'error')
    else toast('تم الحذف')
  }

  return (
    <div>
      <PageHeader icon={<BookOpenText className="h-6 w-6" />} title="إدارة لائحة النقاط" subtitle="القواعد تظهر للطلاب في صفحة اللائحة، وللمشرفين كأزرار سريعة"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => open({})}>قاعدة جديدة</Button>} />
      <div className="card divide-y divide-line/50 overflow-hidden">
        {rules.length === 0 && <EmptyState title="لا توجد قواعد بعد" />}
        {rules.map((r) => (
          <div key={r.id} className="flex items-center gap-4 px-5 py-4">
            <span className={cn('tabular min-w-16 rounded-xl px-3 py-1.5 text-center font-bold', r.value > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>{signed(r.value)}</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{r.title}</div>
              <div className="text-sm text-muted">{r.category}{r.description ? ` · ${r.description}` : ''}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => open(r)} icon={<PenLine className="h-4 w-4" />} />
            <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50" onClick={() => void remove(r)} icon={<Trash2 className="h-4 w-4" />} />
          </div>
        ))}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'تعديل القاعدة' : 'قاعدة جديدة'}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button><Button loading={busy} onClick={() => void save()}>حفظ</Button></>}>
        {editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-sand p-1">
              <button onClick={() => setKind(1)} className={cn('cursor-pointer rounded-xl py-2.5 font-medium transition', kind > 0 ? 'bg-emerald-600 text-white shadow' : 'text-muted')}>كسب نقاط</button>
              <button onClick={() => setKind(-1)} className={cn('cursor-pointer rounded-xl py-2.5 font-medium transition', kind < 0 ? 'bg-red-600 text-white shadow' : 'text-muted')}>مخالفة / خصم</button>
            </div>
            <Input label="العنوان" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} autoFocus />
            <Textarea label="الوصف" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="min-h-16" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="القيمة" type="number" min={1} value={editing.value ?? ''} onChange={(e) => setEditing({ ...editing, value: parseInt(e.target.value, 10) || undefined })} />
              <Input label="التصنيف" list="rule-cats" value={editing.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              <datalist id="rule-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <Input label="ترتيب العرض" type="number" value={editing.sort ?? ''} onChange={(e) => setEditing({ ...editing, sort: parseInt(e.target.value, 10) || 0 })} />
          </div>
        )}
      </Modal>
    </div>
  )
}
