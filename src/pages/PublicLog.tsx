import { useState } from 'react'
import { History } from 'lucide-react'
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
  const types: (LogType | '')[] = ['', 'points', 'attendance', 'card', 'badge', 'transfer', 'holiday', 'season', 'undo']
  return (
    <div className="mb-6 space-y-3">
      <div className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {types.map((t) => (
          <button
            key={t || 'all'}
            onClick={() => setType(t)}
            className={cn(
              'shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition',
              type === t ? 'border-primary-700 bg-primary-700 text-white shadow-md' : 'border-line bg-white text-ink/70 hover:border-primary-300',
            )}
          >
            {t ? LOG_TYPES[t].label : 'الكل'}
          </button>
        ))}
      </div>
      <div className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setGroupId('')} className={cn('shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-sm transition', !groupId ? 'border-gold-400 bg-gold-50 font-semibold text-gold-600' : 'border-line bg-white text-ink/70')}>
          كل المجموعات
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setGroupId(g.id)}
            className={cn('inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition', groupId === g.id ? 'font-semibold' : 'border-line bg-white text-ink/70')}
            style={groupId === g.id ? { borderColor: g.color, backgroundColor: `${g.color}14`, color: g.color } : undefined}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
            {g.name}
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
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <PageHeader icon={<History className="h-6 w-6" />} title="سجل النقاط" />
      <LogFilters type={type} setType={setType} groupId={groupId} setGroupId={setGroupId} />
      <LogList {...logs} onLoadMore={logs.loadMore} />
    </div>
  )
}
