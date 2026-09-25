import { useState } from 'react'
import { useLogs } from '../hooks/useLogs'
import { useData } from '../context/DataContext'
import { LogList, LOG_TYPES } from '../components/shared/LogList'
import { PageHeader } from '../components/ui/misc'
import { cn } from '../lib/format'
import type { LogType } from '../lib/types'

export function LogFilters({ type, setType, groupId, setGroupId }: {
  type: LogType | ''
  setType: (t: LogType | '') => void
  groupId: string
  setGroupId: (g: string) => void
}) {
  const { groups } = useData()
  const types: (LogType | '')[] = ['', 'points', 'attendance', 'card', 'badge', 'transfer', 'holiday', 'undo']
  return (
    <div className="mb-5 space-y-3">
      <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="field h-10 text-sm">
        <option value="">كل المجموعات</option>
        {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {types.map((t) => (
          <button key={t || 'all'} onClick={() => setType(t)}
            className={cn('h-8 shrink-0 cursor-pointer rounded-full px-3.5 text-[13px] transition',
              type === t ? 'bg-primary-700 text-white' : 'bg-white text-ink/70 ring-1 ring-line')}>
            {t ? LOG_TYPES[t].label : 'الكل'}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PublicLog() {
  const [type, setType] = useState<LogType | ''>('')
  const [groupId, setGroupId] = useState('')
  const logs = useLogs({ type, groupId })
  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
      <PageHeader title="سجل النقاط" />
      <LogFilters type={type} setType={setType} groupId={groupId} setGroupId={setGroupId} />
      <LogList {...logs} onLoadMore={logs.loadMore} />
    </div>
  )
}
