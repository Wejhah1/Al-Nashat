import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { BarChart3, CalendarCheck, CreditCard, ScanLine, ScanQrCode, ShieldAlert, Sparkles, Users } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { PageHeader, StatCard } from '../../components/ui/misc'
import { LiveList } from '../../components/leaderboard/LiveFeed'
import { GroupStandings } from '../../components/leaderboard/GroupStandings'
import { num } from '../../lib/format'
import { formatHijri, formatWeekday, todayISO } from '../../lib/hijri'

export function useTodayAttendance() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let sessionId: string | null = null
    const load = async () => {
      const { data: s } = await supabase.from('sessions').select('id').eq('date', todayISO()).maybeSingle()
      sessionId = (s as { id: string } | null)?.id ?? null
      if (!sessionId) return setCount(0)
      const { count: c } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('session_id', sessionId)
      setCount(c ?? 0)
    }
    void load()
    const ch = supabase.channel(`today-att-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => void load())
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [])
  return count
}

export default function Dashboard() {
  const { members, groupStats } = useData()
  const { admin, isOwner } = useAuth()
  const today = useTodayAttendance()
  const total = members.reduce((s, m) => s + m.points, 0)
  const excluded = members.filter((m) => m.excluded).length
  const active = members.length - excluded

  const actions = [
    { to: '/admin/attendance', label: 'بدء التحضير', desc: 'مسح مستمر للبطاقات', icon: ScanQrCode, primary: true },
    { to: '/admin/scan', label: 'إجراء سريع', desc: 'نقاط، كروت، أوسمة', icon: ScanLine },
    ...(isOwner ? [{ to: '/admin/members', label: 'الأعضاء', desc: 'إضافة وتعديل واستيراد', icon: Users }] : []),
    { to: '/admin/reports', label: 'التقارير', desc: 'إحصائيات وPDF', icon: BarChart3 },
    ...(isOwner ? [{ to: '/admin/cards', label: 'طباعة البطاقات', desc: 'A4 — 8 بطاقات', icon: CreditCard }] : []),
  ]

  return (
    <div>
      <PageHeader title={`أهلاً، ${admin?.display_name ?? ''}`} subtitle={`${formatWeekday(new Date())} · ${formatHijri(new Date())}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="الأعضاء النشطون" value={num(active)} icon={<Users className="h-5 w-5" />} sub={`من أصل ${num(members.length)}`} />
        <StatCard label="حضور اليوم" value={num(today)} icon={<CalendarCheck className="h-5 w-5" />} accent="#1F5A96" sub={active ? `${Math.round((today / active) * 100)}% من الأعضاء` : undefined} />
        <StatCard label="مجموع النقاط" value={num(total)} icon={<Sparkles className="h-5 w-5" />} accent="#B08637" />
        <StatCard label="المُقصَون" value={num(excluded)} icon={<ShieldAlert className="h-5 w-5" />} accent="#B42335" />
      </div>

      <div className="mt-6 hidden grid-cols-3 gap-3 lg:grid lg:grid-cols-5">
        {actions.map((a, i) => (
          <motion.div key={a.to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link
              to={a.to}
              className={
                a.primary
                  ? 'islamic-pattern-dark flex h-full flex-col gap-3 rounded-2xl p-5 text-white shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5'
                  : 'card card-hover flex h-full flex-col gap-3 p-5'
              }
            >
              <a.icon className={a.primary ? 'h-7 w-7 text-gold-200' : 'h-7 w-7 text-primary-600'} />
              <div>
                <div className="font-semibold">{a.label}</div>
                <div className={a.primary ? 'text-xs text-white/70' : 'text-xs text-muted'}>{a.desc}</div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <h2 className="mb-3 text-lg font-bold">المجموعات</h2>
          <GroupStandings groups={groupStats} />
        </section>
        <aside>
          <LiveList limit={8} />
        </aside>
      </div>
    </div>
  )
}
