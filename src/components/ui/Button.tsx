import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/format'

type Variant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger' | 'subtle' | 'white'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary-700 text-white hover:bg-primary-600',
  gold: 'bg-gold-400 text-primary-900 hover:bg-gold-300',
  outline: 'border border-line bg-white text-ink hover:border-primary-300 hover:bg-primary-50',
  ghost: 'text-ink/80 hover:bg-primary-50 hover:text-primary-700',
  danger: 'bg-red-600 text-white hover:bg-red-500',
  subtle: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
  white: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
})
