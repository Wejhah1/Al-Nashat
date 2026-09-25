import { useState } from 'react'
import { PenLine, Plus, Shapes, Trash2 } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { supabase, friendlyError } from '../../lib/supabase'
import type { Group } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { LeaderBadge, PageHeader } from '../../components/ui/misc'
import { useFeedback } from '../../components/ui/Feedback'
import { num } from '../../lib/format'

export const PALETTE = ['#0F6B55', '#9B2242', '#1F5A96', '#B7791F', '#5B3F8C', '#0E7490', '#9A3412', '#3F6212', '#BE185D', '#334155']

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="label">اللون</span>
      <div className="flex flex-wrap items-center gap-2">
        {PALETTE.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} className="h-9 w-9 cursor-pointer rounded-xl transition hover:scale-110"
            style={{ backgroundColor: c, boxShadow: value.toLowerCase() === c.toLowerCase() ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : undefined }} />
        ))}
        <label className="relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-line text-xs text-muted" title="لون مخصص">
          +
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </div>
    </div>
  )
}

export default function Groups() {
  const { groupStats, groups } = useData()
  const { toast, confirm } = useFeedback()
  const [editing, setEditing] = useState<Partial<Group> | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!editing?.name?.trim()) return toast('اسم المجموعة مطلوب', 'error')
    setBusy(true)
    const payload = { name: editing.name.trim(), color: editing.color ?? PALETTE[0], sort: editing.sort ?? groups.length + 1 }
    const { error } = editing.id ? await supabase.from('groups').update(payload).eq('id', editing.id) : await supabase.from('groups').insert(payload)
    setBusy(false)
    if (error) return toast(friendlyError(error.message), 'error')
    toast('تم الحفظ')
    setEditing(null)
  }

  const remove = async (g: Group, count: number) => {
    const ok = await confirm({ title: `حذف مجموعة ${g.name}؟`, message: count ? `يوجد ${count} عضو في هذه المجموعة وسيصبحون بدون مجموعة.` : undefined, confirmText: 'حذف', danger: true })
    if (!ok) return
    const { error } = await supabase.from('groups').delete().eq('id', g.id)
    if (error) toast(friendlyError(error.message), 'error')
    else toast('تم حذف المجموعة')
  }

  return (
    <div>
      <PageHeader icon={<Shapes className="h-6 w-6" />} title="المجموعات"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ color: PALETTE[groups.length % PALETTE.length] })}>مجموعة جديدة</Button>} />
      <div className="grid gap-4 sm:grid-cols-2">
        {[...groupStats].sort((a, b) => a.sort - b.sort).map((g) => (
          <div key={g.id} className="card overflow-hidden">
            <div className="h-2" style={{ backgroundColor: g.color }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-bold" style={{ color: g.color }}>{g.name}</div>
                  <div className="mt-1 text-sm text-muted">{num(g.members.length)} عضو · الترتيب {num(g.rank)}</div>
                </div>
                <div className="tabular text-3xl font-bold">{num(g.points)}</div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                {g.leader ? <><LeaderBadge /> {g.leader.name}</> : <span className="text-muted">لم يُعيَّن قائد — عيّنه من صفحة الأعضاء</span>}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" icon={<PenLine className="h-4 w-4" />} onClick={() => setEditing(g)}>تعديل</Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={() => void remove(g, g.members.length)}>حذف</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'تعديل المجموعة' : 'مجموعة جديدة'}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button><Button loading={busy} onClick={() => void save()}>حفظ</Button></>}>
        {editing && (
          <div className="space-y-4">
            <Input label="اسم المجموعة" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
            <ColorPicker value={editing.color ?? PALETTE[0]} onChange={(c) => setEditing({ ...editing, color: c })} />
            <Input label="ترتيب العرض" type="number" value={editing.sort ?? ''} onChange={(e) => setEditing({ ...editing, sort: parseInt(e.target.value, 10) || 0 })} />
          </div>
        )}
      </Modal>
    </div>
  )
}
