const TZ = 'Asia/Riyadh'

const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
  timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric',
})
const hijriShort = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
  timeZone: TZ, day: 'numeric', month: 'long',
})
const hijriParts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  timeZone: TZ, day: 'numeric', month: 'numeric', year: 'numeric',
})
const weekday = new Intl.DateTimeFormat('ar-SA-u-nu-latn', { timeZone: TZ, weekday: 'long' })
const time = new Intl.DateTimeFormat('ar-SA-u-nu-latn', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })

/** يحوّل "YYYY-MM-DD" (تاريخ محلي) إلى Date عند منتصف النهار لتجنب انزياح المنطقة الزمنية */
export function fromDateOnly(d: string): Date {
  return new Date(`${d}T12:00:00+03:00`)
}

function toDate(v: string | Date): Date {
  if (v instanceof Date) return v
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? fromDateOnly(v) : new Date(v)
}

/** ١٢ ربيع الأول ١٤٤٨ هـ */
export function formatHijri(v: string | Date, withSuffix = true): string {
  const s = hijriDate.format(toDate(v)).replace(/\s?هـ$/, '')
  return withSuffix ? `${s} هـ` : s
}

export function formatHijriShort(v: string | Date): string {
  return hijriShort.format(toDate(v))
}

export function formatWeekday(v: string | Date): string {
  return weekday.format(toDate(v))
}

export function formatTime(v: string | Date): string {
  return time.format(toDate(v))
}

export function formatHijriDateTime(v: string | Date): string {
  return `${formatHijri(v)} — ${formatTime(v)}`
}

/** رقم هجري مختصر: 1448/3/12 */
export function formatHijriNumeric(v: string | Date): string {
  const parts = hijriParts.formatToParts(toDate(v))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}/${get('month')}/${get('day')}`
}

/** تاريخ اليوم بتوقيت الرياض بصيغة YYYY-MM-DD */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

export function addDaysISO(d: string, days: number): string {
  const dt = fromDateOnly(d)
  dt.setUTCDate(dt.getUTCDate() + days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(dt)
}

export function relativeTime(v: string | Date): string {
  const diff = (Date.now() - toDate(v).getTime()) / 1000
  if (diff < 45) return 'الآن'
  if (diff < 3600) {
    const m = Math.round(diff / 60)
    return m === 1 ? 'قبل دقيقة' : m === 2 ? 'قبل دقيقتين' : m <= 10 ? `قبل ${m} دقائق` : `قبل ${m} دقيقة`
  }
  if (diff < 86400) {
    const h = Math.round(diff / 3600)
    return h === 1 ? 'قبل ساعة' : h === 2 ? 'قبل ساعتين' : h <= 10 ? `قبل ${h} ساعات` : `قبل ${h} ساعة`
  }
  return formatHijri(v)
}
