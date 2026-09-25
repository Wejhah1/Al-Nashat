import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/format'

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="label flex items-center justify-between">
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </span>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; hint?: ReactNode }>(
  function Input({ label, hint, className, ...rest }, ref) {
    const input = <input ref={ref} className={cn('field', className)} {...rest} />
    if (!label) return input
    return (
      <label className="block">
        <Label hint={hint}>{label}</Label>
        {input}
      </label>
    )
  },
)

export function Textarea({ label, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode }) {
  const el = <textarea className={cn('field min-h-24 resize-y leading-relaxed', className)} {...rest} />
  if (!label) return el
  return (
    <label className="block">
      <Label>{label}</Label>
      {el}
    </label>
  )
}

export function Select({ label, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode }) {
  const el = (
    <select className={cn('field appearance-none bg-[length:12px] bg-[position:left_14px_center] bg-no-repeat pl-9', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235f6b76' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")" }}
      {...rest}>
      {children}
    </select>
  )
  if (!label) return el
  return (
    <label className="block">
      <Label>{label}</Label>
      {el}
    </label>
  )
}

export function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-start transition hover:bg-primary-50/60 disabled:opacity-50"
    >
      <span>
        <span className="block font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-primary-600' : 'bg-line')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'right-6' : 'right-1')} />
      </span>
    </button>
  )
}
