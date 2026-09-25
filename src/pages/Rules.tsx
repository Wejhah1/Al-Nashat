import { motion } from 'motion/react'
import { Award, BookOpenText, MinusCircle, PlusCircle, ShieldAlert } from 'lucide-react'
import { useData } from '../context/DataContext'
import { BadgeMedal, PageHeader, PageLoader } from '../components/ui/misc'
import { cn, num, signed } from '../lib/format'

export default function Rules() {
  const { rules, badges, settings, loading } = useData()
  if (loading) return <PageLoader />

  const positive = rules.filter((r) => r.value > 0)
  const negative = rules.filter((r) => r.value < 0)
  const byCategory = (list: typeof rules) => {
    const map = new Map<string, typeof rules>()
    list.forEach((r) => map.set(r.category, [...(map.get(r.category) ?? []), r]))
    return [...map.entries()]
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader icon={<BookOpenText className="h-6 w-6" />} title="لائحة النقاط" subtitle="قواعد واضحة وعادلة لكسب النقاط، والمخالفات وقيمة خصمها" />

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <InfoTile label="نقاط التحضير" value={`+${num(settings?.attendance_points ?? 25)}`} tone="green" />
        <InfoTile label="نقاط الحضور المتأخر" value={`+${num(settings?.late_points ?? 15)}`} tone="gold" />
        <InfoTile label="كرتان أصفران" value="= كرت أحمر" tone="red" sub={settings?.red_excludes ? 'والكرت الأحمر يعني الإقصاء' : undefined} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <RuleSection title="كسب النقاط" icon={<PlusCircle className="h-5 w-5" />} tone="green" groups={byCategory(positive)} />
        <RuleSection title="المخالفات والخصومات" icon={<MinusCircle className="h-5 w-5" />} tone="red" groups={byCategory(negative)} />
      </div>

      <section className="mt-10 card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line/60 bg-gradient-to-l from-red-50 to-amber-50 px-6 py-4">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-bold">نظام الكروت</h2>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="flex items-start gap-4">
            <span className="mt-1 h-12 w-9 shrink-0 rounded-md bg-yellow-400 shadow-md ring-1 ring-yellow-500/40" />
            <div>
              <div className="font-semibold">الكرت الأصفر</div>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                إنذار رسمي على مخالفة السلوك{settings?.yellow_penalty ? ` مع خصم ${num(settings.yellow_penalty)} نقطة` : ''}. الكرت الأصفر الثاني يتحول تلقائياً إلى كرت أحمر.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="mt-1 h-12 w-9 shrink-0 rounded-md bg-red-600 shadow-md ring-1 ring-red-700/40" />
            <div>
              <div className="font-semibold">الكرت الأحمر</div>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                مخالفة جسيمة{settings?.red_penalty ? ` مع خصم ${num(settings.red_penalty)} نقطة` : ''}{settings?.red_excludes ? '، ويترتب عليه الإقصاء من المنافسة' : ''}.
              </p>
            </div>
          </div>
        </div>
      </section>

      {badges.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold"><Award className="h-5 w-5 text-gold-500" />الأوسمة والإنجازات</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="card card-hover flex flex-col items-center p-6 text-center">
                <BadgeMedal icon={b.icon} color={b.color} size={64} />
                <div className="mt-4 font-bold">{b.name}</div>
                {b.description && <p className="mt-1 text-sm text-muted">{b.description}</p>}
                {b.points !== 0 && <span className="tabular mt-3 rounded-full bg-gold-50 px-3 py-1 text-sm font-bold text-gold-600">{signed(b.points)} نقطة</span>}
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function InfoTile({ label, value, tone, sub }: { label: string; value: string; tone: 'green' | 'gold' | 'red'; sub?: string }) {
  const tones = {
    green: 'from-emerald-50 to-white text-emerald-700 border-emerald-100',
    gold: 'from-gold-50 to-white text-gold-600 border-gold-100',
    red: 'from-red-50 to-white text-red-700 border-red-100',
  }
  return (
    <div className={cn('rounded-2xl border bg-gradient-to-b p-5 text-center shadow-[var(--shadow-soft)]', tones[tone])}>
      <div className="text-sm text-muted">{label}</div>
      <div className="tabular mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}

function RuleSection({ title, icon, tone, groups }: {
  title: string
  icon: React.ReactNode
  tone: 'green' | 'red'
  groups: [string, { id: string; title: string; description: string | null; value: number }[]][]
}) {
  return (
    <section className="card overflow-hidden">
      <div className={cn('flex items-center gap-3 px-6 py-4 text-white', tone === 'green' ? 'bg-gradient-to-l from-primary-600 to-primary-800' : 'bg-gradient-to-l from-red-600 to-red-800')}>
        {icon}
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {groups.length === 0 && <div className="p-8 text-center text-muted">لا توجد قواعد بعد</div>}
      {groups.map(([cat, list]) => (
        <div key={cat}>
          <div className="bg-sand/60 px-6 py-2 text-xs font-semibold tracking-wide text-muted">{cat}</div>
          <ul className="divide-y divide-line/50">
            {list.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="flex-1">
                  <div className="font-medium">{r.title}</div>
                  {r.description && <div className="mt-0.5 text-sm text-muted">{r.description}</div>}
                </div>
                <span className={cn('tabular min-w-14 rounded-xl px-3 py-1.5 text-center font-bold', r.value > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                  {signed(r.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
