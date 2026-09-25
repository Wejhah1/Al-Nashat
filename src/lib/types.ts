export type Role = 'owner' | 'supervisor'

export interface Admin {
  user_id: string
  username: string
  display_name: string
  role: Role
  created_at: string
}

export interface Group {
  id: string
  name: string
  color: string
  sort: number
}

export interface Member {
  id: string
  member_no: number
  code: string
  name: string
  group_id: string | null
  is_leader: boolean
  points: number
  yellow_cards: number
  red_cards: number
  excluded: boolean
  created_at: string
}

export interface MemberPrivate {
  member_id: string
  phone: string | null
  notes: string | null
}

/** عضو كما تعيده دوال RPC */
export interface MemberInfo {
  id: string
  member_no: number
  code: string
  name: string
  group_id: string | null
  group_name: string | null
  group_color: string | null
  is_leader: boolean
  points: number
  yellow_cards: number
  red_cards: number
  excluded: boolean
}

export type LogType = 'points' | 'card' | 'attendance' | 'transfer' | 'badge' | 'edit' | 'undo' | 'season' | 'holiday'

export interface LogEntry {
  id: number
  ts: string
  member_id: string | null
  member_name: string | null
  group_id: string | null
  type: LogType
  title: string
  delta: number
  payload: Record<string, unknown>
  inverse: Record<string, unknown> | null
  admin_name: string | null
  reverted_at: string | null
  reverted_by: string | null
  undo_of: number | null
}

export interface PointRule {
  id: string
  title: string
  description: string | null
  value: number
  category: string
  sort: number
}

export interface Badge {
  id: string
  name: string
  description: string | null
  icon: string
  color: string
  points: number
}

export interface MemberBadge {
  id: string
  member_id: string
  badge_id: string
  awarded_at: string
  by_name: string | null
  note: string | null
}

export interface Settings {
  id: number
  attendance_points: number
  late_points: number
  late_after: string | null
  yellow_penalty: number
  red_penalty: number
  red_excludes: boolean
  freeze_results: boolean
  show_live_feed: boolean
  sound_enabled: boolean
}

export interface PostCategory {
  id: string
  name: string
  color: string
  sort: number
}

export interface Post {
  id: string
  title: string
  body: string | null
  event_date: string
  image_path: string | null
  category_id: string | null
  published: boolean
  created_at: string
}

export interface HomeContent {
  title: string
  subtitle: string
  tagline: string
  show_news: boolean
  show_groups: boolean
  show_feed: boolean
  news_title: string
}

export interface CheckInResult {
  status: 'ok' | 'duplicate' | 'not_found' | 'excluded' | 'off_day'
  reason?: string
  attendance_status?: 'present' | 'late'
  points?: number
  at?: string
  log_id?: number
  member?: MemberInfo
}

export interface PortalData {
  member: MemberInfo
  season: { name: string; start: string; end: string } | null
  rank: number | null
  group_rank: number | null
  frozen: boolean
  attendance: {
    present: number
    late: number
    absent: number
    total: number
    days: { date: string; status: 'present' | 'late' | 'absent'; points: number }[]
  }
  badges: { id: string; name: string; description: string | null; icon: string; color: string; points: number; awarded_at: string }[]
  logs: { id: number; ts: string; type: LogType; title: string; delta: number; reverted_at: string | null }[]
}

export interface ReportData {
  from: string
  to: string
  sessions: number
  holidays: { name: string; start: string; end: string }[]
  session_days: { date: string; present: number; late: number }[]
  totals: {
    members: number
    excluded: number
    points_awarded: number
    points_deducted: number
    yellow_cards: number
    red_cards: number
    badges: number
    actions: number
  }
  groups: { id: string; name: string; color: string; points: number; members_count: number; period_points: number; attendances: number }[]
  members: {
    id: string
    member_no: number
    name: string
    points: number
    excluded: boolean
    yellow_cards: number
    red_cards: number
    group_name: string | null
    group_color: string | null
    notes: string | null
    present: number
    late: number
    absent: number
    period_points: number
  }[]
  posts: { id: string; title: string; body: string | null; event_date: string; image_path: string | null; category: string | null }[]
}

export interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  weekly_off: number[]
  is_active: boolean
  carried_points: boolean
  created_at: string
  closed_at: string | null
}

export interface Holiday {
  id: string
  season_id: string
  name: string
  start_date: string
  end_date: string
}

export interface SeasonResult {
  season_id: string
  member_id: string
  member_name: string
  group_id: string | null
  points: number
  yellow_cards: number
  red_cards: number
  excluded: boolean
}
