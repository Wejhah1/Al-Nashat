import { useState } from 'react'
import { Award, PenLine, Plus, Trash2 } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { supabase, friendlyError } from '../../lib/supabase'
import type { Badge } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { BADGE_ICONS, BadgeIcon, BadgeMedal, EmptyState, PageHeader } from '../../components/ui/misc'
import { useFeedback } from '../../components/ui/Feedback'
import { ColorPicker } from './Groups'
import { cn, num, signed } from '../../lib/format'

export default function BadgesAdmin() {
  const { badges, memberBadges } = useData()
  const { toast, confirm } = useFeedback()
  const [editing, setEditing] = useState<Partial<Badge> | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!editing?.name?.trim()) return toast('اسم الوسام مطلوب', 'error')
    setBusy(true)
    const payload = { name: editing.name.trim(), description: editing.description?.trim() || null, icon: editing.icon ?? 'award', color: editing.color ?? '#C9A24B', points: editing.points ?? 0 }
    const { error } = editing.id ? await supabase.from('badges').update(payload).eq('id', editing.id) : await supabase.from('badges').insert(payload)
    setBusy(false)
    if (error) return toast(friendlyError(error.message), 'error')
    toast('تم الحفظ')
    setEditing(null)
  }

  const remove = async (b: Badge) => {
    const count = memberBadges.filter((x) => x.badge_id === b.id).length
    if (!(await confirm({ title: `حذف وسام «${b.name}»؟`, message: count ? `مُنح لـ ${count} عضو وسيُزال من ملفاتهم (النقاط الممنوحة تبقى).` : undefined, confirmText: 'حذف', danger: true }))) return
    const { error } = await supabase.from('badges').delete().eq('id', b.id)
    if (error) toast(friendlyError(error.message), 'error')
    else toast('تم الحذف')
  }

  return (
    <div>
      <PageHeader icon={<Award className="h-6 w-6" />} title="الأوسمة والإنجازات"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ icon: 'award', color: '#C9A24B', points: 10 })}>وسام جديد</Button>} />
      {badges.length === 0 ? <div className="card"><EmptyState icon={<Award className="h-7 w-7" />} title="لا توجد أوسمة بعد" /></div> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((b) => (
            <div key={b.id} className="card flex flex-col items-center p-6 text-center">
              <BadgeMedal icon={b.icon} color={b.color} size={64} />
              <div className="mt-4 text-lg font-bold">{b.name}</div>
              {b.description && <p className="mt-1 text-sm text-muted">{b.description}</p>}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="tabular rounded-full bg-gold-50 px-3 py-1 font-bold text-gold-600">{signed(b.points)} نقطة</span>
                <span className="text-muted">مُنح {num(memberBadges.filter((x) => x.badge_id === b.id).length)} مرة</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" icon={<PenLine className="h-4 w-4" />} onClick={() => setEditing(b)}>تعديل</Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={() => void remove(b)}>حذف</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'تعديل الوسام' : 'وسام جديد'} size="lg"
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button><Button loading={busy} onClick={() => void save()}>حفظ</Button></>}>
        {editing && (
          <div className="grid gap-6 sm:grid-cols-[1fr_180px]">
            <div className="space-y-4">
              <Input label="اسم الوسام / الإنجاز" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
              <Textarea label="الوصف" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="min-h-16" />
              <Input label="النقاط المضافة عند المنح" type="number" value={editing.points ?? 0} onChange={(e) => setEditing({ ...editing, points: parseInt(e.target.value, 10) || 0 })} />
              <ColorPicker value={editing.color ?? '#C9A24B'} onChange={(c) => setEditing({ ...editing, color: c })} />
              <div>
                <span className="label">الأيقونة</span>
                <div className="grid grid-cols-7 gap-2 sm:grid-cols-10">
                  {Object.keys(BADGE_ICONS).map((k) => (
                    <button key={k} type="button" onClick={() => setEditing({ ...editing, icon: k })}
                      className={cn('grid h-10 cursor-pointer place-items-center rounded-xl border transition', editing.icon === k ? 'border-gold-400 bg-gold-50 text-gold-600' : 'border-line text-muted hover:bg-sand')}>
                      <BadgeIcon icon={k} className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-gold-50 to-white p-6 text-center">
              <BadgeMedal icon={editing.icon ?? 'award'} color={editing.color ?? '#C9A24B'} size={80} />
              <div className="mt-4 font-bold">{editing.name || 'اسم الوسام'}</div>
              <div className="tabular mt-1 text-sm font-bold text-gold-600">{signed(editing.points ?? 0)}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
