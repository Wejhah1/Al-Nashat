import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useTable } from '../hooks/useTable'
import type { Badge, Group, HomeContent, Member, MemberBadge, PointRule, PostCategory, Settings } from '../lib/types'

export interface GroupStat extends Group {
  points: number
  members: Member[]
  leader: Member | null
  rank: number
}

interface DataValue {
  loading: boolean
  groups: Group[]
  members: Member[]
  settings: Settings | null
  badges: Badge[]
  rules: PointRule[]
  memberBadges: MemberBadge[]
  categories: PostCategory[]
  home: HomeContent
  groupsById: Map<string, Group>
  membersById: Map<string, Member>
  groupStats: GroupStat[]
  ranked: Member[]
}

const DEFAULT_HOME: HomeContent = {
  title: 'النشاط الثقافي',
  subtitle: '1448 هـ',
  tagline: 'تنافسٌ شريف، وعلمٌ نافع، وروحُ فريقٍ واحد',
  show_news: true,
  show_groups: true,
  show_feed: true,
  news_title: 'آخر الأخبار والفعاليات',
}

const Ctx = createContext<DataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const groups = useTable<Group & Record<string, unknown>>('groups', { order: { column: 'sort' } })
  const members = useTable<Member & Record<string, unknown>>('members', { order: { column: 'member_no' } })
  const settings = useTable<Settings & Record<string, unknown>>('settings')
  const badges = useTable<Badge & Record<string, unknown>>('badges', { order: { column: 'created_at' } })
  const rules = useTable<PointRule & Record<string, unknown>>('point_rules', { order: { column: 'sort' } })
  const memberBadges = useTable<MemberBadge & Record<string, unknown>>('member_badges', { order: { column: 'awarded_at' } })
  const categories = useTable<PostCategory & Record<string, unknown>>('post_categories', { order: { column: 'sort' } })
  const content = useTable<{ key: string; value: Partial<HomeContent> } & Record<string, unknown>>('site_content', { key: 'key' })

  const value = useMemo<DataValue>(() => {
    const g = [...groups.rows].sort((a, b) => a.sort - b.sort)
    const m = members.rows
    const groupsById = new Map(g.map((x) => [x.id, x]))
    const membersById = new Map(m.map((x) => [x.id, x]))
    const stats = g
      .map((gr) => {
        const gm = m.filter((x) => x.group_id === gr.id).sort((a, b) => b.points - a.points)
        return {
          ...gr,
          points: gm.reduce((s, x) => s + x.points, 0),
          members: gm,
          leader: gm.find((x) => x.is_leader) ?? null,
          rank: 0,
        }
      })
      .sort((a, b) => b.points - a.points || a.sort - b.sort)
    stats.forEach((s, i) => {
      s.rank = i > 0 && stats[i - 1].points === s.points ? stats[i - 1].rank : i + 1
    })
    const ranked = m.filter((x) => !x.excluded).sort((a, b) => b.points - a.points || a.member_no - b.member_no)
    const homeRow = content.rows.find((r) => r.key === 'home')
    return {
      loading: groups.loading || members.loading || settings.loading,
      groups: g,
      members: m,
      settings: settings.rows[0] ?? null,
      badges: badges.rows,
      rules: [...rules.rows].sort((a, b) => a.sort - b.sort),
      memberBadges: memberBadges.rows,
      categories: [...categories.rows].sort((a, b) => a.sort - b.sort),
      home: { ...DEFAULT_HOME, ...(homeRow?.value ?? {}) },
      groupsById,
      membersById,
      groupStats: stats,
      ranked,
    }
  }, [groups.rows, members.rows, settings.rows, badges.rows, rules.rows, memberBadges.rows, categories.rows, content.rows,
      groups.loading, members.loading, settings.loading])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData must be used inside DataProvider')
  return v
}
