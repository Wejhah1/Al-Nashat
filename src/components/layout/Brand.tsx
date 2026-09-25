import { Link } from 'react-router-dom'
import { cn } from '../../lib/format'

export function Brand({ light, className, size = 'md' }: { light?: boolean; className?: string; size?: 'md' | 'lg' }) {
  return (
    <Link to="/" className={cn('group flex flex-col leading-none', className)}>
      <span
        className={cn(
          'font-display font-bold tracking-tight transition',
          size === 'lg' ? 'text-3xl' : 'text-lg sm:text-xl',
          light ? 'text-white' : 'text-primary-700 group-hover:text-primary-600',
        )}
      >
        النشاط الثقافي
      </span>
      <span className={cn('mt-0.5 text-[10px] font-medium tracking-[0.2em]', light ? 'text-gold-200' : 'text-gold-500')}>1448 هـ</span>
    </Link>
  )
}
