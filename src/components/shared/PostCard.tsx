import { Link } from 'react-router-dom'
import { ImageIcon } from 'lucide-react'
import type { Post } from '../../lib/types'
import { mediaUrl } from '../../lib/supabase'
import { formatHijri } from '../../lib/hijri'
import { useData } from '../../context/DataContext'

export function PostCard({ post }: { post: Post; index?: number }) {
  const { categories } = useData()
  const cat = categories.find((c) => c.id === post.category_id)
  const img = mediaUrl(post.image_path)
  return (
    <Link to={`/news/${post.id}`} className="card card-hover group flex h-full overflow-hidden sm:flex-col">
      <div className="relative w-28 shrink-0 overflow-hidden bg-sand sm:aspect-[16/9] sm:w-auto">
        {img ? (
          <img src={img} alt={post.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="islamic-pattern-dark grid h-full w-full place-items-center text-gold-200/50"><ImageIcon className="h-8 w-8" /></div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center p-3.5 sm:p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">
          {cat && <span className="font-medium" style={{ color: cat.color }}>{cat.name}</span>}
          {cat && <span>·</span>}
          <span>{formatHijri(post.event_date)}</span>
        </div>
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">{post.title}</h3>
        {post.body && <p className="mt-1.5 line-clamp-2 hidden text-sm leading-relaxed text-muted sm:block">{post.body}</p>}
      </div>
    </Link>
  )
}
