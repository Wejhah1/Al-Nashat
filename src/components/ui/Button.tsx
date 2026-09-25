import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/format'

type Variant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger' | 'subtle' | 'white'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-primary-600 to-primary-700 text-white shadow-[0_6px_16px_-6px_rgb(15_76_58/0.6)] hover:from-primary-500 hover:to-primary-700',
  gold: 'bg-gradient-to-b from-gold-300 to-gold-500 text-primary-900 shadow-[0_6px_16px_-6px_rgb(176_134_55/0.7)] hover:from-gold-200 hover:to-gold-400',
  outline: 'border border-line bg-white text-ink hover:border-primary-300 hover:bg-primary-50',
  ghost: 'text-ink/80 hover:bg-primary-50 hover:text-primary-700',
  danger: 'bg-gradient-to-b from-red-600 to-red-700 text-white shadow-[0_6px_16px_-6px_rgb(180_35_53/0.6)] hover:from-red-500',
  subtle: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
  white: 'bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur',
}
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
  lg: 'h-14 px-7 text-lg gap-2.5 rounded-2xl',
  icon: 'h-10 w-10 rounded-xl',
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
