import { Link } from 'react-router-dom'
import { cn } from '../../lib/format'

export function Brand({ light, className, size = 'md' }: { light?: boolean; className?: string; size?: 'md' | 'lg' }) {
  return (
    <Link to="/" className={cn('group flex flex-col leading-none', className)}>
      <span
        className={cn(
          'font-display font-bold tracking-tight transition',
          size === 'lg' ? 'text-3xl' : 'text-[22px]',
          light ? 'text-white' : 'text-primary-700 group-hover:text-primary-600',
        )}
      >
        النشاط الثقافي
      </span>
      <span className={cn('mt-1 text-[11px] font-medium tracking-[0.2em]', light ? 'text-gold-200' : 'text-gold-500')}>1448 هـ</span>
    </Link>
  )
}
