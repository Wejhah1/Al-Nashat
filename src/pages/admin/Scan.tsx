import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, CameraOff, ScanLine, Search } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { Scanner } from '../../components/scanner/Scanner'
import { MemberPanel } from '../../components/admin/MemberPanel'
import { PageHeader, GroupDot, CardsIndicator } from '../../components/ui/misc'
import { Button } from '../../components/ui/Button'
import { useFeedback } from '../../components/ui/Feedback'
import { playError, playTap, unlockAudio } from '../../lib/sound'
import { num } from '../../lib/format'

export default function Scan() {
  const { members, groupsById, settings } = useData()
  const { toast } = useFeedback()
  const [selected, setSelected] = useState<string | null>(null)
  const [camera, setCamera] = useState(false)
  const [q, setQ] = useState('')

  const results = useMemo(() => {
    const s = q.trim()
    if (!s) return []
    return members.filter((m) => m.name.includes(s) || String(m.member_no).startsWith(s) || m.code === s.toUpperCase()).slice(0, 8)
  }, [q, members])

  const pick = (key: string) => {
    const k = key.trim().toUpperCase()
    const m = members.find((x) => x.code === k || String(x.member_no) === k)
    if (m) {
      playTap(settings?.sound_enabled !== false)
      setSelected(m.id)
      setCamera(false)
      setQ('')
    } else {
      playError(settings?.sound_enabled !== false)
      toast('لم يتم العثور على العضو', 'error')
    }
  }

  return (
    <div>
      <PageHeader icon={<ScanLine className="h-6 w-6" />} title="إجراء سريع" />
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="card p-4">
            <form onSubmit={(e) => { e.preventDefault(); if (results[0]) { setSelected(results[0].id); setQ('') } else pick(q) }} className="relative">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم العضو أو رقم العضوية" className="field h-12 pr-11" autoFocus />
            </form>
            <AnimatePresence>
              {results.length > 0 && (
                <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden">
                  {results.map((m) => {
                    const g = m.group_id ? groupsById.get(m.group_id) : null
                    return (
                      <li key={m.id}>
                        <button onClick={() => { setSelected(m.id); setQ('') }} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-primary-50">
                          <GroupDot color={g?.color ?? '#ccc'} />
                          <span className="flex-1 truncate font-medium">{m.name}</span>
                          <CardsIndicator yellow={m.yellow_cards} red={m.red_cards} />
                          <span className="tabular text-xs text-muted" dir="ltr">#{m.member_no}</span>
                        </button>
                      </li>
                    )
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          <Button variant={camera ? 'outline' : 'primary'} className="w-full" size="lg" icon={camera ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
            onClick={() => { unlockAudio(); setCamera(!camera) }}>
            {camera ? 'إيقاف الكاميرا' : 'مسح بالكاميرا'}
          </Button>
          {camera && <Scanner onScan={pick} />}
          <p className="text-center text-xs text-muted">{num(members.length)} عضو مسجل</p>
        </div>

        <div>
          {selected ? (
            <motion.div key={selected} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <MemberPanel memberId={selected} onClose={() => setSelected(null)} />
            </motion.div>
          ) : (
            <div className="card grid min-h-[360px] place-items-center p-10 text-center">
              <div>
                <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-primary-50 text-primary-600"><ScanLine className="h-10 w-10" /></div>
                <p className="text-lg font-semibold">اختر عضواً للبدء</p>
                <p className="mt-1 text-sm text-muted">ستظهر بطاقته هنا مع كل الإجراءات المتاحة</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
