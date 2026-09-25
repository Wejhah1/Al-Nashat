import { useEffect, useState } from 'react'
import { KeyRound, Plus, Save, Settings as SettingsIcon, ShieldCheck, Trash2, UserCog } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { supabase, friendlyError } from '../../lib/supabase'
import type { Admin, Settings } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Input, Select, Toggle } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/misc'
import { useFeedback } from '../../components/ui/Feedback'

async function adminUsers(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    let msg = error.message
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx) msg = ((await ctx.json()) as { error?: string }).error ?? msg
    } catch {
      /* تجاهل */
    }
    throw new Error(msg)
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
  return data
}

export default function SettingsPage() {
  const { settings } = useData()
  const { toast } = useFeedback()
  const [f, setF] = useState<Settings | null>(settings)
  const [busy, setBusy] = useState(false)
  useEffect(() => setF(settings), [settings])
  if (!f) return null
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF({ ...f, [k]: v })

  const save = async () => {
    setBusy(true)
    const { id, ...rest } = f
    const { error } = await supabase.from('settings').update({ ...rest, late_after: rest.late_after || null, updated_at: new Date().toISOString() }).eq('id', id)
    setBusy(false)
    if (error) toast(friendlyError(error.message), 'error')
    else toast('تم حفظ الإعدادات')
  }

  return (
    <div>
      <PageHeader icon={<SettingsIcon className="h-6 w-6" />} title="الإعدادات"
        actions={<Button loading={busy} icon={<Save className="h-4 w-4" />} onClick={() => void save()}>حفظ الإعدادات</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 font-bold">التحضير</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="نقاط التحضير" type="number" value={f.attendance_points} onChange={(e) => set('attendance_points', parseInt(e.target.value, 10) || 0)} />
            <Input label="نقاط الحضور المتأخر" type="number" value={f.late_points} onChange={(e) => set('late_points', parseInt(e.target.value, 10) || 0)} />
          </div>
          <div className="mt-4">
            <Input label="وقت احتساب التأخر" hint="اتركه فارغاً لتعطيل التأخر التلقائي" type="time" value={f.late_after?.slice(0, 5) ?? ''} onChange={(e) => set('late_after', e.target.value || null)} />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-bold">الكروت والإقصاء</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="خصم الكرت الأصفر" type="number" min={0} value={f.yellow_penalty} onChange={(e) => set('yellow_penalty', Math.abs(parseInt(e.target.value, 10) || 0))} />
            <Input label="خصم الكرت الأحمر" type="number" min={0} value={f.red_penalty} onChange={(e) => set('red_penalty', Math.abs(parseInt(e.target.value, 10) || 0))} />
          </div>
          <div className="mt-3 rounded-2xl border border-line">
            <Toggle checked={f.red_excludes} onChange={(v) => set('red_excludes', v)} label="الإقصاء التلقائي بالكرت الأحمر" description="كرتان أصفران يتحولان دائماً إلى أحمر" />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-bold">العرض</h2>
          <div className="rounded-2xl border border-line">
            <Toggle checked={f.freeze_results} onChange={(v) => set('freeze_results', v)} label="تجميد النتائج" description="إخفاء النقاط والترتيب عن الزوار قبل الحفل الختامي" />
            <Toggle checked={f.show_live_feed} onChange={(v) => set('show_live_feed', v)} label="شريط الأحداث الحية" description="إظهار آخر الأحداث في المتصدرين والرئيسية" />
            <Toggle checked={f.sound_enabled} onChange={(v) => set('sound_enabled', v)} label="الأصوات" description="نغمات النجاح والخطأ عند المسح (الاهتزاز يعمل دائماً)" />
          </div>
        </section>

        <AdminsSection />
      </div>
    </div>
  )
}

function AdminsSection() {
  const { admin: me } = useAuth()
  const { toast, confirm } = useFeedback()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [form, setForm] = useState<null | { user_id?: string; username: string; display_name: string; password: string; role: 'owner' | 'supervisor' }>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('admins').select('*').order('created_at')
    setAdmins((data as Admin[]) ?? [])
  }
  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!form) return
    setBusy(true)
    try {
      if (form.user_id) {
        await adminUsers({ action: 'update', user_id: form.user_id, display_name: form.display_name, role: form.role, password: form.password || undefined })
      } else {
        await adminUsers({ action: 'create', ...form })
      }
      toast('تم الحفظ')
      setForm(null)
      void load()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (a: Admin) => {
    if (!(await confirm({ title: `حذف حساب ${a.display_name}؟`, danger: true, confirmText: 'حذف' }))) return
    try {
      await adminUsers({ action: 'delete', user_id: a.user_id })
      toast('تم حذف الحساب')
      void load()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <section className="card p-6 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold"><UserCog className="h-5 w-5 text-primary-600" />حسابات المشرفين</h2>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ username: '', display_name: '', password: '', role: 'supervisor' })}>مشرف جديد</Button>
      </div>
      <div className="divide-y divide-line/50">
        {admins.map((a) => (
          <div key={a.user_id} className="flex items-center gap-3 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 font-bold text-white">{a.display_name[0]}</span>
            <div className="flex-1">
              <div className="font-semibold">{a.display_name} {a.user_id === me?.user_id && <span className="text-xs font-normal text-muted">(أنت)</span>}</div>
              <div className="text-xs text-muted" dir="ltr">{a.username}</div>
            </div>
            <span className={a.role === 'owner' ? 'inline-flex items-center gap-1 rounded-full bg-gold-50 px-2.5 py-1 text-xs font-semibold text-gold-600' : 'rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700'}>
              {a.role === 'owner' ? <><ShieldCheck className="h-3.5 w-3.5" />مدير عام</> : 'مشرف'}
            </span>
            <Button variant="ghost" size="icon" title="تعديل / كلمة المرور" onClick={() => setForm({ user_id: a.user_id, username: a.username, display_name: a.display_name, password: '', role: a.role })} icon={<KeyRound className="h-4 w-4" />} />
            {a.user_id !== me?.user_id && <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50" onClick={() => void remove(a)} icon={<Trash2 className="h-4 w-4" />} />}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">المشرف: التحضير والنقاط والكروت والأوسمة والتراجع والتقارير. المدير العام: كل الصلاحيات.</p>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.user_id ? 'تعديل الحساب' : 'مشرف جديد'}
        footer={<><Button variant="outline" onClick={() => setForm(null)}>إلغاء</Button><Button loading={busy} onClick={() => void save()}>حفظ</Button></>}>
        {form && (
          <div className="space-y-4">
            <Input label="الاسم الظاهر" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="أ. محمد" />
            <Input label="اسم المستخدم" hint="أحرف إنجليزية وأرقام" value={form.username} disabled={!!form.user_id} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} dir="ltr" />
            <Input label={form.user_id ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'} hint="8 أحرف على الأقل" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" />
            <Select label="الصلاحية" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'owner' | 'supervisor' })}>
              <option value="supervisor">مشرف</option>
              <option value="owner">مدير عام</option>
            </Select>
          </div>
        )}
      </Modal>
    </section>
  )
}
