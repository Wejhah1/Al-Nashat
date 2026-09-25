import { useState } from 'react'
import { Newspaper } from 'lucide-react'
import { usePosts } from '../hooks/usePosts'
import { useData } from '../context/DataContext'
import { PostCard } from '../components/shared/PostCard'
import { EmptyState, PageHeader, Skeleton } from '../components/ui/misc'
import { cn } from '../lib/format'

export default function News() {
  const { posts, loading } = usePosts()
  const { categories } = useData()
  const [cat, setCat] = useState('')
  const list = cat ? posts.filter((p) => p.category_id === cat) : posts
  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <PageHeader title="الأخبار والفعاليات" />
      <div className="scrollbar-none -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4">
        {[{ id: '', name: 'الكل', color: '#0F4C3A' }, ...categories].map((c) => (
          <button
            key={c.id || 'all'}
            onClick={() => setCat(c.id)}
            className={cn('h-8 shrink-0 cursor-pointer rounded-full border px-3.5 text-[13px] transition', cat === c.id ? 'text-white' : 'border-line bg-white text-ink/70')}
            style={cat === c.id ? { backgroundColor: c.color, borderColor: c.color } : undefined}
          >
            {c.name}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={<Newspaper className="h-7 w-7" />} title="لا توجد منشورات" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  )
}
