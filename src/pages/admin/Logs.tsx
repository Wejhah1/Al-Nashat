import { useState } from 'react'
import { History } from 'lucide-react'
import { useLogs } from '../../hooks/useLogs'
import { LogList } from '../../components/shared/LogList'
import { LogFilters } from '../PublicLog'
import { PageHeader } from '../../components/ui/misc'
import { useFeedback } from '../../components/ui/Feedback'
import { rpc } from '../../lib/supabase'
import type { LogEntry, LogType } from '../../lib/types'
import { signed } from '../../lib/format'

export default function Logs() {
  const [type, setType] = useState<LogType | ''>('')
  const [groupId, setGroupId] = useState('')
  const logs = useLogs({ type, groupId })
  const { confirm, toast } = useFeedback()
  const [undoing, setUndoing] = useState<number | null>(null)

  const undo = async (l: LogEntry) => {
    const ok = await confirm({
      title: 'التراجع عن هذا الحدث؟',
      message: <>«{l.title}» — {l.member_name}{l.delta ? <> ({signed(l.delta)})</> : null}<div className="mt-2 text-xs">سيُعكس أثر العملية بدقة دون المساس ببقية النقاط.</div></>,
      confirmText: 'تراجع',
      danger: true,
    })
    if (!ok) return
    setUndoing(l.id)
    try {
      await rpc('undo_log', { p_log: l.id })
      toast('تم التراجع بنجاح')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setUndoing(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={<History className="h-6 w-6" />} title="سجل الأحداث" />
      <LogFilters type={type} setType={setType} groupId={groupId} setGroupId={setGroupId} />
      <LogList {...logs} onLoadMore={logs.loadMore} onUndo={(l) => void undo(l)} undoingId={undoing} />
    </div>
  )
}
