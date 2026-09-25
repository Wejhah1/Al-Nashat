const nf = new Intl.NumberFormat('ar-SA-u-nu-latn')

export function num(n: number | null | undefined): string {
  return nf.format(n ?? 0)
}

export function signed(n: number): string {
  if (n > 0) return `+${nf.format(n)}`
  if (n < 0) return `−${nf.format(Math.abs(n))}`
  return nf.format(0)
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** لون نص مناسب فوق خلفية بلون المجموعة */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export function initials(name: string): string {
  // حرف واحد فقط: الحروف العربية المتتالية تتصل فتبدو ككلمة
  return name.trim().charAt(0)
}

export const ORDINALS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن']
