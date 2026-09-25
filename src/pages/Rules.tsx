import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useData } from '../context/DataContext'
import { BadgeMedal, PageHeader, PageLoader } from '../components/ui/misc'
import { cn, signed } from '../lib/format'

type Tab = 'earn' | 'lose' | 'badges'

interface Row {
  id: string
  title: string
  description?: string | null
  value: number
  category: string
}

export default function Rules() {
  const { rules, badges, settings, loading } = useData()
  const [tab, setTab] = useState<Tab>('earn')
  if (loading) return <PageLoader />

  const earn: Row[] = [
    { id: 'att', title: 'الحضور', value: settings?.attendance_points ?? 25, category: 'الحضور' },
    ...(settings?.late_after ? [{ id: 'late', title: 'الحضور المتأخر', value: settings.late_points, category: 'الحضور' }] : []),
    ...rules.filter((r) => r.value > 0),
  ]
  const lose: Row[] = rules.filter((r) => r.value < 0)

  const tabs: [Tab, string][] = [['earn', 'كسب النقاط'], ['lose', 'المخالفات'], ['badges', 'الأوسمة']]

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
      <PageHeader title="لائحة النقاط" />

      <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-sand/80 p-1">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn('relative cursor-pointer rounded-lg py-2 text-sm font-medium transition', tab === k ? 'text-primary-800' : 'text-muted hover:text-ink')}>
            {tab === k && <motion.span layoutId="rules-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', damping: 26, stiffness: 300 }} />}
            <span className="relative">{l}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {tab === 'earn' && <RuleList rows={earn} positive />}
          {tab === 'lose' && (
            <>
              <RuleList rows={lose} />
              <CardsInfo yellow={settings?.yellow_penalty ?? 0} red={settings?.red_penalty ?? 0} excludes={settings?.red_excludes ?? true} />
            </>
          )}
          {tab === 'badges' && (
            badges.length === 0 ? <Empty /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {badges.map((b) => (
                  <div key={b.id} className="card flex items-center gap-4 p-4">
                    <BadgeMedal icon={b.icon} color={b.color} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{b.name}</div>
                      {b.description && <p className="mt-0.5 text-[13px] text-muted">{b.description}</p>}
                    </div>
                    {b.points !== 0 && <span className="tabular font-semibold text-gold-500">{signed(b.points)}</span>}
                  </div>
                ))}
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function RuleList({ rows, positive }: { rows: Row[]; positive?: boolean }) {
  if (!rows.length) return <Empty />
  return (
    <div className="card overflow-hidden">
      {rows.map((r, i) => (
        <div key={r.id} className={cn('flex items-center gap-4 px-4 py-3.5 sm:px-5', i > 0 && 'border-t border-line/50')}>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium">{r.title}</div>
            {r.description && <div className="mt-0.5 text-[13px] text-muted">{r.description}</div>}
          </div>
          <span className={cn('tabular shrink-0 rounded-lg px-2.5 py-1 text-[15px] font-semibold',
            positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
            {signed(r.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function CardsInfo({ yellow, red, excludes }: { yellow: number; red: number; excludes: boolean }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="card flex items-center gap-4 p-4">
        <span className="h-9 w-6 shrink-0 rounded-md bg-yellow-400" />
        <div>
          <div className="font-semibold">كرت أصفر</div>
          <div className="mt-0.5 text-[13px] text-muted">الثاني يتحول إلى أحمر{yellow ? ` · ${signed(-yellow)}` : ''}</div>
        </div>
      </div>
      <div className="card flex items-center gap-4 p-4">
        <span className="h-9 w-6 shrink-0 rounded-md bg-red-600" />
        <div>
          <div className="font-semibold">كرت أحمر</div>
          <div className="mt-0.5 text-[13px] text-muted">{excludes ? 'إقصاء من المنافسة' : 'مخالفة جسيمة'}{red ? ` · ${signed(-red)}` : ''}</div>
        </div>
      </div>
    </div>
  )
}

function Empty() {
  return <div className="card p-12 text-center text-muted">لا يوجد شيء هنا بعد</div>
}

