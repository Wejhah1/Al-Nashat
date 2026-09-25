import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Download, FileSpreadsheet, FileUp, MoreVertical, PenLine, Plus, Search, Trash2, Upload, Users, Zap } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useTable } from '../../hooks/useTable'
import { supabase, rpc, friendlyError } from '../../lib/supabase'
import type { Member, MemberPrivate } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea, Toggle } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { CardsIndicator, EmptyState, LeaderBadge, PageHeader } from '../../components/ui/misc'
import { useFeedback } from '../../components/ui/Feedback'
import { MemberPanel } from '../../components/admin/MemberPanel'
import { downloadNewMembersTemplate, downloadUpdateTemplate, isYes, readSheet } from '../../lib/excel'
import { cn, num } from '../../lib/format'

interface FormState {
  name: string
  group_id: string
  phone: string
  notes: string
  is_leader: boolean
  excluded: boolean
}

export default function Members() {
  const { members, groups, groupsById } = useData()
  const privRows = useTable<MemberPrivate & Record<string, unknown>>('member_private', { key: 'member_id' })
  const privates = useMemo(() => new Map(privRows.rows.map((p) => [p.member_id, p])), [privRows.rows])
  const { toast, confirm } = useFeedback()
  const [q, setQ] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [editing, setEditing] = useState<Member | 'new' | null>(null)
  const [panel, setPanel] = useState<string | null>(null)
  const [excelOpen, setExcelOpen] = useState(false)

  const list = useMemo(() => {
    const s = q.trim()
    return members
      .filter((m) => (!groupFilter || m.group_id === groupFilter) && (!s || m.name.includes(s) || String(m.member_no).includes(s) || privates.get(m.id)?.phone?.includes(s)))
      .sort((a, b) => a.member_no - b.member_no)
  }, [members, q, groupFilter, privates])

  const remove = async (m: Member) => {
    const ok = await confirm({ title: `حذف ${m.name}؟`, message: 'سيُحذف العضو نهائياً مع حضوره وأوسمته. سجل الأحداث يبقى محفوظاً.', confirmText: 'حذف نهائي', danger: true })
    if (!ok) return
    const { error } = await supabase.from('members').delete().eq('id', m.id)
    if (error) toast(friendlyError(error.message), 'error')
    else toast('تم حذف العضو')
  }

  return (
    <div>
      <PageHeader
        icon={<Users className="h-6 w-6" />}
        title="الأعضاء"
        subtitle={`${num(members.length)} عضو مسجل في ${num(groups.length)} مجموعات`}
        actions={
          <>
            <Button variant="outline" icon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => setExcelOpen(true)}>Excel</Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>عضو جديد</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الرقم أو الجوال" className="field pr-11" />
        </div>
        <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="sm:w-52">
          <option value="">كل المجموعات</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
      </div>

      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon={<Users className="h-7 w-7" />} title="لا يوجد أعضاء">أضف عضواً جديداً أو استورد قائمة من Excel</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-sand/70 text-right text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">الرقم</th>
                  <th className="px-4 py-3 font-medium">الاسم</th>
                  <th className="px-4 py-3 font-medium">المجموعة</th>
                  <th className="px-4 py-3 font-medium">الجوال</th>
                  <th className="px-4 py-3 font-medium">النقاط</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {list.map((m) => {
                  const g = m.group_id ? groupsById.get(m.group_id) : null
                  return (
                    <tr key={m.id} className={cn('transition hover:bg-primary-50/40', m.excluded && 'bg-red-50/30')}>
                      <td className="tabular px-4 py-3 text-muted" dir="ltr">{m.member_no}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setPanel(m.id)} className="flex cursor-pointer items-center gap-2 font-medium hover:text-primary-700">
                          {m.name}
                          {m.is_leader && <LeaderBadge />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {g ? <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />{g.name}</span> : <span className="text-muted">—</span>}
                      </td>
                      <td className="tabular px-4 py-3 text-muted" dir="ltr">{privates.get(m.id)?.phone ?? '—'}</td>
                      <td className="tabular px-4 py-3 font-bold text-primary-700">{num(m.points)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CardsIndicator yellow={m.yellow_cards} red={m.red_cards} />
                          {m.excluded ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">مُقصى</span> : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">نشط</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-9 w-9" title="إجراءات سريعة" onClick={() => setPanel(m.id)} icon={<Zap className="h-4 w-4" />} />
                          <Button variant="ghost" size="icon" className="h-9 w-9" title="تعديل" onClick={() => setEditing(m)} icon={<PenLine className="h-4 w-4" />} />
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-red-600 hover:bg-red-50 hover:text-red-700" title="حذف" onClick={() => void remove(m)} icon={<Trash2 className="h-4 w-4" />} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <MemberForm member={editing === 'new' ? null : editing} priv={editing !== 'new' ? privates.get(editing.id) : undefined} onClose={() => setEditing(null)} />}
      <Modal open={!!panel} onClose={() => setPanel(null)} size="lg" title="الإجراءات السريعة">
        {panel && <MemberPanel memberId={panel} />}
      </Modal>
      <ExcelModal open={excelOpen} onClose={() => setExcelOpen(false)} privates={privates} />
    </div>
  )
}

function MemberForm({ member, priv, onClose }: { member: Member | null; priv?: MemberPrivate; onClose: () => void }) {
  const { groups } = useData()
  const { toast } = useFeedback()
  const [f, setF] = useState<FormState>({
    name: member?.name ?? '',
    group_id: member?.group_id ?? groups[0]?.id ?? '',
    phone: priv?.phone ?? '',
    notes: priv?.notes ?? '',
    is_leader: member?.is_leader ?? false,
    excluded: member?.excluded ?? false,
  })
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }))

  const save = async () => {
    if (!f.name.trim()) return toast('الاسم مطلوب', 'error')
    setBusy(true)
    try {
      let id = member?.id
      if (!member) {
        const { data, error } = await supabase.from('members').insert({ name: f.name.trim(), group_id: f.group_id || null }).select('id').single()
        if (error) throw error
        id = (data as { id: string }).id
      } else {
        if (f.name.trim() !== member.name) await rpc('rename_member', { p_member: id, p_name: f.name.trim() })
        if (f.group_id && f.group_id !== member.group_id) await rpc('transfer_member', { p_member: id, p_group: f.group_id })
        if (f.excluded !== member.excluded) await rpc('set_excluded', { p_member: id, p_excluded: f.excluded })
      }
      if (!member || f.is_leader !== member.is_leader || (f.is_leader && f.group_id !== member.group_id)) {
        if (f.is_leader || member) await rpc('set_leader', { p_member: id, p_value: f.is_leader })
      }
      if (f.phone.trim() || f.notes.trim() || priv) {
        const { error } = await supabase.from('member_private').upsert({ member_id: id, phone: f.phone.trim() || null, notes: f.notes.trim() || null })
        if (error) throw error
      }
      toast(member ? 'تم حفظ التعديلات' : 'تمت إضافة العضو')
      onClose()
    } catch (e) {
      toast(friendlyError((e as Error).message), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={member ? 'تعديل عضو' : 'عضو جديد'} subtitle={member ? `رقم العضوية ${member.member_no}` : 'سيُولَّد رقم العضوية والباركود تلقائياً'}
      footer={<><Button variant="outline" onClick={onClose}>إلغاء</Button><Button loading={busy} onClick={() => void save()}>حفظ</Button></>}>
      <div className="space-y-4">
        <Input label="الاسم الكامل" value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        <Select label="المجموعة" value={f.group_id} onChange={(e) => set('group_id', e.target.value)}>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
        <Input label="رقم الجوال" hint="يُستخدم لدخول بوابة الطالب" value={f.phone} onChange={(e) => set('phone', e.target.value)} dir="ltr" inputMode="tel" placeholder="05xxxxxxxx" />
        <Textarea label="ملاحظات (لا تظهر للعامة)" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        <div className="rounded-2xl border border-line">
          <Toggle checked={f.is_leader} onChange={(v) => set('is_leader', v)} label="قائد المجموعة" description="يلغي قيادة القائد الحالي تلقائياً" />
          {member && <Toggle checked={f.excluded} onChange={(v) => set('excluded', v)} label="مُقصى" description="الإقصاء يمنع التحضير ويُخفي العضو من الترتيب" />}
        </div>
      </div>
    </Modal>
  )
}

interface Change {
  member_no: number
  name: string
  changes: string[]
  row: Record<string, unknown>
}

function ExcelModal({ open, onClose, privates }: { open: boolean; onClose: () => void; privates: Map<string, MemberPrivate> }) {
  const { members, groups, groupsById } = useData()
  const { toast } = useFeedback()
  const newRef = useRef<HTMLInputElement>(null)
  const updRef = useRef<HTMLInputElement>(null)
  const [newRows, setNewRows] = useState<Record<string, unknown>[] | null>(null)
  const [changes, setChanges] = useState<Change[] | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) {
      setNewRows(null)
      setChanges(null)
    }
  }, [open])

  const groupNames = new Set(groups.map((g) => g.name))

  const parseNew = async (file: File) => {
    try {
      const rows = await readSheet(file)
      const out = rows
        .map((r) => ({ name: r['الاسم']?.trim(), group: r['المجموعة']?.trim(), phone: r['الجوال']?.trim(), is_leader: isYes(r['قائد']), notes: r['ملاحظات']?.trim() }))
        .filter((r) => r.name)
      if (!out.length) return toast('لم يتم العثور على أسماء في الملف. استخدم القالب المرفق.', 'error')
      setNewRows(out)
    } catch {
      toast('تعذر قراءة الملف', 'error')
    }
  }

  const parseUpdate = async (file: File) => {
    try {
      const rows = await readSheet(file)
      const byNo = new Map(members.map((m) => [m.member_no, m]))
      const out: Change[] = []
      for (const r of rows) {
        const no = parseInt(r['رقم العضوية'], 10)
        const m = byNo.get(no)
        if (!m) continue
        const p = privates.get(m.id)
        const row: Record<string, unknown> = { member_no: no }
        const c: string[] = []
        const name = r['الاسم']?.trim()
        if (name && name !== m.name) { row.name = name; c.push(`الاسم: ${m.name} ← ${name}`) }
        const gname = r['المجموعة']?.trim()
        const cur = m.group_id ? groupsById.get(m.group_id)?.name : ''
        if (gname && gname !== cur && groupNames.has(gname)) { row.group = gname; c.push(`المجموعة: ${cur || '—'} ← ${gname}`) }
        const phone = (r['الجوال'] ?? '').trim()
        if (phone !== (p?.phone ?? '') && phone.replace(/\D/g, '').slice(-9) !== (p?.phone ?? '').replace(/\D/g, '').slice(-9)) { row.phone = phone; c.push(`الجوال: ${p?.phone || '—'} ← ${phone || '—'}`) }
        const notes = (r['ملاحظات'] ?? '').trim()
        if (notes !== (p?.notes ?? '')) { row.notes = notes; if (!('phone' in row)) row.phone = p?.phone ?? ''; c.push('الملاحظات') }
        if ('phone' in row && !('notes' in row)) row.notes = p?.notes ?? ''
        const leader = isYes(r['قائد'])
        if (r['قائد'] !== undefined && leader !== m.is_leader) { row.is_leader = leader; c.push(leader ? 'تعيين قائداً' : 'إلغاء القيادة') }
        if (c.length) out.push({ member_no: no, name: m.name, changes: c, row })
      }
      setChanges(out)
    } catch {
      toast('تعذر قراءة الملف', 'error')
    }
  }

  const applyNew = async () => {
    if (!newRows) return
    setBusy(true)
    try {
      const n = await rpc<number>('import_members', { p_rows: newRows })
      toast(`تمت إضافة ${num(n)} عضو بنجاح`)
      onClose()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const applyUpdate = async () => {
    if (!changes?.length) return
    setBusy(true)
    try {
      const n = await rpc<number>('update_members', { p_rows: changes.map((c) => c.row) })
      toast(`تم تحديث ${num(n)} عضو`)
      onClose()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="استيراد وتحديث عبر Excel" size="lg"
      footer={newRows ? (
        <><Button variant="outline" onClick={() => setNewRows(null)}>رجوع</Button><Button loading={busy} onClick={() => void applyNew()}>إضافة {num(newRows.length)} عضو</Button></>
      ) : changes ? (
        <><Button variant="outline" onClick={() => setChanges(null)}>رجوع</Button><Button loading={busy} disabled={!changes.length} onClick={() => void applyUpdate()}>تطبيق {num(changes.length)} تعديل</Button></>
      ) : undefined}>
      <input ref={newRef} type="file" accept=".xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void parseNew(f); e.target.value = '' }} />
      <input ref={updRef} type="file" accept=".xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void parseUpdate(f); e.target.value = '' }} />

      {newRows ? (
        <div>
          <p className="mb-3 text-sm text-muted">راجع الأسماء قبل الإضافة:</p>
          <div className="max-h-96 overflow-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-sand text-xs text-muted"><tr><th className="p-2 text-right">الاسم</th><th className="p-2 text-right">المجموعة</th><th className="p-2 text-right">الجوال</th></tr></thead>
              <tbody className="divide-y divide-line/50">
                {newRows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-2">{String(r.name)}{r.is_leader ? ' 👑' : ''}</td>
                    <td className={cn('p-2', !!r.group && !groupNames.has(String(r.group)) && 'text-red-600')}>{String(r.group || '—')}{r.group && !groupNames.has(String(r.group)) ? ' (غير موجودة)' : ''}</td>
                    <td className="p-2" dir="ltr">{String(r.phone || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : changes ? (
        changes.length === 0 ? (
          <EmptyState title="لا توجد تغييرات">البيانات في الملف مطابقة للبيانات الحالية</EmptyState>
        ) : (
          <div className="max-h-[28rem] space-y-2 overflow-auto">
            {changes.map((c) => (
              <div key={c.member_no} className="rounded-xl border border-line p-3">
                <div className="mb-1 font-semibold">{c.name} <span className="tabular text-xs font-normal text-muted">#{c.member_no}</span></div>
                <ul className="space-y-0.5 text-sm text-muted">{c.changes.map((x) => <li key={x}>• {x}</li>)}</ul>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-gradient-to-b from-primary-50/60 to-white p-5">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary-100 text-primary-700"><FileUp className="h-6 w-6" /></div>
            <h3 className="font-bold">رفع طلاب جدد</h3>
            <p className="mt-1 text-sm text-muted">حمّل القالب الفارغ، أضف الأسماء والمجموعات، ثم ارفعه.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => void downloadNewMembersTemplate(groups)}>تحميل القالب</Button>
              <Button size="sm" icon={<Upload className="h-4 w-4" />} onClick={() => newRef.current?.click()}>رفع الملف</Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-line bg-gradient-to-b from-gold-50/70 to-white p-5">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gold-100 text-gold-600"><MoreVertical className="h-6 w-6" /></div>
            <h3 className="font-bold">تحديث بيانات الطلاب</h3>
            <p className="mt-1 text-sm text-muted">حمّل قالباً يحتوي بيانات الطلاب الحالية، عدّل عليه، ثم ارفعه لمعاينة التغييرات قبل تطبيقها.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => void downloadUpdateTemplate(members, groups, privates)}>تحميل بيانات الطلاب</Button>
              <Button variant="gold" size="sm" icon={<Upload className="h-4 w-4" />} onClick={() => updRef.current?.click()}>رفع الملف المعدّل</Button>
            </div>
          </motion.div>
        </div>
      )}
    </Modal>
  )
}
