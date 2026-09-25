import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarDays, ImageIcon } from 'lucide-react'
import type { Post } from '../../lib/types'
import { mediaUrl } from '../../lib/supabase'
import { formatHijri } from '../../lib/hijri'
import { useData } from '../../context/DataContext'
import { cn } from '../../lib/format'

export function PostCard({ post, index = 0, featured }: { post: Post; index?: number; featured?: boolean }) {
  const { categories } = useData()
  const cat = categories.find((c) => c.id === post.category_id)
  const img = mediaUrl(post.image_path)
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: Math.min(index * 0.06, 0.3) }}
      className={cn('group', featured && 'md:col-span-2')}
    >
      <Link to={`/news/${post.id}`} className="card card-hover flex h-full flex-col overflow-hidden">
        <div className={cn('relative overflow-hidden bg-sand', featured ? 'aspect-[16/8]' : 'aspect-[16/9]')}>
          {img ? (
            <img src={img} alt={post.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          ) : (
            <div className="islamic-pattern-dark grid h-full w-full place-items-center text-gold-200/60">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          {cat && (
            <span className="absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-md backdrop-blur" style={{ backgroundColor: `${cat.color}e6` }}>
              {cat.name}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gold-600">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatHijri(post.event_date)}
          </div>
          <h3 className={cn('font-bold leading-snug transition group-hover:text-primary-700', featured ? 'text-xl sm:text-2xl' : 'text-lg')}>{post.title}</h3>
          {post.body && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{post.body}</p>}
        </div>
      </Link>
    </motion.article>
  )
}
