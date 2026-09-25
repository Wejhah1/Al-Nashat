import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { supabase, mediaUrl } from '../lib/supabase'
import type { Post } from '../lib/types'
import { useData } from '../context/DataContext'
import { formatHijri, formatWeekday } from '../lib/hijri'
import { EmptyState, PageLoader } from '../components/ui/misc'

export default function NewsDetail() {
  const { id } = useParams()
  const { categories } = useData()
  const [post, setPost] = useState<Post | null | undefined>(undefined)
  useEffect(() => {
    void supabase.from('posts').select('*').eq('id', id!).maybeSingle().then(({ data }) => setPost((data as Post) ?? null))
  }, [id])
  if (post === undefined) return <PageLoader />
  if (!post) return <EmptyState title="المنشور غير موجود"><Link to="/news" className="text-primary-700 underline">العودة للأخبار</Link></EmptyState>
  const cat = categories.find((c) => c.id === post.category_id)
  const img = mediaUrl(post.image_path)
  return (
    <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Link to="/news" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-600">
        <ArrowRight className="h-4 w-4" />
        كل الأخبار
      </Link>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        {img && <img src={img} alt={post.title} className="aspect-[16/9] w-full object-cover" />}
        <div className="p-6 sm:p-10">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            {cat && <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: cat.color }}>{cat.name}</span>}
            <span className="inline-flex items-center gap-1.5 text-gold-600"><CalendarDays className="h-4 w-4" />{formatWeekday(post.event_date)} · {formatHijri(post.event_date)}</span>
          </div>
          <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{post.title}</h1>
          <div className="gold-divider my-6" />
          {post.body && <div className="whitespace-pre-line text-lg leading-loose text-ink/85">{post.body}</div>}
        </div>
      </motion.div>
    </article>
  )
}
