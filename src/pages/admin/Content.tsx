import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Eye, EyeOff, ImagePlus, LayoutTemplate, Newspaper, PenLine, Plus, Tags, Trash2 } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { usePosts } from '../../hooks/usePosts'
import { supabase, friendlyError, mediaUrl } from '../../lib/supabase'
import type { HomeContent, Post, PostCategory } from '../../lib/types'
import { removeImage, uploadImage } from '../../lib/image'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea, Toggle } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, PageHeader } from '../../components/ui/misc'
import { useFeedback } from '../../components/ui/Feedback'
import { ImageCropper } from '../../components/admin/ImageCropper'
import { ColorPicker } from './Groups'
import { cn } from '../../lib/format'
import { formatHijri, todayISO } from '../../lib/hijri'

type Tab = 'posts' | 'categories' | 'home'

export default function Content() {
  const [tab, setTab] = useState<Tab>('posts')
  const tabs: [Tab, string, typeof Newspaper][] = [['posts', 'الأخبار والفعاليات', Newspaper], ['categories', 'التصنيفات', Tags], ['home', 'الواجهة الرئيسية', LayoutTemplate]]
  return (
    <div>
      <PageHeader icon={<Newspaper className="h-6 w-6" />} title="الأخبار والواجهة" />
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-sand p-1">
        {tabs.map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('relative flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition', tab === k ? 'text-primary-700' : 'text-muted')}>
            {tab === k && <motion.span layoutId="content-tab" className="absolute inset-0 rounded-xl bg-white shadow-sm" />}
            <I className="relative h-4 w-4" />
            <span className="relative">{l}</span>
          </button>
        ))}
      </div>
      {tab === 'posts' && <PostsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'home' && <HomeTab />}
    </div>
  )
}

function PostsTab() {
  const { posts, loading } = usePosts()
  const { categories } = useData()
  const { toast, confirm } = useFeedback()
  const [editing, setEditing] = useState<Partial<Post> | null>(null)

  const remove = async (p: Post) => {
    if (!(await confirm({ title: `حذف «${p.title}»؟`, confirmText: 'حذف', danger: true }))) return
    const { error } = await supabase.from('posts').delete().eq('id', p.id)
    if (error) return toast(friendlyError(error.message), 'error')
    await removeImage(p.image_path)
    toast('تم الحذف')
  }

  const togglePublish = async (p: Post) => {
    const { error } = await supabase.from('posts').update({ published: !p.published }).eq('id', p.id)
    if (error) toast(friendlyError(error.message), 'error')
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ event_date: todayISO(), published: true, category_id: categories[0]?.id })}>منشور جديد</Button>
      </div>
      {!loading && posts.length === 0 ? (
        <div className="card"><EmptyState icon={<Newspaper className="h-7 w-7" />} title="لا توجد منشورات بعد">ابدأ بنشر أول خبر أو فعالية</EmptyState></div>
      ) : (
        <div className="grid gap-3">
          {posts.map((p) => {
            const cat = categories.find((c) => c.id === p.category_id)
            const img = mediaUrl(p.image_path)
            return (
              <div key={p.id} className={cn('card flex items-center gap-4 p-3 pl-4', !p.published && 'opacity-60')}>
                <div className="h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-sand">
                  {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <div className="islamic-pattern-dark h-full w-full" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {cat && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: cat.color }}>{cat.name}</span>}
                    {!p.published && <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] text-muted">مسودة</span>}
                  </div>
                  <div className="mt-1 truncate font-semibold">{p.title}</div>
                  <div className="text-xs text-muted">{formatHijri(p.event_date)}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" title={p.published ? 'إخفاء' : 'نشر'} onClick={() => void togglePublish(p)} icon={p.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} />
                  <Button variant="ghost" size="icon" onClick={() => setEditing(p)} icon={<PenLine className="h-4 w-4" />} />
                  <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50" onClick={() => void remove(p)} icon={<Trash2 className="h-4 w-4" />} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      {editing && <PostEditor post={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function PostEditor({ post, onClose }: { post: Partial<Post>; onClose: () => void }) {
  const { categories } = useData()
  const { toast } = useFeedback()
  const [f, setF] = useState(post)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(mediaUrl(post.image_path))
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [removeOld, setRemoveOld] = useState(false)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])

  const pickFile = (fl: File) => {
    if (!fl.type.startsWith('image/')) return toast('اختر ملف صورة', 'error')
    const reader = new FileReader()
    reader.onload = () => setCropSrc(String(reader.result))
    reader.readAsDataURL(fl)
  }

  const save = async () => {
    if (!f.title?.trim()) return toast('العنوان مطلوب', 'error')
    setBusy(true)
    try {
      let image_path = removeOld ? null : f.image_path ?? null
      if (file) image_path = await uploadImage(file)
      const payload = { title: f.title.trim(), body: f.body?.trim() || null, event_date: f.event_date || todayISO(), category_id: f.category_id || null, published: f.published ?? true, image_path }
      const { error } = f.id ? await supabase.from('posts').update(payload).eq('id', f.id) : await supabase.from('posts').insert(payload)
      if (error) throw error
      if ((file || removeOld) && post.image_path && post.image_path !== image_path) await removeImage(post.image_path)
      toast('تم الحفظ')
      onClose()
    } catch (e) {
      toast(friendlyError((e as Error).message), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal open onClose={onClose} title={f.id ? 'تعديل المنشور' : 'منشور جديد'} size="lg"
        footer={<><Button variant="outline" onClick={onClose}>إلغاء</Button><Button loading={busy} onClick={() => void save()}>{f.id ? 'حفظ' : 'نشر'}</Button></>}>
        <div className="space-y-4">
          <div>
            <span className="label">الصورة</span>
            <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const fl = e.target.files?.[0]; if (fl) pickFile(fl); e.target.value = '' }} />
            {preview ? (
              <div className="group relative aspect-[16/9] overflow-hidden rounded-2xl">
                <img src={preview} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Button variant="white" size="sm" onClick={() => input.current?.click()}>تغيير</Button>
                  <Button variant="danger" size="sm" onClick={() => { setPreview(null); setFile(null); setRemoveOld(true) }}>إزالة</Button>
                </div>
                {file && <span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-xs text-white" dir="ltr">{Math.round(file.size / 1024)} KB · WebP</span>}
              </div>
            ) : (
              <button type="button" onClick={() => input.current?.click()} className="flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-ivory text-muted transition hover:border-primary-300 hover:text-primary-700">
                <ImagePlus className="h-10 w-10" />
                <span className="text-sm font-medium">اختر صورة — ستُقص وتُضغط تلقائياً</span>
              </button>
            )}
          </div>
          <Input label="العنوان" value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <Textarea label="الوصف" value={f.body ?? ''} onChange={(e) => setF({ ...f, body: e.target.value })} className="min-h-32" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="التاريخ" hint={f.event_date ? formatHijri(f.event_date) : undefined} type="date" value={f.event_date ?? ''} onChange={(e) => setF({ ...f, event_date: e.target.value })} />
            <Select label="التصنيف" value={f.category_id ?? ''} onChange={(e) => setF({ ...f, category_id: e.target.value || null })}>
              <option value="">بدون تصنيف</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="rounded-2xl border border-line"><Toggle checked={f.published ?? true} onChange={(v) => setF({ ...f, published: v })} label="منشور" description="إلغاء التفعيل يحفظه كمسودة لا تظهر للزوار" /></div>
        </div>
      </Modal>
      <ImageCropper src={cropSrc} onCancel={() => setCropSrc(null)} onDone={(fl) => {
        setFile(fl)
        setPreview(URL.createObjectURL(fl))
        setRemoveOld(false)
        setCropSrc(null)
      }} />
    </>
  )
}

function CategoriesTab() {
  const { categories } = useData()
  const { toast, confirm } = useFeedback()
  const [editing, setEditing] = useState<Partial<PostCategory> | null>(null)

  const save = async () => {
    if (!editing?.name?.trim()) return toast('الاسم مطلوب', 'error')
    const payload = { name: editing.name.trim(), color: editing.color ?? '#0F6B55', sort: editing.sort ?? categories.length + 1 }
    const { error } = editing.id ? await supabase.from('post_categories').update(payload).eq('id', editing.id) : await supabase.from('post_categories').insert(payload)
    if (error) return toast(friendlyError(error.message), 'error')
    toast('تم الحفظ')
    setEditing(null)
  }
  const remove = async (c: PostCategory) => {
    if (!(await confirm({ title: `حذف تصنيف «${c.name}»؟`, message: 'المنشورات المرتبطة ستبقى بدون تصنيف', danger: true, confirmText: 'حذف' }))) return
    const { error } = await supabase.from('post_categories').delete().eq('id', c.id)
    if (error) toast(friendlyError(error.message), 'error')
  }

  return (
    <>
      <div className="mb-4 flex justify-end"><Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ color: '#1F5A96' })}>تصنيف جديد</Button></div>
      <div className="card divide-y divide-line/50">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="flex-1 font-medium">{c.name}</span>
            <Button variant="ghost" size="icon" onClick={() => setEditing(c)} icon={<PenLine className="h-4 w-4" />} />
            <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50" onClick={() => void remove(c)} icon={<Trash2 className="h-4 w-4" />} />
          </div>
        ))}
        {categories.length === 0 && <EmptyState title="لا توجد تصنيفات" />}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'تعديل التصنيف' : 'تصنيف جديد'} size="sm"
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={() => void save()}>حفظ</Button></>}>
        {editing && (
          <div className="space-y-4">
            <Input label="الاسم" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
            <ColorPicker value={editing.color ?? '#1F5A96'} onChange={(c) => setEditing({ ...editing, color: c })} />
          </div>
        )}
      </Modal>
    </>
  )
}

function HomeTab() {
  const { home } = useData()
  const { toast } = useFeedback()
  const [f, setF] = useState<HomeContent>(home)
  const [busy, setBusy] = useState(false)
  useEffect(() => setF(home), [home])

  const save = async () => {
    setBusy(true)
    const { error } = await supabase.from('site_content').upsert({ key: 'home', value: f, updated_at: new Date().toISOString() })
    setBusy(false)
    if (error) toast(friendlyError(error.message), 'error')
    else toast('تم تحديث الواجهة الرئيسية')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="card space-y-4 p-6">
        <Input label="العنوان الرئيسي" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Input label="النص الفرعي" value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} />
        <Textarea label="العبارة التعريفية" value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} className="min-h-20" />
        <Input label="عنوان قسم الأخبار" value={f.news_title} onChange={(e) => setF({ ...f, news_title: e.target.value })} />
        <div className="rounded-2xl border border-line">
          <Toggle checked={f.show_groups} onChange={(v) => setF({ ...f, show_groups: v })} label="إظهار ترتيب المجموعات" />
          <Toggle checked={f.show_news} onChange={(v) => setF({ ...f, show_news: v })} label="إظهار الأخبار والفعاليات" />
          <Toggle checked={f.show_feed} onChange={(v) => setF({ ...f, show_feed: v })} label="إظهار شريط الأحداث الحية" />
        </div>
        <Button loading={busy} onClick={() => void save()} className="w-full">حفظ التغييرات</Button>
      </div>
      <div>
        <div className="mb-2 text-sm font-medium text-muted">معاينة</div>
        <div className="islamic-pattern-dark overflow-hidden rounded-3xl px-6 py-12 text-center text-white">
          <div className="font-display text-4xl font-bold"><span className="gold-text">{f.title || '—'}</span></div>
          <div className="mt-2 tracking-[0.25em] text-gold-200">{f.subtitle}</div>
          {f.tagline && <p className="mx-auto mt-4 max-w-sm text-white/80">{f.tagline}</p>}
        </div>
      </div>
    </div>
  )
}
